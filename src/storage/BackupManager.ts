import { copyFile, readdir, rm } from 'fs/promises';
import { join } from 'path';

const MAX_BACKUP_COUNT = 5;

export class BackupManager {
  constructor(private backupDir: string) {}

  async backup(sourceFile: string): Promise<void> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, (c) => (c === 'T' ? '-' : c === '-' ? '' : ''))
      .slice(0, 15);
    const filename = `tasks-${timestamp}.json`;
    const destPath = join(this.backupDir, filename);
    await copyFile(sourceFile, destPath);
    await this.cleanup();
  }

  async cleanup(): Promise<void> {
    const files = await readdir(this.backupDir);
    const backupFiles = files
      .filter((f) => f.startsWith('tasks-') && f.endsWith('.json'))
      .sort();

    if (backupFiles.length > MAX_BACKUP_COUNT) {
      const toDelete = backupFiles.slice(0, backupFiles.length - MAX_BACKUP_COUNT);
      for (const file of toDelete) {
        await rm(join(this.backupDir, file));
      }
    }
  }
}
