// Dashboard组件占位符 - 将在后续版本中添加完整仪表盘
export const DASHBOARD_MAP: Record<string, React.ComponentType<any>> = {};
import React from 'react';

const PlaceholderDashboard: React.FC<{agentId: string; agentName: string}> = ({agentName}) => (
  React.createElement('div', {className: 'p-8 text-center text-[var(--sage-500)]'},
    React.createElement('p', null, agentName + ' 的专用仪表盘即将推出'),
    React.createElement('p', {className: 'text-sm mt-2'}, 'L1/L2/L3/L0 协议层级仪表盘开发中')
  )
);

// 所有层级使用占位符
['L0', 'L1', 'L2', 'L3'].forEach(k => { DASHBOARD_MAP[k] = PlaceholderDashboard; });
