/**
 * Services 统一入口
 * 提供各模块 Service 的进程级单例，支持可选 Prisma 注入
 */

import type { PrismaClient } from '@prisma/client';
import prisma from '../config/prisma';

import { AgentService } from './AgentService';
import { GroupService } from './GroupService';
import { DialogService } from './DialogService';
import { UnifiedAPIService } from './UnifiedAPIService';
import { WorkspaceService } from './WorkspaceService';
import { KnowledgeService } from './KnowledgeService';
import { SkillService } from './SkillService';
import { IntegrationService } from './IntegrationService';
import { MonitorService } from './MonitorService';
import { BlueprintService } from './BlueprintService';
import { SettingsService } from './SettingsService';

import { TaskService } from './TaskService';

export * from './AgentService';
export * from './GroupService';
export * from './DialogService';
export * from './UnifiedAPIService';
export * from './WorkspaceService';
export * from './KnowledgeService';
export * from './SkillService';
export * from './IntegrationService';
export * from './MonitorService';
export * from './BlueprintService';
export * from './SettingsService';
export * from './TaskService';

// ─── 进程级单例（自动注入 Prisma） ────────────────────

let agentServiceInstance: AgentService | null = null;
let groupServiceInstance: GroupService | null = null;
let dialogServiceInstance: DialogService | null = null;
let unifiedAPIServiceInstance: UnifiedAPIService | null = null;
let workspaceServiceInstance: WorkspaceService | null = null;
let knowledgeServiceInstance: KnowledgeService | null = null;
let skillServiceInstance: SkillService | null = null;
let integrationServiceInstance: IntegrationService | null = null;
let monitorServiceInstance: MonitorService | null = null;
let blueprintServiceInstance: BlueprintService | null = null;
let settingsServiceInstance: SettingsService | null = null;
let taskServiceInstance: TaskService | null = null;

function getPrisma(): PrismaClient | undefined {
  // 如果 prisma 模块导出的是有效实例则返回，否则 undefined（回退到内存）
  return prisma || undefined;
}

export function getTaskService(): TaskService {
  if (!taskServiceInstance) taskServiceInstance = new TaskService();
  return taskServiceInstance;
}

export function getAgentService(): AgentService {
  if (!agentServiceInstance) agentServiceInstance = new AgentService(getPrisma());
  return agentServiceInstance;
}

export function getGroupService(): GroupService {
  if (!groupServiceInstance) groupServiceInstance = new GroupService(getPrisma());
  return groupServiceInstance;
}

export function getDialogService(): DialogService {
  if (!dialogServiceInstance) dialogServiceInstance = new DialogService();
  return dialogServiceInstance;
}

export function getUnifiedAPIService(): UnifiedAPIService {
  if (!unifiedAPIServiceInstance) unifiedAPIServiceInstance = new UnifiedAPIService();
  return unifiedAPIServiceInstance;
}

export function getWorkspaceService(): WorkspaceService {
  if (!workspaceServiceInstance) workspaceServiceInstance = new WorkspaceService();
  return workspaceServiceInstance;
}

export function getKnowledgeService(): KnowledgeService {
  if (!knowledgeServiceInstance) knowledgeServiceInstance = new KnowledgeService(getPrisma());
  return knowledgeServiceInstance;
}

export function getSkillService(): SkillService {
  if (!skillServiceInstance) skillServiceInstance = new SkillService(getPrisma());
  return skillServiceInstance;
}

export function getIntegrationService(): IntegrationService {
  if (!integrationServiceInstance) integrationServiceInstance = new IntegrationService(getPrisma());
  return integrationServiceInstance;
}

export function getMonitorService(): MonitorService {
  if (!monitorServiceInstance) monitorServiceInstance = new MonitorService();
  return monitorServiceInstance;
}

export function getBlueprintService(): BlueprintService {
  if (!blueprintServiceInstance) blueprintServiceInstance = new BlueprintService(getPrisma());
  return blueprintServiceInstance;
}

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) settingsServiceInstance = new SettingsService(getPrisma());
  return settingsServiceInstance;
}

// ─── 重置单例（仅用于测试） ───────────────────────────

export function __resetAllServiceSingletons(): void {
  agentServiceInstance = null;
  groupServiceInstance = null;
  dialogServiceInstance = null;
  unifiedAPIServiceInstance = null;
  workspaceServiceInstance = null;
  knowledgeServiceInstance = null;
  skillServiceInstance = null;
  integrationServiceInstance = null;
  monitorServiceInstance = null;
  blueprintServiceInstance = null;
  settingsServiceInstance = null;
}
