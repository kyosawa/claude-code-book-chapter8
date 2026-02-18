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

  it('40文字以内のタイトルは省略されない', () => {
    const title = 'a'.repeat(40);
    const tasks = [makeTask({ title })];
    const result = formatter.formatTaskList(tasks);
    expect(result).toContain(title);
    expect(result).not.toContain('...');
  });

  it('41文字のタイトルは省略される', () => {
    const title = 'a'.repeat(41);
    const tasks = [makeTask({ title })];
    const result = formatter.formatTaskList(tasks);
    expect(result).toContain('...');
    expect(result).not.toContain(title);
  });

  it('branch が未設定のとき Branch 列に "-" が表示される', () => {
    const tasks = [makeTask({ branch: undefined })];
    const result = formatter.formatTaskList(tasks);
    expect(result).toContain('-');
  });

  it('期限超過タスクの Due 列は ANSI 赤色コードを含む', () => {
    const tasks = [makeTask({ dueDate: '2000-01-01' })]; // 確実に過去の日付
    const result = formatter.formatTaskList(tasks);
    // chalk.red が ANSI エスケープコード \x1b[31m を出力することを確認
    const ESC = String.fromCharCode(27);
    expect(result).toContain(`${ESC}[31m`); // chalk.red
  });

  it('当日期限タスクの Due 列は ANSI 黄色コードを含む', () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tasks = [makeTask({ dueDate: dateStr })];
    const result = formatter.formatTaskList(tasks);
    // chalk.yellow が ANSI エスケープコード \x1b[33m を出力することを確認
    const ESC = String.fromCharCode(27);
    expect(result).toContain(`${ESC}[33m`); // chalk.yellow
  });

  it('将来の期限タスクの Due 列は日付と残日数を含む', () => {
    const tasks = [makeTask({ dueDate: '2099-12-31' })];
    const result = formatter.formatTaskList(tasks);
    expect(result).toContain('2099-12-31');
    expect(result).toContain('あと');
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
