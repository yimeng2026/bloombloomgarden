import type React from 'react';

export { DashboardL1Simple } from './DashboardL1Simple';
export { DashboardL2Multi } from './DashboardL2Multi';
export { DashboardL3Gateway } from './DashboardL3Gateway';
export { DashboardL0Infra } from './DashboardL0Infra';

export const DASHBOARD_MAP: Record<string, React.ComponentType<any>> = {
  L0: DashboardL0Infra,
  L1: DashboardL1Simple,
  L2: DashboardL2Multi,
  L3: DashboardL3Gateway,
};
