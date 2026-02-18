import { describe, it, expect, vi } from 'vitest';
import { TaskManager } from '../../src/services/TaskManager.js';
import { Formatter } from '../../src/cli/Formatter.js';
import { IStorage, Config, Task } from '../../src/types/index.js';

function generateTasks(count: number): Task[] {
  const statuses: Task['status'][] = ['open', 'in_progress', 'completed', 'archived'];
  const priorities: Task['priority'][] = ['high', 'medium', 'low', undefined];
  const now = new Date().toISOString();

  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    title: `タスク ${i + 1}: サンプルタスクのタイトル（パフォーマンステスト用）`,
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    branch: i % 3 === 0 ? `feature/task-${i + 1}-sample` : undefined,
    dueDate: i % 5 === 0 ? '2026-12-31' : undefined,
    createdAt: now,
    updatedAt: now,
  }));
}

function makeStorage(tasks: Task[]): IStorage {
  const config: Config = {
    version: '1.0.0',
    nextId: tasks.length + 1,
    defaultBranchPrefix: 'feature/task-',
  };
  return {
    readTasks: vi.fn().mockResolvedValue(tasks),
    writeTasks: vi.fn().mockResolvedValue(undefined),
    readConfig: vi.fn().mockResolvedValue(config),
    writeConfig: vi.fn().mockResolvedValue(undefined),
  };
}

describe('タスク一覧表示 パフォーマンステスト', () => {
  const TASK_COUNT = 1000;
  const MAX_MS = 1000;

  it(`${TASK_COUNT}件タスクの listTasks() が ${MAX_MS}ms 以内に完了する`, async () => {
    const tasks = generateTasks(TASK_COUNT);
    const storage = makeStorage(tasks);
    const manager = new TaskManager(storage);

    const start = performance.now();
    const result = await manager.listTasks();
    const elapsed = performance.now() - start;

    expect(result).toHaveLength(TASK_COUNT);
    expect(elapsed).toBeLessThan(MAX_MS);
  });

  it(`${TASK_COUNT}件タスクの formatTaskList() が ${MAX_MS}ms 以内に完了する`, () => {
    const tasks = generateTasks(TASK_COUNT);
    const formatter = new Formatter();

    const start = performance.now();
    const output = formatter.formatTaskList(tasks);
    const elapsed = performance.now() - start;

    expect(output).toContain('1');
    expect(output).toContain(String(TASK_COUNT));
    expect(elapsed).toBeLessThan(MAX_MS);
  });

  it(`${TASK_COUNT}件タスクの listTasks() + formatTaskList() の合計が ${MAX_MS}ms 以内に完了する`, async () => {
    const tasks = generateTasks(TASK_COUNT);
    const storage = makeStorage(tasks);
    const manager = new TaskManager(storage);
    const formatter = new Formatter();

    const start = performance.now();
    const result = await manager.listTasks();
    const output = formatter.formatTaskList(result);
    const elapsed = performance.now() - start;

    expect(output.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(MAX_MS);
  });

  it(`${TASK_COUNT}件タスクを priority でフィルタリングしても ${MAX_MS}ms 以内に完了する`, async () => {
    const tasks = generateTasks(TASK_COUNT);
    const storage = makeStorage(tasks);
    const manager = new TaskManager(storage);

    const start = performance.now();
    const result = await manager.listTasks({ priority: 'high' });
    const elapsed = performance.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((t) => t.priority === 'high')).toBe(true);
    expect(elapsed).toBeLessThan(MAX_MS);
  });
});
