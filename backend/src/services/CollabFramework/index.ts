/**
 * CollabFramework / 群智协同核心框架
 * ─────────────────────────────────────
 * 统一导出 SwarmCoordinator、InterChariotHandoffProtocol、InterventionService
 * 并提供进程级单例 getter，确保路由层始终拿到同一实例。
 */

import { SwarmCoordinator, SwarmMessageBus, SnapshotEngine } from './SwarmCoordinator';
import { InterChariotHandoffProtocol } from './HandoffProtocol';
import { InterventionService } from './InterventionService';
import { getAgentService, getDialogService } from '../index';
import { getBackendRouter } from '../BackendRouter';

export * from './SwarmCoordinator';
export * from './HandoffProtocol';
export * from './InterventionService';

// ─── 进程级单例 ────────────────────────────────────────

let swarmCoordinatorInstance: SwarmCoordinator | null = null;
let handoffProtocolInstance: InterChariotHandoffProtocol | null = null;
let interventionServiceInstance: InterventionService | null = null;

export function getSwarmCoordinator(): SwarmCoordinator {
  if (!swarmCoordinatorInstance) {
    const bus = new SwarmMessageBus();
    const snapshot = new SnapshotEngine();
    swarmCoordinatorInstance = new SwarmCoordinator(
      bus,
      snapshot,
      getAgentService(),
      getDialogService(),
      getBackendRouter(),
    );
  }
  return swarmCoordinatorInstance;
}

export function getHandoffProtocol(): InterChariotHandoffProtocol {
  if (!handoffProtocolInstance) {
    handoffProtocolInstance = new InterChariotHandoffProtocol(getSwarmCoordinator());
  }
  return handoffProtocolInstance;
}

export function getInterventionService(): InterventionService {
  if (!interventionServiceInstance) {
    interventionServiceInstance = new InterventionService();
  }
  return interventionServiceInstance;
}

// ─── 重置单例（仅用于测试） ───────────────────────────

export function __resetCollabFrameworkSingletons(): void {
  swarmCoordinatorInstance = null;
  handoffProtocolInstance = null;
  interventionServiceInstance = null;
}
