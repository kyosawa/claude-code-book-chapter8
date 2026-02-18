import { describe, it, expect } from 'vitest';
import { Formatter } from '../../../src/cli/Formatter.js';
import { Task } from '../../../src/types/index.js';

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

describe('Formatter.formatTaskList', () => {
  const formatter = new Formatter();

  it('タスクがない場合は「タスクがありません」を返す', () => {
    const result = formatter.formatTaskList([]);
    expect(result).toContain('タスクがありません');
  });

  it('タスクがある場合はテーブル形式で返す', () => {
    const tasks = [makeTask({ id: '1', title: 'テスト', status: 'open' })];
    const result = formatter.formatTaskList(tasks);
    expect(result).toContain('1');
    expect(result).toContain('テスト');
  });

  it('タイトルが40文字を超える場合は省略される', () => {
    const title = 'あ'.repeat(50);
    const tasks = [makeTask({ title })];
    const result = formatter.formatTaskList(tasks);
    expect(result).toContain('...');
  });

  it('全ステータスを表示できる', () => {
    const statuses: Task['status'][] = ['open', 'in_progress', 'completed', 'archived'];
    for (const status of statuses) {
      const result = formatter.formatTaskList([makeTask({ status })]);
      expect(result).toContain(status);
    }
  });
});

describe('Formatter.formatTaskDetail', () => {
  const formatter = new Formatter();

  it('タスクのIDとタイトルを含む', () => {
    const task = makeTask({ id: '42', title: '詳細テスト' });
    const result = formatter.formatTaskDetail(task);
    expect(result).toContain('42');
    expect(result).toContain('詳細テスト');
  });

  it('description がある場合は表示される', () => {
    const task = makeTask({ description: 'これは説明文です' });
    const result = formatter.formatTaskDetail(task);
    expect(result).toContain('これは説明文です');
  });

  it('completedAt がある場合は完了日時が表示される', () => {
    const task = makeTask({ status: 'completed', completedAt: new Date().toISOString() });
    const result = formatter.formatTaskDetail(task);
    expect(result).toContain('完了日時');
  });

  it('branch がある場合は表示される', () => {
    const task = makeTask({ branch: 'feature/task-1-test' });
    const result = formatter.formatTaskDetail(task);
    expect(result).toContain('feature/task-1-test');
  });

  it('dueDate がない場合は "-" が表示される', () => {
    const task = makeTask();
    const result = formatter.formatTaskDetail(task);
    expect(result).toContain('-');
  });
});

describe('Formatter.formatSuccess', () => {
  const formatter = new Formatter();

  it('成功メッセージに ✓ プレフィックスが付く', () => {
    const result = formatter.formatSuccess('タスクを作成しました');
    expect(result).toContain('✓');
    expect(result).toContain('タスクを作成しました');
  });
});

describe('Formatter.formatError', () => {
  const formatter = new Formatter();

  it('エラーメッセージに ✗ プレフィックスが付く', () => {
    const result = formatter.formatError('エラーが発生しました');
    expect(result).toContain('✗');
    expect(result).toContain('エラーが発生しました');
  });
});
