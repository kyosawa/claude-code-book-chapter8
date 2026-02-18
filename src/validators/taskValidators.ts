import { ValidationError } from '../types/index.js';

export function validateTitle(title: string): void {
  if (title.length === 0) {
    throw new ValidationError('タイトルは1文字以上200文字以下で入力してください', 'title');
  }
  if (title.length > 200) {
    throw new ValidationError(
      `タイトルは200文字以内で入力してください（現在: ${title.length}文字）`,
      'title',
    );
  }
}

export function validateDueDate(date: string): void {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(date)) {
    throw new ValidationError(
      `期限の形式が正しくありません。YYYY-MM-DD 形式で入力してください（例: 2026-12-31）`,
      'dueDate',
    );
  }
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`期限に無効な日付が指定されています: ${date}`, 'dueDate');
  }
}

export function validateTaskId(id: string): void {
  const num = parseInt(id, 10);
  if (isNaN(num) || num <= 0 || String(num) !== id) {
    throw new ValidationError(
      `タスクIDは正の整数で指定してください（例: 1, 2, 3）`,
      'id',
    );
  }
}

export function validatePriority(priority: string): void {
  const valid = ['high', 'medium', 'low'];
  if (!valid.includes(priority)) {
    throw new ValidationError(
      `優先度は high / medium / low のいずれかを指定してください`,
      'priority',
    );
  }
}
