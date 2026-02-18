import { Command } from 'commander';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { Formatter } from '../Formatter.js';
import { TaskCLIError, TaskStatus, TaskPriority } from '../../types/index.js';

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('タスク一覧を表示する')
    .option('-s, --status <status>', 'ステータスでフィルタ (open/in_progress/completed/archived)')
    .option('-p, --priority <level>', '優先度でフィルタ (high/medium/low)')
    .option('--sort <field>', 'ソートフィールド (id/priority/dueDate/createdAt)')
    .action(async (options: { status?: string; priority?: string; sort?: string }) => {
      const formatter = new Formatter();
      try {
        const storage = new FileStorage();
        const manager = new TaskManager(storage);
        const tasks = await manager.listTasks({
          status: options.status as TaskStatus | undefined,
          priority: options.priority as TaskPriority | undefined,
          sortBy: options.sort as 'id' | 'priority' | 'dueDate' | 'createdAt' | undefined,
        });

        console.log(formatter.formatTaskList(tasks));
      } catch (err) {
        if (err instanceof TaskCLIError) {
          console.error(formatter.formatError(err.message));
          process.exit(err.exitCode);
        }
        throw err;
      }
    });
}
