export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  branch?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  githubIssueNumber?: number;
}

export interface Config {
  version: string;
  nextId: number;
  githubToken?: string;
  defaultBranchPrefix: string;
}

export interface IStorage {
  readTasks(): Promise<Task[]>;
  writeTasks(tasks: Task[]): Promise<void>;
  readConfig(): Promise<Config>;
  writeConfig(config: Config): Promise<void>;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  sortBy?: 'id' | 'priority' | 'dueDate' | 'createdAt';
}

// src/types/index.ts に定義するカスタムエラークラス
export class TaskCLIError extends Error {
  constructor(
    message: string,
    public exitCode: number,
  ) {
    super(message);
    this.name = 'TaskCLIError';
  }
}

export class NotFoundError extends TaskCLIError {
  constructor(resource: string, id: string) {
    super(`${resource} #${id} が見つかりません`, 2);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends TaskCLIError {
  constructor(
    message: string,
    public field: string,
  ) {
    super(message, 1);
    this.name = 'ValidationError';
  }
}

export class GitError extends TaskCLIError {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message, 3);
    this.name = 'GitError';
  }
}
