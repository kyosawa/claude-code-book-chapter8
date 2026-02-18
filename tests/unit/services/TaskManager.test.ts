import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskManager } from '../../../src/services/TaskManager.js';
import { GitManager } from '../../../src/services/GitManager.js';
import {
  IStorage,
  Config,
  Task,
  NotFoundError,
  ValidationError,
  GitError,
} from '../../../src/types/index.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: '1',
    title: 'テストタスク',
    status: 'open',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    version: '1.0.0',
    nextId: 1,
    defaultBranchPrefix: 'feature/task-',
    ...overrides,
  };
}

function makeStorage(tasks: Task[] = [], config: Config = makeConfig()): IStorage {
  const taskStore = [...tasks];
  const configStore = { ...config };

  return {
    readTasks: vi.fn().mockImplementation(() => Promise.resolve([...taskStore])),
    writeTasks: vi.fn().mockImplementation((t: Task[]) => {
      taskStore.length = 0;
      taskStore.push(...t);
      return Promise.resolve();
    }),
    readConfig: vi.fn().mockImplementation(() => Promise.resolve({ ...configStore })),
    writeConfig: vi.fn().mockImplementation((c: Config) => {
      Object.assign(configStore, c);
      return Promise.resolve();
    }),
  };
}

function makeGitManager(overrides: Partial<Record<keyof GitManager, unknown>> = {}): GitManager {
  return {
    isGitRepository: vi.fn().mockResolvedValue(false),
    getCurrentBranch: vi.fn().mockResolvedValue('main'),
    createAndSwitchBranch: vi.fn().mockResolvedValue(undefined),
    branchExists: vi.fn().mockResolvedValue(false),
    generateBranchName: vi.fn().mockReturnValue('feature/task-1-test'),
    ...overrides,
  } as unknown as GitManager;
}

describe('TaskManager.createTask', () => {
  it('タスクを正常に作成する', async () => {
    const storage = makeStorage([], makeConfig({ nextId: 5 }));
    const manager = new TaskManager(storage);
    const task = await manager.createTask({ title: 'テスト' });

    expect(task.id).toBe('5');
    expect(task.title).toBe('テスト');
    expect(task.status).toBe('open');
    expect(storage.writeTasks).toHaveBeenCalledOnce();
    expect(storage.writeConfig).toHaveBeenCalledWith(
      expect.objectContaining({ nextId: 6 }),
    );
  });

  it('priority と dueDate を指定して作成できる', async () => {
    const storage = makeStorage();
    const manager = new TaskManager(storage);
    const task = await manager.createTask({
      title: 'タスク',
      priority: 'high',
      dueDate: '2026-12-31',
    });

    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2026-12-31');
  });

  it('description を指定して作成できる', async () => {
    const storage = makeStorage();
    const manager = new TaskManager(storage);
    const task = await manager.createTask({ title: 'タスク', description: '説明文' });

    expect(task.description).toBe('説明文');
  });
});

describe('TaskManager.listTasks', () => {
  let tasks: Task[];
  let storage: IStorage;
  let manager: TaskManager;

  beforeEach(() => {
    const now = new Date().toISOString();
    tasks = [
      makeTask({ id: '3', title: 'C', status: 'open', priority: 'low', createdAt: now }),
      makeTask({ id: '1', title: 'A', status: 'in_progress', priority: 'high', createdAt: now }),
      makeTask({ id: '2', title: 'B', status: 'completed', priority: 'medium', createdAt: now }),
    ];
    storage = makeStorage(tasks);
    manager = new TaskManager(storage);
  });

  it('デフォルト（フィルタなし）はID昇順で全タスクを返す', async () => {
    const result = await manager.listTasks();
    expect(result.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('status フィルタが機能する', async () => {
    const result = await manager.listTasks({ status: 'open' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('priority フィルタが機能する', async () => {
    const result = await manager.listTasks({ priority: 'high' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('sortBy: priority でソートされる', async () => {
    const result = await manager.listTasks({ sortBy: 'priority' });
    expect(result.map((t) => t.priority)).toEqual(['high', 'medium', 'low']);
  });

  it('sortBy: dueDate でソートされる（dueDateなしは末尾）', async () => {
    const storageDue = makeStorage([
      makeTask({ id: '1', dueDate: '2026-03-01' }),
      makeTask({ id: '2', dueDate: '2026-01-01' }),
      makeTask({ id: '3' }),
    ]);
    const m = new TaskManager(storageDue);
    const result = await m.listTasks({ sortBy: 'dueDate' });
    expect(result[0].dueDate).toBe('2026-01-01');
    expect(result[1].dueDate).toBe('2026-03-01');
    expect(result[2].dueDate).toBeUndefined();
  });
});

describe('TaskManager.getTask', () => {
  it('存在するタスクを返す', async () => {
    const storage = makeStorage([makeTask({ id: '1' })]);
    const manager = new TaskManager(storage);
    const task = await manager.getTask('1');
    expect(task.id).toBe('1');
  });

  it('存在しないIDは NotFoundError をスロー', async () => {
    const storage = makeStorage();
    const manager = new TaskManager(storage);
    await expect(manager.getTask('99')).rejects.toThrow(NotFoundError);
  });
});

describe('TaskManager.updateTask', () => {
  it('タスクの属性を更新できる', async () => {
    const storage = makeStorage([makeTask({ id: '1', title: '旧タイトル' })]);
    const manager = new TaskManager(storage);
    const updated = await manager.updateTask('1', { title: '新タイトル', priority: 'high' });

    expect(updated.title).toBe('新タイトル');
    expect(updated.priority).toBe('high');
  });

  it('存在しないIDは NotFoundError をスロー', async () => {
    const storage = makeStorage();
    const manager = new TaskManager(storage);
    await expect(manager.updateTask('99', { title: 'test' })).rejects.toThrow(NotFoundError);
  });
});

describe('TaskManager.startTask', () => {
  it('open タスクを in_progress に変更する（Gitなし）', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'open' })]);
    const git = makeGitManager({ isGitRepository: vi.fn().mockResolvedValue(false) });
    const manager = new TaskManager(storage, git);

    const task = await manager.startTask('1');
    expect(task.status).toBe('in_progress');
    expect(git.createAndSwitchBranch).not.toHaveBeenCalled();
  });

  it('Gitリポジトリがある場合はブランチを作成する', async () => {
    const storage = makeStorage(
      [makeTask({ id: '1', status: 'open' })],
      makeConfig({ defaultBranchPrefix: 'feature/task-' }),
    );
    const git = makeGitManager({
      isGitRepository: vi.fn().mockResolvedValue(true),
      generateBranchName: vi.fn().mockReturnValue('feature/task-1-test'),
      createAndSwitchBranch: vi.fn().mockResolvedValue(undefined),
    });
    const manager = new TaskManager(storage, git);

    const task = await manager.startTask('1');
    expect(task.status).toBe('in_progress');
    expect(task.branch).toBe('feature/task-1-test');
    expect(git.createAndSwitchBranch).toHaveBeenCalledWith('feature/task-1-test');
  });

  it('Git ブランチ作成失敗時は GitError をスロー（ロールバック）', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'open' })]);
    const git = makeGitManager({
      isGitRepository: vi.fn().mockResolvedValue(true),
      generateBranchName: vi.fn().mockReturnValue('feature/task-1-test'),
      createAndSwitchBranch: vi.fn().mockRejectedValue(new GitError('ブランチ作成失敗')),
    });
    const manager = new TaskManager(storage, git);

    await expect(manager.startTask('1')).rejects.toThrow(GitError);
    // ステータスが変更されていないことを確認（writeTasks が呼ばれていない）
    expect(storage.writeTasks).not.toHaveBeenCalled();
  });

  it('open 以外のステータスのタスクは ValidationError をスロー', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'completed' })]);
    const manager = new TaskManager(storage);
    await expect(manager.startTask('1')).rejects.toThrow(ValidationError);
  });

  it('存在しないIDは NotFoundError をスロー', async () => {
    const storage = makeStorage();
    const manager = new TaskManager(storage);
    await expect(manager.startTask('99')).rejects.toThrow(NotFoundError);
  });
});

describe('TaskManager.completeTask', () => {
  it('in_progress タスクを completed に変更する', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'in_progress' })]);
    const manager = new TaskManager(storage);
    const task = await manager.completeTask('1');

    expect(task.status).toBe('completed');
    expect(task.completedAt).toBeDefined();
  });

  it('in_progress 以外は ValidationError をスロー', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'open' })]);
    const manager = new TaskManager(storage);
    await expect(manager.completeTask('1')).rejects.toThrow(ValidationError);
  });

  it('存在しないIDは NotFoundError をスロー', async () => {
    const storage = makeStorage();
    const manager = new TaskManager(storage);
    await expect(manager.completeTask('99')).rejects.toThrow(NotFoundError);
  });
});

describe('TaskManager.archiveTask', () => {
  it('open タスクを archived に変更できる', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'open' })]);
    const manager = new TaskManager(storage);
    const task = await manager.archiveTask('1');
    expect(task.status).toBe('archived');
  });

  it('completed タスクを archived に変更できる', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'completed' })]);
    const manager = new TaskManager(storage);
    const task = await manager.archiveTask('1');
    expect(task.status).toBe('archived');
  });

  it('in_progress タスクは ValidationError をスロー', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'in_progress' })]);
    const manager = new TaskManager(storage);
    await expect(manager.archiveTask('1')).rejects.toThrow(ValidationError);
  });
});

describe('TaskManager.deleteTask', () => {
  it('open タスクを削除できる', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'open' })]);
    const manager = new TaskManager(storage);
    await expect(manager.deleteTask('1')).resolves.not.toThrow();
    expect(storage.writeTasks).toHaveBeenCalledWith([]);
  });

  it('in_progress タスクを削除できる', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'in_progress' })]);
    const manager = new TaskManager(storage);
    await expect(manager.deleteTask('1')).resolves.not.toThrow();
  });

  it('completed タスクは ValidationError をスロー', async () => {
    const storage = makeStorage([makeTask({ id: '1', status: 'completed' })]);
    const manager = new TaskManager(storage);
    await expect(manager.deleteTask('1')).rejects.toThrow(ValidationError);
  });

  it('存在しないIDは NotFoundError をスロー', async () => {
    const storage = makeStorage();
    const manager = new TaskManager(storage);
    await expect(manager.deleteTask('99')).rejects.toThrow(NotFoundError);
  });
});
