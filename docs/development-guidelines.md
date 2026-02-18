# 開発ガイドライン (Development Guidelines)

## コーディング規約

### 命名規則

#### 変数・関数

```typescript
// ✅ 良い例: 役割が明確な名前
const taskList = await taskManager.listTasks();
const isGitRepository = await gitManager.isGitRepository();
function generateBranchName(task: Task): string { }
function validateTitle(title: string): void { }

// ❌ 悪い例: 曖昧な名前
const data = await get();
const flag = await check();
function gen(t: Task): string { }
```

**原則**:
- 変数: `camelCase`、名詞または名詞句（例: `taskList`, `branchName`, `nextId`）
- 関数: `camelCase`、動詞で始める（例: `createTask`, `validateTitle`, `generateBranchName`）
- 定数: `UPPER_SNAKE_CASE`（例: `MAX_BACKUP_COUNT`, `DEFAULT_BRANCH_PREFIX`）
- Boolean変数: `is`, `has`, `should`, `can` で始める（例: `isCompleted`, `hasGitRepo`）

#### クラス・インターフェース・型

```typescript
// クラス: PascalCase + 役割を示す接尾辞
class TaskManager { }
class FileStorage { }
class BackupManager { }
class GitHubClient { }

// インターフェース: I プレフィックス + PascalCase
interface IStorage {
  readTasks(): Promise<Task[]>;
  writeTasks(tasks: Task[]): Promise<void>;
}

// 型エイリアス: PascalCase
type TaskStatus = 'open' | 'in_progress' | 'completed' | 'archived';
type TaskPriority = 'high' | 'medium' | 'low';
```

### コードフォーマット

- **インデント**: 2スペース
- **行の長さ**: 最大100文字
- **セミコロン**: あり
- **クォート**: シングルクォート（`'`）
- **末尾カンマ**: あり（`trailing comma: 'all'`）

Prettierによる自動フォーマットを必須とする。設定は `.prettierrc` を参照。

```typescript
// ✅ 良い例: フォーマット済みコード
async function createTask(
  data: CreateTaskInput,
  options?: TaskOptions,
): Promise<Task> {
  const task: Task = {
    id: String(config.nextId),
    title: data.title,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return task;
}
```

### コメント規約

**関数・クラスのTSDocコメント**（複雑な処理や公開APIに記述）:
```typescript
/**
 * タスクを開始し、対応するGitブランチを作成する
 *
 * @param id - 開始するタスクのID
 * @returns ステータスが in_progress に更新されたタスク
 * @throws {NotFoundError} 指定IDのタスクが存在しない場合
 * @throws {GitError} ブランチ作成に失敗した場合（タスクのステータス変更はロールバック）
 */
async function startTask(id: string): Promise<Task> { }
```

**インラインコメント**（「なぜ」を説明する):
```typescript
// ✅ 良い例: 理由を説明
// Git操作が失敗した場合にタスクのステータス変更をロールバックするため、
// ブランチ作成の前にステータスを変更しない
const branchName = gitManager.generateBranchName(task);
await gitManager.createAndSwitchBranch(branchName);
task.status = 'in_progress';

// ❌ 悪い例: コードの内容を繰り返すだけ
// ステータスをin_progressに設定する
task.status = 'in_progress';
```

**コメントアウトされたコードは残さない**。不要なコードは削除し、履歴はGitで管理する。

### エラーハンドリング

**カスタムエラークラス**:
```typescript
// src/types/index.ts に定義
class TaskCLIError extends Error {
  constructor(message: string, public exitCode: number) {
    super(message);
    this.name = 'TaskCLIError';
  }
}

class NotFoundError extends TaskCLIError {
  constructor(resource: string, id: string) {
    super(`${resource} #${id} が見つかりません`, 2);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends TaskCLIError {
  constructor(message: string, public field: string) {
    super(message, 1);
    this.name = 'ValidationError';
  }
}

class GitError extends TaskCLIError {
  constructor(message: string, public cause?: Error) {
    super(message, 3);
    this.name = 'GitError';
  }
}
```

**エラーハンドリングの原則**:
```typescript
// ✅ 良い例: 予期されるエラーを適切に処理
async function startTask(id: string): Promise<Task> {
  const task = await fileStorage.readTasks().then(tasks =>
    tasks.find(t => t.id === id)
  );

  if (!task) {
    throw new NotFoundError('タスク', id);  // 予期されるエラー: 適切なクラスで投げる
  }

  if (task.status !== 'open') {
    throw new ValidationError(
      `${task.status} のタスクは start できません`,
      'status'
    );
  }

  try {
    await gitManager.createAndSwitchBranch(branchName);
  } catch (error) {
    // Git操作失敗: ラップして詳細を保持
    throw new GitError('ブランチの作成に失敗しました', error as Error);
  }

  return task;
}

// CLIレイヤーでまとめてキャッチ
try {
  const task = await taskManager.startTask(id);
  console.log(formatter.formatSuccess(`タスク #${id} を開始しました`));
} catch (error) {
  if (error instanceof TaskCLIError) {
    console.error(formatter.formatError(error.message));
    process.exit(error.exitCode);
  }
  throw error; // 予期しないエラーは上位に伝播
}
```

### 型定義

**`any` は使用禁止**。型が不明な場合は `unknown` を使用:
```typescript
// ❌ 悪い例
function parseData(data: any): Task { }

// ✅ 良い例
function parseData(data: unknown): Task {
  if (!isTask(data)) throw new ValidationError('不正なデータ形式', 'data');
  return data;
}
```

**型アサーションは最小限に**。型ガードを優先:
```typescript
// ✅ 良い例: 型ガード関数
function isTask(value: unknown): value is Task {
  return typeof value === 'object' && value !== null && 'id' in value;
}
```

### 非同期処理

**`async/await` を使用**（`Promise` チェーンは避ける）:
```typescript
// ✅ 良い例
async function readAndFilterTasks(status: TaskStatus): Promise<Task[]> {
  const tasks = await fileStorage.readTasks();
  return tasks.filter(t => t.status === status);
}

// ❌ 悪い例
function readAndFilterTasks(status: TaskStatus): Promise<Task[]> {
  return fileStorage.readTasks().then(tasks =>
    tasks.filter(t => t.status === status)
  );
}
```

---

## Git運用ルール

### ブランチ戦略（Git Flow採用）

```
main (本番リリース済みの安定版)
└── develop (次期リリースに向けた統合ブランチ)
    ├── feature/* (新機能開発)
    ├── fix/*     (バグ修正)
    └── docs/*    (ドキュメントのみの変更)
```

**ブランチ命名規則**:
| 種別 | パターン | 例 |
|------|---------|-----|
| 新機能 | `feature/[機能名]` | `feature/github-issues-sync` |
| バグ修正 | `fix/[修正内容]` | `fix/branch-name-encoding` |
| リファクタリング | `refactor/[対象]` | `refactor/file-storage` |
| ドキュメント | `docs/[対象]` | `docs/update-readme` |

**運用ルール**:
- `main` / `develop` への直接コミット禁止。必ずPRを経由する
- `feature/*` / `fix/*` は `develop` から分岐し、PRで `develop` へマージ
- `develop` → `main` へのマージはリリース時のみ
- マージ方針: `feature` → `develop` は squash merge、`develop` → `main` は merge commit

### コミットメッセージ規約（Conventional Commits）

**フォーマット**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type一覧**:
| Type | 用途 |
|------|------|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントの変更 |
| `style` | コードフォーマットの変更（動作に影響なし） |
| `refactor` | リファクタリング（機能追加・バグ修正なし） |
| `test` | テストの追加・修正 |
| `chore` | ビルド設定・依存関係の更新など |
| `perf` | パフォーマンス改善 |

**良いコミットメッセージの例**:
```
feat(task): task start コマンドでGitブランチを自動作成する機能を追加

task start <id> を実行すると、タスクに紐付いたブランチが
自動作成・切り替えされるようになりました。

実装内容:
- GitManager クラスの追加 (simple-git を使用)
- ブランチ名生成ロジック: feature/task-<id>-<slug>
- Gitリポジトリが存在しない場合はブランチ作成をスキップ

Closes #5
```

**Subject行の原則**:
- 50文字以内（最大72文字）
- 日本語で記述
- 命令形で記述（「追加する」「修正する」「削除する」）

### プルリクエストプロセス

**作成前チェックリスト**:
- [ ] `npm run lint` がパス
- [ ] `npm run typecheck` がパス
- [ ] `npm test` が全てパス
- [ ] コンフリクトが解決済み
- [ ] セルフレビュー実施済み

**PRテンプレート** (`.github/pull_request_template.md`):
```markdown
## 変更の種類
- [ ] 新機能 (feat)
- [ ] バグ修正 (fix)
- [ ] リファクタリング (refactor)
- [ ] ドキュメント (docs)
- [ ] その他 (chore)

## 変更内容
### 何を変更したか
[簡潔な説明]

### なぜ変更したか
[背景・理由]

### どのように変更したか
- [変更点1]
- [変更点2]

## テスト
### 実施したテスト
- [ ] ユニットテスト追加
- [ ] 手動テスト実施

### テスト結果
[テスト結果の説明または `npm test` の出力]

## 関連Issue
Closes #[番号]

## レビューポイント
[特に見てほしい点]
```

**PRサイズの目安**:
- 小規模（推奨）: 変更行数100行以内、15分でレビュー完了
- 中規模: 変更行数100〜300行、30分でレビュー完了
- 大規模（要分割検討）: 変更行数300行超、1時間以上

---

## テスト戦略

### テストピラミッド

```
       /\
      /E2E\       少 (遅い・高コスト): 主要ユーザーフローのみ
     /------\
    / 統合   \    中: 複数コンポーネントの連携確認
   /----------\
  / ユニット   \  多 (速い・低コスト): 全ビジネスロジックをカバー
 /--------------\
```

**目標比率**: ユニット70% / 統合20% / E2E10%

### カバレッジ目標

| 対象 | 目標カバレッジ | 理由 |
|------|-------------|------|
| `src/services/` | 90%以上 | ビジネスロジックの中核 |
| `src/storage/` | 80%以上 | データ永続化の信頼性 |
| `src/validators/` | 100% | 境界値を全てカバー |
| `src/cli/` | 60%以上 | 表示ロジックはE2Eで補完 |
| 全体 | 80%以上 | - |

### テストの書き方（Given-When-Then）

```typescript
describe('TaskManager', () => {
  describe('createTask', () => {
    it('正常なタイトルでタスクを作成できる', async () => {
      // Given: 準備
      const mockStorage = createMockStorage([]);
      const manager = new TaskManager(mockStorage, mockGitManager);
      const input: CreateTaskInput = { title: 'ユーザー認証の実装' };

      // When: 実行
      const task = await manager.createTask(input);

      // Then: 検証
      expect(task.id).toBe('1');
      expect(task.title).toBe('ユーザー認証の実装');
      expect(task.status).toBe('open');
      expect(task.createdAt).toBeDefined();
    });

    it('タイトルが空文字の場合 ValidationError をスローする', async () => {
      // Given
      const manager = new TaskManager(mockStorage, mockGitManager);

      // When/Then
      await expect(
        manager.createTask({ title: '' })
      ).rejects.toThrow(ValidationError);
    });

    it('タイトルが201文字の場合 ValidationError をスローする', async () => {
      // Given
      const manager = new TaskManager(mockStorage, mockGitManager);
      const longTitle = 'a'.repeat(201);

      // When/Then
      await expect(
        manager.createTask({ title: longTitle })
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

**テスト命名規則**: `[条件]_[期待結果]` または日本語の自然な文章形式
```typescript
// どちらも許容
it('空のタイトルの場合_ValidationErrorをスロー', ...);
it('タイトルが空の場合、ValidationError をスローする', ...);
```

### モックの使用方針

- **外部依存（ファイルシステム・Git・GitHub API）**: モック化必須
- **ビジネスロジック（サービスクラス）**: 実際の実装を使用

```typescript
// ✅ 良い例: IStorage インターフェースに基づくモック
function createMockStorage(initialTasks: Task[]): IStorage {
  const tasks = [...initialTasks];
  return {
    readTasks: jest.fn().mockResolvedValue(tasks),
    writeTasks: jest.fn().mockImplementation(async (t: Task[]) => {
      tasks.splice(0, tasks.length, ...t);
    }),
    readConfig: jest.fn().mockResolvedValue({ version: '1.0.0', nextId: 1, defaultBranchPrefix: 'feature/task-' }),
    writeConfig: jest.fn().mockResolvedValue(undefined),
  };
}
```

---

## コードレビュー基準

### レビューポイント

**機能性**:
- [ ] PRDとの要件整合性
- [ ] エッジケース（空文字、境界値、Gitリポジトリなし環境等）が考慮されているか
- [ ] エラーハンドリングが適切か（ロールバックが必要な処理に実装されているか）

**可読性**:
- [ ] 命名規則に従っているか
- [ ] 複雑なロジックにコメントがあるか
- [ ] 関数が適切なサイズ（50行以内が目安）か

**保守性**:
- [ ] レイヤー間の依存方向が守られているか（CLI→Service→Storageの一方向）
- [ ] 循環依存がないか
- [ ] 重複コードがないか

**セキュリティ**:
- [ ] 入力検証が実装されているか（`src/validators/` を使用しているか）
- [ ] GitHub Tokenが環境変数から取得されているか
- [ ] ブランチ名がサニタイズされているか

**テスト**:
- [ ] ユニットテストが追加されているか
- [ ] 境界値テストがあるか

### レビューコメントの書き方

**優先度を明示する**:
```markdown
[必須] セキュリティ: ブランチ名の生成でサニタイズが不足しています。
`/[^\w-/]/g` で記号を除去してください。

[推奨] 可読性: この条件式は複雑なので、変数に抽出することを検討してください:
```typescript
const isCompletedOrArchived = task.status === 'completed' || task.status === 'archived';
if (isCompletedOrArchived) { ... }
```

[提案] パフォーマンス: 大量タスク時に毎回全件読み込みが発生します。
将来的にキャッシュを検討できそうです。（今すぐでなくてOK）

[質問] このロールバック処理が必要なケースを教えてください。
```

**ポジティブなフィードバックも忘れずに**:
```markdown
✅ エラーメッセージが具体的で分かりやすいです！
👍 Gitリポジトリなし環境でのフォールバック処理がきれいですね。
```

---

## 開発環境セットアップ

### 必要なツール

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| Node.js | v18以上 (v24推奨) | [nodejs.org](https://nodejs.org/) または nvm |
| npm | v9以上 | Node.jsに同梱 |
| Git | v2.30以上 | [git-scm.com](https://git-scm.com/) |

### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone <リポジトリURL>
cd taskcli

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定（GitHub連携を使う場合）
export TASKCLI_GITHUB_TOKEN="your_personal_access_token"

# 4. 開発用コマンドの確認
npm run build      # TypeScriptのコンパイル
npm run lint       # ESLintチェック
npm run typecheck  # 型チェックのみ
npm test           # テスト実行
npm run test:watch # テストのウォッチモード

# 5. ローカルでのCLI実行（開発時）
npx tsx src/cli/index.ts add "テストタスク"
```

### package.json スクリプト定義

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli/index.ts",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepare": "husky"
  }
}
```

### 推奨VSCode拡張

- **ESLint** (`dbaeumer.vscode-eslint`): リアルタイムLintチェック
- **Prettier** (`esbenp.prettier-vscode`): 保存時自動フォーマット
- **TypeScript Error Translator** (`mattpocock.ts-error-translator`): エラーメッセージをわかりやすく表示

---

## 品質チェックの自動化

### Pre-commitフック（Husky + lint-staged）

コミット前に自動でLint・フォーマット・型チェックを実行する:

```bash
# .husky/pre-commit
npm run lint-staged
npm run typecheck
```

```json
// package.json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### CI/CDパイプライン（GitHub Actions）

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build
```

---

## 実装完了チェックリスト

実装・PR作成前に以下を全て確認すること:

### コード品質
- [ ] 命名規則に従っている（camelCase, PascalCase, UPPER_SNAKE_CASE）
- [ ] `any` 型を使用していない
- [ ] マジックナンバーを使用していない（定数に抽出）
- [ ] 関数が50行以内（超える場合は分割を検討）
- [ ] エラーハンドリングが実装されている

### アーキテクチャ
- [ ] レイヤー間の依存方向が守られている（CLI→Service→Storage）
- [ ] CLIレイヤーからStorageへの直接アクセスがない
- [ ] 循環依存がない

### セキュリティ
- [ ] ユーザー入力が `src/validators/` でバリデートされている
- [ ] ブランチ名生成時に記号のサニタイズが実装されている
- [ ] 機密情報がハードコードされていない

### テスト
- [ ] ユニットテストが追加されている
- [ ] 正常系・異常系・境界値のテストが揃っている
- [ ] `npm test` が全てパスする

### ツール
- [ ] `npm run lint` がパス（Lintエラーなし）
- [ ] `npm run typecheck` がパス（型エラーなし）
- [ ] `npm run format` を実行してフォーマット統一済み
