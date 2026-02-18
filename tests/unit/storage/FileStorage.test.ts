import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileStorage } from '../../../src/storage/FileStorage.js';

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  access: vi.fn(),
  chmod: vi.fn().mockResolvedValue(undefined),
  copyFile: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  rm: vi.fn().mockResolvedValue(undefined),
}));

import * as fsMock from 'fs/promises';

const mockFs = fsMock as {
  mkdir: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
  access: ReturnType<typeof vi.fn>;
  chmod: ReturnType<typeof vi.fn>;
  copyFile: ReturnType<typeof vi.fn>;
  readdir: ReturnType<typeof vi.fn>;
  rm: ReturnType<typeof vi.fn>;
};

const emptyTasks = JSON.stringify({ tasks: [] });
const defaultConfig = JSON.stringify({
  version: '1.0.0',
  nextId: 1,
  defaultBranchPrefix: 'feature/task-',
});

describe('FileStorage.initialize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ディレクトリを作成する', async () => {
    mockFs.access.mockRejectedValue(new Error('ENOENT'));
    mockFs.readFile.mockResolvedValue(emptyTasks);

    const storage = new FileStorage('.task-test');
    await storage.initialize();

    expect(mockFs.mkdir).toHaveBeenCalledWith('.task-test', { recursive: true });
    expect(mockFs.mkdir).toHaveBeenCalledWith('.task-test/backup', { recursive: true });
  });

  it('ファイルが存在しない場合は初期ファイルを作成する', async () => {
    mockFs.access.mockRejectedValue(new Error('ENOENT'));

    const storage = new FileStorage('.task-test');
    await storage.initialize();

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '.task-test/tasks.json',
      JSON.stringify({ tasks: [] }, null, 2),
      'utf-8',
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '.task-test/config.json',
      expect.any(String),
      'utf-8',
    );
  });

  it('ファイルが既に存在する場合は作成しない', async () => {
    mockFs.access.mockResolvedValue(undefined);

    const storage = new FileStorage('.task-test');
    await storage.initialize();

    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });
});

describe('FileStorage.readTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.access.mockResolvedValue(undefined);
  });

  it('tasks.json からタスク配列を返す', async () => {
    const taskData = {
      tasks: [
        {
          id: '1',
          title: 'テスト',
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    mockFs.readFile.mockResolvedValue(JSON.stringify(taskData));

    const storage = new FileStorage('.task-test');
    const tasks = await storage.readTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('1');
  });
});

describe('FileStorage.writeTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.access.mockResolvedValue(undefined);
  });

  it('書き込み前にバックアップを作成する', async () => {
    const storage = new FileStorage('.task-test');
    await storage.writeTasks([]);

    expect(mockFs.copyFile).toHaveBeenCalledWith(
      '.task-test/tasks.json',
      expect.stringContaining('.task-test/backup/tasks-'),
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '.task-test/tasks.json',
      JSON.stringify({ tasks: [] }, null, 2),
      'utf-8',
    );
  });

  it('バックアップ後に tasks.json に書き込む', async () => {
    const now = new Date().toISOString();
    const tasks = [
      { id: '1', title: 'テスト', status: 'open' as const, createdAt: now, updatedAt: now },
    ];
    const storage = new FileStorage('.task-test');
    await storage.writeTasks(tasks);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      '.task-test/tasks.json',
      JSON.stringify({ tasks }, null, 2),
      'utf-8',
    );
  });
});

describe('FileStorage.readConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.access.mockResolvedValue(undefined);
  });

  it('config.json から設定を返す', async () => {
    mockFs.readFile.mockResolvedValue(defaultConfig);

    const storage = new FileStorage('.task-test');
    const config = await storage.readConfig();

    expect(config.version).toBe('1.0.0');
    expect(config.nextId).toBe(1);
    expect(config.defaultBranchPrefix).toBe('feature/task-');
  });
});
