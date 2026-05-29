import React, { useState, useEffect, useCallback } from 'react';
import { axisClient } from '../axis-migration';

interface InterventionRecord {
  id: string;
  timestamp: string;
  level: 'agent' | 'group' | 'swarm' | 'system';
  action: string;
  targetId: string;
  operator: string;
  result: 'success' | 'pending' | 'failed';
  details?: string;
}

interface ActiveTask {
  id: string;
  name: string;
  progress: number;
  status: 'running' | 'paused' | 'error' | 'completed';
  agents: string[];
  currentNode: string;
  estimatedRemaining: number;
  nodeExecutions: NodeExecution[];
}

interface NodeExecution {
  nodeId: string;
  agentId: string;
  status: 'completed' | 'running' | 'pending' | 'error';
  output?: string;
}

interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'error' | 'paused';
  currentTask?: string;
  cpuUsage: number;
  memoryUsage: number;
}

interface ApprovalRequest {
  id: string;
  requester: string;
  level: 'L1' | 'L2' | 'L3' | 'L4';
  action: string;
  target: string;
  reason: string;
  timestamp: string;
}

export const InterventionCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overall' | 'task' | 'history' | 'approval'>('overall');
  const [interventions, setInterventions] = useState<InterventionRecord[]>([]);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 全局策略
  const [globalPolicy, setGlobalPolicy] = useState({
    maxConcurrentAgents: 10,
    taskTimeout: 300,
    autoDegradeThreshold: 3,
    cpuThreshold: 80,
    memoryThreshold: 80,
  });

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // 获取Agent状态
      const agentsRes = await axisClient.send(
        { x: 'web', y: 'agent', z: 'rest' },
        'read', 'agent',
        { type: 'status' }
      );
      setAgentStatuses(agentsRes.data?.agents || []);

      // 获取活跃任务
      const tasksRes = await axisClient.send(
        { x: 'web', y: 'blueprint', z: 'rest' },
        'read', 'blueprint',
        { type: 'activeExecutions' }
      );
      setActiveTasks(tasksRes.data?.executions || []);

      // 获取干预历史
      const historyRes = await axisClient.send(
        { x: 'web', y: 'intervention', z: 'rest' },
        'read', 'intervention',
        { type: 'history', limit: 50 }
      );
      setInterventions(historyRes.data?.records || []);

      // 获取审批队列
      const approvalRes = await axisClient.send(
        { x: 'web', y: 'intervention', z: 'rest' },
        'read', 'intervention',
        { type: 'pendingApprovals' }
      );
      setApprovalQueue(approvalRes.data?.approvals || []);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 全局干预操作
  const handleGlobalAction = async (action: string) => {
    try {
      setLoading(true);
      await axisClient.send(
        { x: 'web', y: 'intervention', z: 'rest' },
        'invoke', 'intervention',
        { level: 'system', action, scope: 'global' }
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 群组干预
  const handleGroupAction = async (groupId: string, action: string) => {
    try {
      await axisClient.send(
        { x: 'web', y: 'intervention', z: 'rest' },
        'invoke', 'intervention',
        { level: 'group', action, targetId: groupId }
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  // 单任务干预
  const handleTaskAction = async (taskId: string, action: string, payload?: any) => {
    try {
      await axisClient.send(
        { x: 'web', y: 'intervention', z: 'rest' },
        'invoke', 'intervention',
        { level: 'agent', action, targetId: taskId, payload }
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  // 审批操作
  const handleApproval = async (approvalId: string, decision: 'approve' | 'reject' | 'needInfo') => {
    try {
      await axisClient.send(
        { x: 'web', y: 'intervention', z: 'rest' },
        'invoke', 'intervention',
        { action: 'approvalDecision', approvalId, decision }
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '审批失败');
    }
  };

  // 更新全局策略
  const handlePolicyUpdate = async () => {
    try {
      await axisClient.send(
        { x: 'web', y: 'intervention', z: 'rest' },
        'invoke', 'intervention',
        { level: 'system', action: 'modify_strategy', strategy: globalPolicy }
      );
      alert('策略已更新');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>人工干预中心</h1>
      {error && <div style={{ color: '#f5222d', padding: '10px', background: '#fff1f0', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

      {/* 标签页切换 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e0e0e0', paddingBottom: '10px' }}>
        {[
          { key: 'overall', label: '整体干预' },
          { key: 'task', label: '单任务干预' },
          { key: 'history', label: '干预历史' },
          { key: 'approval', label: `审批队列 (${approvalQueue.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeTab === tab.key ? '#4a90e2' : '#f0f0f0',
              color: activeTab === tab.key ? '#fff' : '#333',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#666', marginBottom: '16px' }}>加载中...</div>}

      {/* ========== 整体干预 ========== */}
      {activeTab === 'overall' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <StatCard title="活跃Agent" value={agentStatuses.filter(a => a.status === 'busy').length} total={agentStatuses.length} />
            <StatCard title="运行中任务" value={activeTasks.filter(t => t.status === 'running').length} total={activeTasks.length} />
            <StatCard title="等待审批" value={approvalQueue.length} />
            <StatCard title="系统状态" value={agentStatuses.some(a => a.status === 'error') ? '异常' : '正常'} />
          </div>

          <h3>全局操作</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <ActionButton label="🛑 全局暂停" onClick={() => handleGlobalAction('pause')} variant="danger" />
            <ActionButton label="▶️ 全局恢复" onClick={() => handleGlobalAction('resume')} variant="primary" />
            <ActionButton label="🔄 全局重启" onClick={() => handleGlobalAction('restart')} variant="warning" />
            <ActionButton label="📢 广播消息" onClick={() => handleGlobalAction('broadcast')} variant="info" />
          </div>

          <h3>群组干预</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {['开发群', '设计群', '测试群'].map((name, i) => (
              <div key={i} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', minWidth: '200px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{name}</div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                  {Math.floor(Math.random() * 5) + 1}🤖 {Math.floor(Math.random() * 10) + 1}📋
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <SmallButton label="暂停" onClick={() => handleGroupAction(`group-${i}`, 'pause')} />
                  <SmallButton label="停止" onClick={() => handleGroupAction(`group-${i}`, 'stop')} />
                  <SmallButton label="重启" onClick={() => handleGroupAction(`group-${i}`, 'restart')} />
                </div>
              </div>
            ))}
          </div>

          <h3>全局策略调整</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <PolicyInput label="最大并发Agent" value={globalPolicy.maxConcurrentAgents} onChange={v => setGlobalPolicy(p => ({ ...p, maxConcurrentAgents: v }))} />
            <PolicyInput label="任务超时(秒)" value={globalPolicy.taskTimeout} onChange={v => setGlobalPolicy(p => ({ ...p, taskTimeout: v }))} />
            <PolicyInput label="自动降级阈值" value={globalPolicy.autoDegradeThreshold} onChange={v => setGlobalPolicy(p => ({ ...p, autoDegradeThreshold: v }))} />
            <PolicyInput label="CPU上限(%)" value={globalPolicy.cpuThreshold} onChange={v => setGlobalPolicy(p => ({ ...p, cpuThreshold: v }))} />
            <PolicyInput label="内存上限(%)" value={globalPolicy.memoryThreshold} onChange={v => setGlobalPolicy(p => ({ ...p, memoryThreshold: v }))} />
          </div>
          <ActionButton label="应用策略" onClick={handlePolicyUpdate} variant="primary" />
        </div>
      )}

      {/* ========== 单任务干预 ========== */}
      {activeTab === 'task' && (
        <div>
          <h3>当前执行任务 ({activeTasks.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeTasks.map(task => (
              <div key={task.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{task.name}</span>
                    <span style={{
                      marginLeft: '8px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: task.status === 'running' ? '#e6f7ff' : task.status === 'paused' ? '#fff7e6' : '#fff1f0',
                      color: task.status === 'running' ? '#1890ff' : task.status === 'paused' ? '#fa8c16' : '#f5222d',
                    }}>
                      {task.status === 'running' ? '执行中' : task.status === 'paused' ? '已暂停' : task.status === 'error' ? '异常' : '已完成'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>预计剩余 {task.estimatedRemaining} 分钟</div>
                </div>

                {/* 进度条 */}
                <div style={{ width: '100%', height: '8px', background: '#f0f0f0', borderRadius: '4px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${task.progress}%`, height: '100%', background: '#52c41a', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <SmallButton label="⏸️ 暂停" onClick={() => handleTaskAction(task.id, 'pause')} />
                  <SmallButton label="▶️ 继续" onClick={() => handleTaskAction(task.id, 'resume')} />
                  <SmallButton label="⏹️ 终止" onClick={() => handleTaskAction(task.id, 'stop')} />
                  <SmallButton label="🔄 重试" onClick={() => handleTaskAction(task.id, 'retry')} />
                  <SmallButton label="⚡ 提升优先级" onClick={() => handleTaskAction(task.id, 'escalate')} />
                  <SmallButton label="⏭️ 跳过节点" onClick={() => handleTaskAction(task.id, 'skipNode')} />
                </div>

                {/* 插入消息 */}
                <TaskMessageInjector taskId={task.id} onSend={(msg) => handleTaskAction(task.id, 'inject_message', { message: msg })} />

                {/* 节点执行日志 */}
                <div style={{ marginTop: '12px', padding: '12px', background: '#fafafa', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>节点执行日志</div>
                  {task.nodeExecutions.map((node, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '13px' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: node.status === 'completed' ? '#52c41a' : node.status === 'running' ? '#faad14' : node.status === 'error' ? '#f5222d' : '#d9d9d9',
                      }} />
                      <span style={{ color: '#333' }}>节点{idx + 1}:</span>
                      <span style={{ color: '#666' }}>{node.agentId}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: '2px', fontSize: '11px',
                        background: node.status === 'completed' ? '#f6ffed' : node.status === 'running' ? '#fffbe6' : node.status === 'error' ? '#fff1f0' : '#f5f5f5',
                        color: node.status === 'completed' ? '#52c41a' : node.status === 'running' ? '#faad14' : node.status === 'error' ? '#f5222d' : '#999',
                      }}>
                        {node.status === 'completed' ? '完成' : node.status === 'running' ? '执行中' : node.status === 'error' ? '异常' : '等待'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== 干预历史 ========== */}
      {activeTab === 'history' && (
        <div>
          <h3>干预历史记录</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>时间</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>干预者</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>类型</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>级别</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>目标</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>结果</th>
              </tr>
            </thead>
            <tbody>
              {interventions.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px' }}>{new Date(record.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{record.operator}</td>
                  <td style={{ padding: '10px 12px' }}>{record.action}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                      background: record.level === 'system' ? '#fff1f0' : record.level === 'group' ? '#fff7e6' : '#e6f7ff',
                      color: record.level === 'system' ? '#f5222d' : record.level === 'group' ? '#fa8c16' : '#1890ff',
                    }}>
                      {record.level}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{record.targetId}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      color: record.result === 'success' ? '#52c41a' : record.result === 'pending' ? '#faad14' : '#f5222d',
                    }}>
                      {record.result === 'success' ? '成功' : record.result === 'pending' ? '处理中' : '失败'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========== 审批队列 ========== */}
      {activeTab === 'approval' && (
        <div>
          <h3>待审批干预 ({approvalQueue.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {approvalQueue.map(req => (
              <div key={req.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{req.requester}</span>
                    <span style={{ marginLeft: '8px', color: '#666' }}>请求 {req.action}</span>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                    background: req.level === 'L1' ? '#fff7e6' : req.level === 'L2' ? '#fff1f0' : '#f0f0f0',
                    color: req.level === 'L1' ? '#fa8c16' : req.level === 'L2' ? '#f5222d' : '#666',
                  }}>
                    {req.level}
                  </span>
                </div>
                <div style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                  目标: {req.target}
                </div>
                <div style={{ padding: '10px', background: '#fafafa', borderRadius: '4px', marginBottom: '12px', fontSize: '13px' }}>
                  原因: {req.reason}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <ActionButton label="✅ 批准" onClick={() => handleApproval(req.id, 'approve')} variant="success" />
                  <ActionButton label="❌ 拒绝" onClick={() => handleApproval(req.id, 'reject')} variant="danger" />
                  <ActionButton label="❓ 需要更多信息" onClick={() => handleApproval(req.id, 'needInfo')} variant="info" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ========== 子组件 ==========

const StatCard: React.FC<{ title: string; value: number | string; total?: number }> = ({ title, value, total }) => (
  <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
      {value}
      {total !== undefined && <span style={{ fontSize: '14px', color: '#999', marginLeft: '4px' }}>/{total}</span>}
    </div>
  </div>
);

const ActionButton: React.FC<{ label: string; onClick: () => void; variant: 'primary' | 'danger' | 'warning' | 'info' | 'success' }> = ({ label, onClick, variant }) => {
  const colors = {
    primary: { bg: '#4a90e2', text: '#fff' },
    danger: { bg: '#f5222d', text: '#fff' },
    warning: { bg: '#faad14', text: '#fff' },
    info: { bg: '#1890ff', text: '#fff' },
    success: { bg: '#52c41a', text: '#fff' },
  };
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        background: colors[variant].bg,
        color: colors[variant].text,
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      {label}
    </button>
  );
};

const SmallButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 12px',
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      background: '#fff',
      cursor: 'pointer',
      fontSize: '13px',
    }}
  >
    {label}
  </button>
);

const PolicyInput: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div>
    <label style={{ display: 'block', fontSize: '13px', color: '#666', marginBottom: '4px' }}>{label}</label>
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
    />
  </div>
);

const TaskMessageInjector: React.FC<{ taskId: string; onSend: (msg: string) => void }> = ({ onSend }) => {
  const [message, setMessage] = useState('');
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="输入要插入的消息给当前Agent..."
        style={{ flex: 1, padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '14px' }}
      />
      <button
        onClick={() => { onSend(message); setMessage(''); }}
        style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#4a90e2', color: '#fff', cursor: 'pointer' }}
      >
        发送
      </button>
    </div>
  );
};

export default InterventionCenter;
