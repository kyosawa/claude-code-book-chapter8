import chalk from 'chalk';
import Table from 'cli-table3';
import { Task } from '../types/index.js';

const STATUS_COLORS: Record<string, (s: string) => string> = {
  open: chalk.white,
  in_progress: chalk.yellow,
  completed: chalk.green,
  archived: chalk.gray,
};

const PRIORITY_COLORS: Record<string, (s: string) => string> = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.blue,
};

const STATUS_LABELS: Record<string, string> = {
  open: 'open',
  in_progress: 'in_progress',
  completed: 'completed',
  archived: 'archived',
};

function colorStatus(status: string): string {
  const fn = STATUS_COLORS[status] ?? chalk.white;
  return fn(STATUS_LABELS[status] ?? status);
}

function colorPriority(priority: string | undefined): string {
  if (!priority) return '-';
  const fn = PRIORITY_COLORS[priority] ?? chalk.white;
  return fn(priority);
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function formatDue(dueDate: string | undefined): string {
  if (!dueDate) return '-';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return chalk.red(`${dueDate} (${Math.abs(diffDays)}日超過)`);
  if (diffDays === 0) return chalk.yellow(`${dueDate} (今日)`);
  return `${dueDate} (あと${diffDays}日)`;
}

export class Formatter {
  formatTaskList(tasks: Task[]): string {
    if (tasks.length === 0) {
      return chalk.gray('タスクがありません');
    }

    const table = new Table({
      head: [
        chalk.bold('ID'),
        chalk.bold('Status'),
        chalk.bold('Title'),
        chalk.bold('Priority'),
        chalk.bold('Branch'),
        chalk.bold('Due'),
      ],
      style: { head: [] },
    });

    for (const task of tasks) {
      table.push([
        task.id,
        colorStatus(task.status),
        truncate(task.title, 40),
        colorPriority(task.priority),
        task.branch ?? '-',
        formatDue(task.dueDate),
      ]);
    }

    return table.toString();
  }

  formatTaskDetail(task: Task): string {
    const statusLabel = colorStatus(task.status);
    const priorityLabel = colorPriority(task.priority);

    const lines = [
      chalk.bold(`タスク #${task.id}`),
      `  タイトル   : ${task.title}`,
      `  ステータス : ${statusLabel}`,
      `  優先度     : ${priorityLabel}`,
      `  ブランチ   : ${task.branch ?? '-'}`,
      `  期限       : ${task.dueDate ?? '-'}`,
      `  作成日時   : ${new Date(task.createdAt).toLocaleString('ja-JP')}`,
      `  更新日時   : ${new Date(task.updatedAt).toLocaleString('ja-JP')}`,
    ];

    if (task.completedAt) {
      lines.push(`  完了日時   : ${new Date(task.completedAt).toLocaleString('ja-JP')}`);
    }

    if (task.description) {
      lines.push(`  説明       :`);
      for (const line of task.description.split('\n')) {
        lines.push(`    ${line}`);
      }
    }

    return lines.join('\n');
  }

  formatSuccess(message: string): string {
    return chalk.green(`✓ ${message}`);
  }

  formatError(message: string): string {
    return chalk.red(`✗ ${message}`);
  }
}
