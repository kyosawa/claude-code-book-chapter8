import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerAddCommand } from './commands/add.js';
import { registerListCommand } from './commands/list.js';
import { registerShowCommand } from './commands/show.js';
import { registerStartCommand } from './commands/start.js';
import { registerDoneCommand } from './commands/done.js';
import { registerArchiveCommand } from './commands/archive.js';
import { registerDeleteCommand } from './commands/delete.js';

async function getVersion(): Promise<string> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pkgPath = join(__dirname, '../../package.json');
    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

async function main(): Promise<void> {
  const version = await getVersion();
  const program = new Command();

  program
    .name('task')
    .description('開発者向けタスク管理CLIツール')
    .version(version);

  registerAddCommand(program);
  registerListCommand(program);
  registerShowCommand(program);
  registerStartCommand(program);
  registerDoneCommand(program);
  registerArchiveCommand(program);
  registerDeleteCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
