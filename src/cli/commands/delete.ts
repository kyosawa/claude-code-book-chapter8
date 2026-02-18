import { Command } from 'commander';
import { TaskManager } from '../../services/TaskManager.js';
import { FileStorage } from '../../storage/FileStorage.js';
import { Formatter } from '../Formatter.js';
import { validateTaskId } from '../../validators/taskValidators.js';
import { TaskCLIError } from '../../types/index.js';
import inquirer from 'inquirer';

export function registerDeleteCommand(program: Command): void {
  program
    .command('delete <id>')
    .description('タスクを削除する（確認プロンプト付き）')
    .option('-y, --yes', '確認プロンプトをスキップ')
    .action(async (id: string, options: { yes?: boolean }) => {
      const formatter = new Formatter();
      try {
        validateTaskId(id);

        if (!options.yes) {
          const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
            {
              type: 'confirm',
              name: 'confirmed',
              message: `タスク #${id} を削除しますか? この操作は元に戻せません。`,
              default: false,
            },
          ]);
          if (!confirmed) {
            console.log('キャンセルしました');
            return;
          }
        }

        const storage = new FileStorage();
        const manager = new TaskManager(storage);
        await manager.deleteTask(id);

        console.log(formatter.formatSuccess(`タスク #${id} を削除しました`));
      } catch (err) {
        if (err instanceof TaskCLIError) {
          console.error(formatter.formatError(err.message));
          process.exit(err.exitCode);
        }
        throw err;
      }
    });
}
