import { Command } from 'commander';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { Formatter } from '../Formatter.js';
import { validateTaskId } from '../../validators/taskValidators.js';
import { TaskCLIError } from '../../types/index.js';

export function registerShowCommand(program: Command): void {
  program
    .command('show <id>')
    .description('タスクの詳細を表示する')
    .action(async (id: string) => {
      const formatter = new Formatter();
      try {
        validateTaskId(id);

        const storage = new FileStorage();
        const manager = new TaskManager(storage);
        const task = await manager.getTask(id);

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
