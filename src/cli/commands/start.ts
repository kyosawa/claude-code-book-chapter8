import { Command } from 'commander';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { Formatter } from '../Formatter.js';
import { validateTaskId } from '../../validators/taskValidators.js';
import { TaskCLIError } from '../../types/index.js';

export function registerStartCommand(program: Command): void {
  program
    .command('start <id>')
    .description('タスクを開始する（ステータスを in_progress に変更）')
    .action(async (id: string) => {
      const formatter = new Formatter();
      try {
        validateTaskId(id);

        const storage = new FileStorage();
        const manager = new TaskManager(storage);
        const task = await manager.startTask(id);

        let msg = `タスク #${task.id} を開始しました`;
        if (task.branch) {
          msg += `\nブランチ: ${task.branch}`;
        }
        console.log(formatter.formatSuccess(msg));
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
