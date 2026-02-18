import { describe, it, expect } from 'vitest';
import {
  validateTitle,
  validateDueDate,
  validateTaskId,
  validatePriority,
  validateStatus,
  validateSortField,
} from '../../../src/validators/taskValidators.js';
import { ValidationError } from '../../../src/types/index.js';

describe('validateTitle', () => {
  it('1文字のタイトルは有効', () => {
    expect(() => validateTitle('a')).not.toThrow();
  });

  it('200文字のタイトルは有効', () => {
    expect(() => validateTitle('a'.repeat(200))).not.toThrow();
  });

  it('空文字は ValidationError をスロー', () => {
    expect(() => validateTitle('')).toThrow(ValidationError);
  });

  it('201文字は ValidationError をスロー', () => {
    expect(() => validateTitle('a'.repeat(201))).toThrow(ValidationError);
  });

  it('エラーメッセージに文字数が含まれる（201文字超過の場合）', () => {
    expect(() => validateTitle('a'.repeat(201))).toThrow(/201/);
  });
});

describe('validateDueDate', () => {
  it('YYYY-MM-DD 形式は有効', () => {
    expect(() => validateDueDate('2026-12-31')).not.toThrow();
  });

  it('YYYYMMDD 形式は ValidationError をスロー', () => {
    expect(() => validateDueDate('20261231')).toThrow(ValidationError);
  });

  it('不正な形式（MM/DD/YYYY）は ValidationError をスロー', () => {
    expect(() => validateDueDate('12/31/2026')).toThrow(ValidationError);
  });

  it('空文字は ValidationError をスロー', () => {
    expect(() => validateDueDate('')).toThrow(ValidationError);
  });

  it('YYYY-MM-DD 形式でも無効な日付は ValidationError をスロー', () => {
    expect(() => validateDueDate('2026-13-01')).toThrow(ValidationError);
  });
});

describe('validatePriority', () => {
  it('"high" は有効', () => {
    expect(() => validatePriority('high')).not.toThrow();
  });

  it('"medium" は有効', () => {
    expect(() => validatePriority('medium')).not.toThrow();
  });

  it('"low" は有効', () => {
    expect(() => validatePriority('low')).not.toThrow();
  });

  it('無効な値は ValidationError をスロー', () => {
    expect(() => validatePriority('critical')).toThrow(ValidationError);
  });

  it('大文字は ValidationError をスロー', () => {
    expect(() => validatePriority('High')).toThrow(ValidationError);
  });
});

describe('validateTaskId', () => {
  it('正の整数文字列 "1" は有効', () => {
    expect(() => validateTaskId('1')).not.toThrow();
  });

  it('正の整数文字列 "999" は有効', () => {
    expect(() => validateTaskId('999')).not.toThrow();
  });

  it('"0" は ValidationError をスロー', () => {
    expect(() => validateTaskId('0')).toThrow(ValidationError);
  });

  it('負の整数は ValidationError をスロー', () => {
    expect(() => validateTaskId('-1')).toThrow(ValidationError);
  });

  it('小数は ValidationError をスロー', () => {
    expect(() => validateTaskId('1.5')).toThrow(ValidationError);
  });

  it('文字列は ValidationError をスロー', () => {
    expect(() => validateTaskId('abc')).toThrow(ValidationError);
  });

  it('空文字は ValidationError をスロー', () => {
    expect(() => validateTaskId('')).toThrow(ValidationError);
  });
});

describe('validateStatus', () => {
  it('"open" は有効', () => {
    expect(() => validateStatus('open')).not.toThrow();
  });

  it('"in_progress" は有効', () => {
    expect(() => validateStatus('in_progress')).not.toThrow();
  });

  it('"completed" は有効', () => {
    expect(() => validateStatus('completed')).not.toThrow();
  });

  it('"archived" は有効', () => {
    expect(() => validateStatus('archived')).not.toThrow();
  });

  it('無効な値は ValidationError をスロー', () => {
    expect(() => validateStatus('done')).toThrow(ValidationError);
  });
});

describe('validateSortField', () => {
  it('"id" は有効', () => {
    expect(() => validateSortField('id')).not.toThrow();
  });

  it('"priority" は有効', () => {
    expect(() => validateSortField('priority')).not.toThrow();
  });

  it('"dueDate" は有効', () => {
    expect(() => validateSortField('dueDate')).not.toThrow();
  });

  it('"createdAt" は有効', () => {
    expect(() => validateSortField('createdAt')).not.toThrow();
  });

  it('無効な値は ValidationError をスロー', () => {
    expect(() => validateSortField('title')).toThrow(ValidationError);
  });
});
