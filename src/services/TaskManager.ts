import {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  IStorage,
  NotFoundError,
  ValidationError,
  GitError,
} from '../types/index.js';
import { GitManager } from './GitManager.js';

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export class TaskManager {
  constructor(
    private storage: IStorage,
    private gitManager: GitManager = new GitManager(),
  ) {}

  async createTask(data: CreateTaskInput): Promise<Task> {
    const config = await this.storage.readConfig();
    const tasks = await this.storage.readTasks();

    const now = new Date().toISOString();
    const task: Task = {
      id: String(config.nextId),
      title: data.title,
      ...(data.description !== undefined && { description: data.description }),
      status: 'open',
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      createdAt: now,
      updatedAt: now,
    };

    tasks.push(task);
    await this.storage.writeTasks(tasks);
    await this.storage.writeConfig({ ...config, nextId: config.nextId + 1 });

    return task;
  }

  async listTasks(filter?: TaskFilter): Promise<Task[]> {
    let tasks = await this.storage.readTasks();

    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter?.priority) {
      tasks = tasks.filter((t) => t.priority === filter.priority);
    }

    const sortBy = filter?.sortBy ?? 'id';
    tasks.sort((a, b) => {
      switch (sortBy) {
        case 'id':
          return Number(a.id) - Number(b.id);
        case 'priority': {
          const aPri = a.priority ? (PRIORITY_ORDER[a.priority] ?? 99) : 99;
          const bPri = b.priority ? (PRIORITY_ORDER[b.priority] ?? 99) : 99;
          return aPri - bPri;
        }
        case 'dueDate': {
          if (!a.dueDate && !b.dueDate) return Number(a.id) - Number(b.id);
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case 'createdAt':
          return a.createdAt.localeCompare(b.createdAt);
        default:
          return Number(a.id) - Number(b.id);
      }
    });

    return tasks;
  }

  async getTask(id: string): Promise<Task> {
    const tasks = await this.storage.readTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) {
      throw new NotFoundError('タスク', id);
    }
    return task;
  }

  async updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
    const tasks = await this.storage.readTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundError('タスク', id);
    }

    const now = new Date().toISOString();
    const updated: Task = {
      ...tasks[index],
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      updatedAt: now,
    };

    tasks[index] = updated;
    await this.storage.writeTasks(tasks);
    return updated;
  }

  async startTask(id: string): Promise<Task> {
    const tasks = await this.storage.readTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundError('タスク', id);
    }

    const task = tasks[index];
    if (task.status !== 'open') {
      throw new ValidationError(
        `${task.status} のタスクは start できません`,
        'status',
      );
    }

    const isGit = await this.gitManager.isGitRepository();
    let branchName: string | undefined;

    if (isGit) {
      const config = await this.storage.readConfig();
      branchName = this.gitManager.generateBranchName(task, config.defaultBranchPrefix);

      try {
        await this.gitManager.createAndSwitchBranch(branchName);
      } catch (err) {
        throw err instanceof GitError
          ? err
          : new GitError('ブランチの作成に失敗しました', err instanceof Error ? err : undefined);
      }
    }

    const now = new Date().toISOString();
    const updated: Task = {
      ...task,
      status: 'in_progress' as TaskStatus,
      ...(branchName !== undefined && { branch: branchName }),
      updatedAt: now,
    };

    tasks[index] = updated;
    await this.storage.writeTasks(tasks);

    return updated;
  }

  async completeTask(id: string): Promise<Task> {
    const tasks = await this.storage.readTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundError('タスク', id);
    }

    const task = tasks[index];
    if (task.status !== 'in_progress') {
      throw new ValidationError(
        `${task.status} のタスクは done できません`,
        'status',
      );
    }

    const now = new Date().toISOString();
    const updated: Task = {
      ...task,
      status: 'completed' as TaskStatus,
      completedAt: now,
      updatedAt: now,
    };

    tasks[index] = updated;
    await this.storage.writeTasks(tasks);
    return updated;
  }

  async archiveTask(id: string): Promise<Task> {
    const tasks = await this.storage.readTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundError('タスク', id);
    }

    const task = tasks[index];
    if (task.status !== 'open' && task.status !== 'completed') {
      throw new ValidationError(
        `${task.status} のタスクは archive できません`,
        'status',
      );
    }

    const now = new Date().toISOString();
    const updated: Task = {
      ...task,
      status: 'archived' as TaskStatus,
      updatedAt: now,
    };

    tasks[index] = updated;
    await this.storage.writeTasks(tasks);
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.storage.readTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundError('タスク', id);
    }

    const task = tasks[index];
    if (task.status !== 'open' && task.status !== 'in_progress') {
      throw new ValidationError(
        `${task.status} のタスクは delete できません`,
        'status',
      );
    }

    tasks.splice(index, 1);
    await this.storage.writeTasks(tasks);
  }
}
