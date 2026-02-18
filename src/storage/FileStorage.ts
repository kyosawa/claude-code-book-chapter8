import { mkdir, readFile, writeFile, access, chmod } from 'fs/promises';
import { join, resolve } from 'path';
import { Task, Config, IStorage } from '../types/index.js';
import { BackupManager } from './BackupManager.js';

const DEFAULT_CONFIG: Config = {
  version: '1.0.0',
  nextId: 1,
  defaultBranchPrefix: 'feature/task-',
};

export class FileStorage implements IStorage {
  private taskDir: string;
  private tasksFile: string;
  private configFile: string;
  private backupDir: string;
  private backupManager: BackupManager;
  private initialized: boolean = false;

  constructor(baseDir: string = '.task') {
    this.taskDir = resolve(baseDir);
    this.tasksFile = join(this.taskDir, 'tasks.json');
    this.configFile = join(this.taskDir, 'config.json');
    this.backupDir = join(this.taskDir, 'backup');
    this.backupManager = new BackupManager(this.backupDir);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.taskDir, { recursive: true });
    await mkdir(this.backupDir, { recursive: true });

    try {
      await chmod(this.taskDir, 0o700);
      await chmod(this.backupDir, 0o700);
    } catch {
      // パーミッション変更は失敗しても続行（Windows 等の環境を考慮）
    }

    const tasksExists = await this.fileExists(this.tasksFile);
    if (!tasksExists) {
      await this.writeJsonFile(this.tasksFile, { tasks: [] });
    }

    const configExists = await this.fileExists(this.configFile);
    if (!configExists) {
      await this.writeJsonFile(this.configFile, DEFAULT_CONFIG);
    }

    this.initialized = true;
  }

  async readTasks(): Promise<Task[]> {
    await this.initialize();
    const data = await this.readJsonFile<{ tasks: Task[] }>(this.tasksFile);
    return data.tasks;
  }

  async writeTasks(tasks: Task[]): Promise<void> {
    await this.initialize();
    const exists = await this.fileExists(this.tasksFile);
    if (exists) {
      await this.backupManager.backup(this.tasksFile);
    }
    await this.writeJsonFile(this.tasksFile, { tasks });
  }

  async readConfig(): Promise<Config> {
    await this.initialize();
    return this.readJsonFile<Config>(this.configFile);
  }

  async writeConfig(config: Config): Promise<void> {
    await this.initialize();
    await this.writeJsonFile(this.configFile, config);
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async readJsonFile<T>(path: string): Promise<T> {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  }

  private async writeJsonFile(path: string, data: unknown): Promise<void> {
    await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
    try {
      await chmod(path, 0o600);
    } catch {
      // パーミッション変更は失敗しても続行
    }
  }
}
