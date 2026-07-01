/**
 * 千界花园 — 群组 (Group) 与 战车 (Chariot) 职责划分
 * 
 * 创建日期: 2026-06-10
 * 目的: 明确 Group 和 Chariot 两个概念的职责边界，消除功能重叠
 * 
 * ═══════════════════════════════════════════════════════════════
 * 核心原则
 * ═══════════════════════════════════════════════════════════════
 * 
 * Group  = 静态配置 + 持久化存储（"编制"）
 * Chariot = 运行时实例 + 内存状态（"出征"）
 * 
 * 类比: Group 是军队的编制表，Chariot 是实际出征的战车编队。
 *      一个 Group 可以生成多个 Chariot 实例（不同任务不同编队）。
 * 
 * ═══════════════════════════════════════════════════════════════
 * Group（群组）— 静态配置层
 * ═══════════════════════════════════════════════════════════════
 * 
 * 职责:
 *   1. 定义 Agent 的集合关系（哪些 Agent 属于这个组）
 *   2. 配置执行模式（sequential / parallel / hierarchical / dynamic）
 *   3. 指定协调员（coordinatorId）
 *   4. 管理嵌套关系（父组、子组）
 *   5. 持久化到数据库（Prisma）
 *   6. 提供 CRUD 操作
 * 
 * 数据存储: 数据库（Prisma Group 表）
 * 生命周期: 长期存在，随配置变更而更新
 * 端点: /api/groups
 * 
 * 关键字段:
 *   - entityIds: 组内实体（Agent 或子 Group）
 *   - entityType: 'agents' | 'groups' | 'mixed'
 *   - executionMode: 默认执行模式
 *   - coordinatorId: 协调员 Agent ID
 *   - maxDepth: 最大嵌套深度
 *   - swarmMode: 蜂群模式配置
 * 
 * ═══════════════════════════════════════════════════════════════
 * Chariot（战车）— 运行时执行层
 * ═══════════════════════════════════════════════════════════════
 * 
 * 职责:
 *   1. 运行时任务执行（基于 Group 配置创建实例）
 *   2. 任务分解与分配（decomposeTask → dispatchToAgent）
 *   3. 执行模式的具体实现（sequential / parallel / hierarchical / dynamic）
 *   4. 消息总线通信（SwarmMessageBus）
 *   5. 快照保存（SnapshotEngine）
 *   6. 匹配评分（matchScore）
 *   7. 群组操作（merge / split / delegate / broadcast）
 * 
 * 数据存储: 内存（Map<string, Chariot>）
 * 生命周期: 任务执行期间存在，完成后可销毁
 * 端点: /api/coordinator-hierarchy
 * 
 * 关键字段:
 *   - id: 运行时生成的 UUID
 *   - name: 实例名称（通常基于 Group name）
 *   - parentId: 父 Chariot ID（运行时嵌套）
 *   - coordinatorId: 协调员 Agent ID
 *   - executionMode: 本次执行使用的模式
 *   - agentIds: 参与执行的 Agent ID 列表
 *   - status: ACTIVE | PAUSED | DISBANDED
 *   - maxDepth: 最大嵌套深度
 * 
 * ═══════════════════════════════════════════════════════════════
 * 协作流程
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. 用户创建 Group（/api/groups POST）
 *    → 持久化到数据库
 * 
 * 2. 用户启动蜂群执行（/api/groups/:id/swarm-execute POST）
 *    → GroupService 读取 Group 配置
 *    → 创建 Chariot 实例（SwarmCoordinator.registerChariot）
 *    → Chariot 基于 Group 的 executionMode 和 agentIds 执行任务
 *    → 执行完成后 Chariot 可保留或销毁
 * 
 * 3. 用户查询执行状态（/api/coordinator-hierarchy/chariot/:id GET）
 *    → 查询内存中的 Chariot 实例
 *    → 不查询数据库中的 Group
 * 
 * 4. 用户修改 Group 配置（/api/groups/:id PUT）
 *    → 更新数据库中的 Group
 *    → 不影响已创建的 Chariot 实例（除非显式重新创建）
 * 
 * ═══════════════════════════════════════════════════════════════
 * 端点对照表
 * ═══════════════════════════════════════════════════════════════
 * 
 * | 操作 | Group 端点 | Chariot 端点 |
 * |------|-----------|-------------|
 * | 创建 | POST /api/groups | POST /api/coordinator-hierarchy/chariot |
 * | 列表 | GET /api/groups | GET /api/coordinator-hierarchy/tree |
 * | 详情 | GET /api/groups/:id | GET /api/coordinator-hierarchy/chariot/:id |
 * | 更新 | PUT /api/groups/:id | —（运行时实例不可更新） |
 * | 删除 | DELETE /api/groups/:id | DELETE /api/coordinator-hierarchy/chariot/:id |
 * | 执行 | POST /api/groups/:id/execute | POST /api/coordinator-hierarchy/chariot/:id/execute |
 * | 添加Agent | POST /api/groups/:id/agents | —（通过创建时指定） |
 * | 合并 | — | POST /api/coordinator-hierarchy/merge |
 * | 拆分 | — | POST /api/coordinator-hierarchy/split |
 * | 委托 | — | POST /api/coordinator-hierarchy/delegate |
 * | 广播 | — | POST /api/coordinator-hierarchy/broadcast |
 * 
 * ═══════════════════════════════════════════════════════════════
 * 待办: 消除当前重叠
 * ═══════════════════════════════════════════════════════════════
 * 
 * 1. [ ] /api/groups/:id/execute 和 /api/coordinator-hierarchy/chariot/:id/execute
 *    → 统一为: Group 端点负责触发，Chariot 端点负责查询执行状态
 *    → 建议: 保留 /api/groups/:id/execute 作为触发入口
 *           保留 /api/coordinator-hierarchy/chariot/:id/execute 作为底层执行
 * 
 * 2. [ ] GroupService.execute() 和 SwarmCoordinator.execute() 的实现差异
 *    → 需要统一执行逻辑，或明确分层（GroupService 调用 SwarmCoordinator）
 * 
 * 3. [ ] 考虑添加 Group → Chariot 的关联字段
 *    → 在 Chariot 中增加 groupId 字段，便于追溯来源
 * 
 * 4. [ ] 考虑 Chariot 持久化
 *    → 当前 Chariot 纯内存，服务重启后丢失
 *    → 可将执行结果快照保存到数据库
 */