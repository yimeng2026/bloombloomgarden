import { EventEmitter } from 'events';

export interface WorkspaceFile {
  path: string;
  content: string | Buffer;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWorkspace {
  taskId: string;
  groupId: string;
  files: Map<string, WorkspaceFile>;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkspaceService extends EventEmitter {
  private workspaces = new Map<string, TaskWorkspace>();

  async createTask(groupId: string, taskId: string): Promise<TaskWorkspace> {
    const ws: TaskWorkspace = {
      taskId,
      groupId,
      files: new Map(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workspaces.set(taskId, ws);
    this.emit('workspace:created', ws);
    return ws;
  }

  async getTask(taskId: string): Promise<TaskWorkspace | undefined> {
    return this.workspaces.get(taskId);
  }

  async listTasks(groupId?: string): Promise<TaskWorkspace[]> {
    const all = Array.from(this.workspaces.values());
    if (groupId) return all.filter(w => w.groupId === groupId);
    return all;
  }

  async writeFile(taskId: string, path: string, content: string | Buffer, mimeType = 'text/plain'): Promise<WorkspaceFile> {
    const ws = this.workspaces.get(taskId);
    if (!ws) throw new Error(`Workspace ${taskId} not found`);
    const file: WorkspaceFile = {
      path,
      content,
      mimeType,
      size: Buffer.byteLength(content),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ws.files.set(path, file);
    ws.updatedAt = new Date();
    this.emit('file:written', { taskId, path });
    return file;
  }

  async readFile(taskId: string, path: string): Promise<WorkspaceFile | undefined> {
    const ws = this.workspaces.get(taskId);
    return ws?.files.get(path);
  }

  async deleteFile(taskId: string, path: string): Promise<boolean> {
    const ws = this.workspaces.get(taskId);
    if (!ws) return false;
    const existed = ws.files.delete(path);
    if (existed) ws.updatedAt = new Date();
    return existed;
  }

  async importFiles(targetId: string, sourceId: string, fileFilter?: string[]): Promise<TaskWorkspace | undefined> {
    const target = this.workspaces.get(targetId);
    const source = this.workspaces.get(sourceId);
    if (!target || !source) return undefined;
    for (const [path, file] of source.files) {
      if (fileFilter && !fileFilter.includes(path)) continue;
      target.files.set(path, { ...file, updatedAt: new Date() });
    }
    target.updatedAt = new Date();
    return target;
  }

  async mergeWorkspaces(groupAId: string, groupBId: string, newGroupId: string): Promise<TaskWorkspace[]> {
    const tasksA = await this.listTasks(groupAId);
    const tasksB = await this.listTasks(groupBId);
    const merged = [...tasksA, ...tasksB];
    for (const task of merged) {
      task.groupId = newGroupId;
      task.updatedAt = new Date();
    }
    return merged;
  }

  async buildDownload(taskId: string): Promise<Map<string, Buffer>> {
    const ws = this.workspaces.get(taskId);
    if (!ws) throw new Error(`Workspace ${taskId} not found`);
    const result = new Map<string, Buffer>();
    for (const [path, file] of ws.files) {
      result.set(path, Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content));
    }
    return result;
  }
}
