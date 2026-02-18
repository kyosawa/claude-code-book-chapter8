import simpleGit, { SimpleGit } from 'simple-git';
import { Task, GitError } from '../types/index.js';

export class GitManager {
  private git: SimpleGit;

  constructor(baseDir: string = process.cwd()) {
    this.git = simpleGit(baseDir);
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (err) {
      throw new GitError('現在のブランチ名の取得に失敗しました', err instanceof Error ? err : undefined);
    }
  }

  async createAndSwitchBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkoutLocalBranch(branchName);
    } catch (err) {
      throw new GitError(
        `ブランチの作成に失敗しました: ${branchName}`,
        err instanceof Error ? err : undefined,
      );
    }
  }

  async branchExists(branchName: string): Promise<boolean> {
    try {
      const result = await this.git.branch(['--list', branchName]);
      return result.all.includes(branchName);
    } catch {
      return false;
    }
  }

  generateBranchName(task: Task, prefix?: string): string {
    const config = prefix ?? 'feature/task-';
    const slug = task.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50)
      .replace(/^-+|-+$/g, '');

    return slug ? `${config}${task.id}-${slug}` : `${config}${task.id}`;
  }
}
