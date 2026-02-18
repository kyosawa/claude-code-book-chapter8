import { Command } from 'commander';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { Formatter } from '../Formatter.js';
import { validateTitle, validateDueDate, validatePriority } from '../../validators/taskValidators.js';
import { TaskCLIError, TaskPriority } from '../../types/index.js';

export function registerAddCommand(program: Command): void {
  program
    .command('add <title>')
    .description('新しいタスクを追加する')
    .option('-d, --description <text>', 'タスクの説明')
    .option('-p, --priority <level>', '優先度 (high/medium/low)')
    .option('--due <date>', '期限 (YYYY-MM-DD)')
    .action(async (title: string, options: { description?: string; priority?: string; due?: string }) => {
      const formatter = new Formatter();
      try {
        validateTitle(title);
        if (options.priority) validatePriority(options.priority);
        if (options.due) validateDueDate(options.due);

        const storage = new FileStorage();
        const manager = new TaskManager(storage);
        const task = await manager.createTask({
          title,
          description: options.description,
          priority: options.priority as TaskPriority | undefined,
          dueDate: options.due,
        });

        console.log(formatter.formatSuccess(`タスクを作成しました (ID: ${task.id})`));
        console.log(formatter.formatTaskDetail(task));
      } catch (err) {
        if (err instanceof TaskCLIError) {
          console.error(formatter.formatError(err.message));
          process.exit(err.exitCode);
        }
        throw err;
      }
    });
}
