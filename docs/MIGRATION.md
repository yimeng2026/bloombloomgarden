# D 盘迁移与启动兼容记录

日期：2026-11-06。

## 结果

C 盘可用空间由约 0.796 GB 增至约 12.063 GB；D 盘仍有约 317.951 GB 可用。数值来自本机 `shutil.disk_usage`，不是按目录逻辑大小相加的估计。

没有删除研究源码、论文、原始证据或 Git 历史。清理的是可再生成的 Next 构建缓存，之后已在 D 盘重新生成。

## 当前工作树

`C:\Users\一梦\Documents\kimi\workspace\.worktrees\provider-main-integration` 现在是指向以下目录的 Junction：

```text
D:\kimi-migration\workspace\provider-main-integration
```

源码、`node_modules`、后端依赖、Prisma 运行时和 `.next` 构建产物都位于这个 D 盘项目根内。Turbopack 因而不需要解析指向其他文件系统根的依赖链接。原路径保留，Kimi Work 与现有脚本仍可按原工作区路径访问。

`scripts/dev-node-path.mjs` 负责计算前后端真实依赖路径并保留已有 `NODE_PATH`。`scripts/next-with-node-path.mjs` 在加载 Next CLI 前初始化 CommonJS 搜索路径。后端 ESM 则通过同根依赖目录正常解析，未把 `NODE_PATH` 当成 ESM 通用解决方案。

## 已迁移并保留链接的内容

- `TOE-SYLVA-full-audit`：17,433,008,118 字节、290,749 个文件，源目标一致。
- 主应用与后端依赖：按文件数和字节数核验后，纳入 D 盘当前工作树。
- `UFPF`、`UFPF_old`、`UFPF_old_v09_backup`、`PFE`、`research`：全部保留并迁至 D 盘。
- `tools/pandoc`：259,713,256 字节，保留工具入口。
- npm 缓存：2,717,133,909 字节、26,094 个文件。
- Playwright 缓存：1,893,806,013 字节、1,615 个文件。
- pnpm store：337,598,186 字节、12,807 个文件。

`toe-sylva-final`、`TOE-SYLVA-pull` 和 Downloads 经核对已经在 D 盘，未重复迁移。

## 未完成项与边界

- uv 缓存已复制到 D 盘并核对一致，但原目录重命名被系统拒绝，存在占用或权限限制。C 盘原目录未删除，也未建立迁移链接，因此不能称为迁移完成。
- 目录的逻辑大小会受硬链接、稀疏文件和既有链接影响，不能简单相加等同于释放空间。本记录以实际可用空间为准。
- 没有把依赖目录永久留在 Turbopack 根目录之外。当前工作树整体迁移后，源码与依赖处在同一文件系统根中。
- `.env.local` 与本地鉴权配置仍在被 Git 忽略的项目目录中，没有随迁移提交到仓库。

## 验证

```text
node scripts/next-with-node-path.mjs --version
Next.js v16.2.9

npm test
58 pass，0 fail

npm run build
Compiled successfully；TypeScript 通过；全部路由生成完成

node .tmp/preview-smoke.mjs
六类场景、方法血缘、数学记录、供应商状态均通过；backendStatus=200；
frontendStopped=true；backendStopped=true
```

完整预览只用于验收，已停止前后端进程，没有留下开发服务器。
