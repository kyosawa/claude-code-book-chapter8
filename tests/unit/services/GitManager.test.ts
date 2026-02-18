import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitError } from '../../../src/types/index.js';

const mockGitInstance = vi.hoisted(() => ({
  revparse: vi.fn(),
  checkoutLocalBranch: vi.fn(),
  branch: vi.fn(),
}));

vi.mock('simple-git', () => ({
  default: vi.fn().mockReturnValue(mockGitInstance),
}));

import { GitManager } from '../../../src/services/GitManager.js';

describe('GitManager.isGitRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('revparse が成功すれば true を返す', async () => {
    mockGitInstance.revparse.mockResolvedValue('.git');
    const manager = new GitManager();
    expect(await manager.isGitRepository()).toBe(true);
  });

  it('revparse が失敗すれば false を返す', async () => {
    mockGitInstance.revparse.mockRejectedValue(new Error('not a git repo'));
    const manager = new GitManager();
    expect(await manager.isGitRepository()).toBe(false);
  });
});

describe('GitManager.getCurrentBranch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('現在のブランチ名を返す（末尾の改行は除去される）', async () => {
    mockGitInstance.revparse.mockResolvedValue('main\n');
    const manager = new GitManager();
    expect(await manager.getCurrentBranch()).toBe('main');
  });

  it('失敗時は GitError をスロー', async () => {
    mockGitInstance.revparse.mockRejectedValue(new Error('git error'));
    const manager = new GitManager();
    await expect(manager.getCurrentBranch()).rejects.toThrow(GitError);
  });
});

describe('GitManager.createAndSwitchBranch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ブランチを作成して切り替える', async () => {
    mockGitInstance.checkoutLocalBranch.mockResolvedValue(undefined);
    const manager = new GitManager();
    await expect(manager.createAndSwitchBranch('feature/task-1')).resolves.not.toThrow();
    expect(mockGitInstance.checkoutLocalBranch).toHaveBeenCalledWith('feature/task-1');
  });

  it('失敗時は GitError をスロー', async () => {
    mockGitInstance.checkoutLocalBranch.mockRejectedValue(new Error('branch exists'));
    const manager = new GitManager();
    await expect(manager.createAndSwitchBranch('feature/task-1')).rejects.toThrow(GitError);
  });
});

describe('GitManager.branchExists', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ブランチが存在すれば true を返す', async () => {
    mockGitInstance.branch.mockResolvedValue({ all: ['feature/task-1'] });
    const manager = new GitManager();
    expect(await manager.branchExists('feature/task-1')).toBe(true);
  });

  it('ブランチが存在しなければ false を返す', async () => {
    mockGitInstance.branch.mockResolvedValue({ all: [] });
    const manager = new GitManager();
    expect(await manager.branchExists('feature/task-99')).toBe(false);
  });

  it('エラー時は false を返す', async () => {
    mockGitInstance.branch.mockRejectedValue(new Error('git error'));
    const manager = new GitManager();
    expect(await manager.branchExists('feature/task-1')).toBe(false);
  });
});

describe('GitManager.generateBranchName', () => {
  const now = new Date().toISOString();

  function task(id: string, title: string) {
    return { id, title, status: 'open' as const, createdAt: now, updatedAt: now };
  }

  it('英語タイトルからブランチ名を生成する', () => {
    const manager = new GitManager();
    expect(manager.generateBranchName(task('1', 'User Authentication'), 'feature/task-'))
      .toBe('feature/task-1-user-authentication');
  });

  it('スペースはハイフンに変換される', () => {
    const manager = new GitManager();
    expect(manager.generateBranchName(task('2', 'Fix login bug'), 'feature/task-'))
      .toBe('feature/task-2-fix-login-bug');
  });

  it('日本語タイトルは除去されIDのみのブランチ名になる', () => {
    const manager = new GitManager();
    expect(manager.generateBranchName(task('3', 'ユーザー認証'), 'feature/task-'))
      .toBe('feature/task-3');
  });

  it('50文字を超えるスラッグは切り詰められる', () => {
    const manager = new GitManager();
    const result = manager.generateBranchName(task('1', 'a'.repeat(60)), 'feature/task-');
    expect(result).toBe(`feature/task-1-${'a'.repeat(50)}`);
  });

  it('prefix が未指定の場合はデフォルト prefix を使う', () => {
    const manager = new GitManager();
    expect(manager.generateBranchName(task('1', 'test task')))
      .toBe('feature/task-1-test-task');
  });

  it('特殊文字は除去される', () => {
    const manager = new GitManager();
    expect(manager.generateBranchName(task('1', 'fix: bug#123!'), 'feature/task-'))
      .toBe('feature/task-1-fix-bug123');
  });
});
