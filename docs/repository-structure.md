# リポジトリ構造定義書 (Repository Structure Document)

## プロジェクト構造

```
taskcli/
├── src/                          # ソースコード
│   ├── cli/                      # CLIレイヤー(ユーザー入力・表示)
│   │   ├── index.ts              # エントリーポイント、Commander.js初期化
│   │   ├── Formatter.ts          # テーブル表示・カラーリング
│   │   └── commands/             # 各サブコマンドのハンドラ
│   │       ├── add.ts
│   │       ├── list.ts
│   │       ├── show.ts
│   │       ├── start.ts
│   │       ├── done.ts
│   │       ├── delete.ts
│   │       └── search.ts
│   ├── services/                 # サービスレイヤー(ビジネスロジック)
│   │   ├── TaskManager.ts        # タスクCRUD・ステータス管理
│   │   ├── GitManager.ts         # Gitブランチ操作
│   │   └── GitHubClient.ts       # GitHub API連携(P1)
│   ├── storage/                  # ストレージレイヤー(データ永続化)
│   │   ├── FileStorage.ts        # JSONファイル読み書き
│   │   └── BackupManager.ts      # バックアップ管理
│   ├── validators/               # 入力バリデーション
│   │   └── taskValidators.ts     # タスク入力値の検証関数
│   └── types/                    # 共有型定義
│       └── index.ts              # Task, Config, TaskStatus 等
├── tests/                        # テストコード
│   ├── unit/                     # ユニットテスト
│   │   ├── services/
│   │   │   ├── TaskManager.test.ts
│   │   │   └── GitManager.test.ts
│   │   ├── storage/
│   │   │   ├── FileStorage.test.ts
│   │   │   └── BackupManager.test.ts
│   │   ├── cli/
│   │   │   └── Formatter.test.ts
│   │   └── validators/
│   │       └── taskValidators.test.ts
│   ├── integration/              # 統合テスト
│   │   └── task-crud/
│   │       └── task-lifecycle.test.ts
│   └── e2e/                      # E2Eテスト
│       └── user-workflow/
│           └── basic-flow.test.ts
├── docs/                         # プロジェクトドキュメント
│   ├── ideas/                    # 壁打ち・ブレインストーミング
│   │   └── initial-requirements.md
│   ├── product-requirements.md   # プロダクト要求定義書
│   ├── functional-design.md      # 機能設計書
│   ├── architecture.md           # アーキテクチャ設計書
│   ├── repository-structure.md   # 本ドキュメント
│   ├── development-guidelines.md # 開発ガイドライン
│   └── glossary.md               # 用語集
├── .steering/                    # 作業単位のドキュメント(履歴として保持)
│   └── YYYYMMDD-task-name/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
├── .claude/                      # Claude Code設定
│   ├── skills/                   # スキル定義
│   └── agents/                   # サブエージェント定義
├── .task/                        # タスクデータ(各リポジトリで独立)
│   ├── tasks.json
│   ├── config.json
│   └── backup/
├── package.json
├── tsconfig.json
├── jest.config.ts
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── README.md
└── CLAUDE.md                     # Claude Code用プロジェクトメモリ
```

---

## ディレクトリ詳細

### src/cli/ (CLIレイヤー)

**役割**: ユーザー入力の受付・バリデーション委譲・結果の表示。アーキテクチャのCLIレイヤーに対応。

**配置ファイル**:
- `index.ts`: Commander.jsの初期化、サブコマンドの登録、CLIの起動
- `Formatter.ts`: テーブル形式表示とカラーリングを担当するクラス
- `commands/*.ts`: 各サブコマンド(`add` / `list` / `show` / `start` / `done` / `delete` / `search`)のハンドラ関数

**命名規則**:
- クラスファイル: PascalCase（例: `Formatter.ts`）
- コマンドハンドラ: コマンド名と一致するkebab-caseまたはcamelCase（例: `add.ts`, `list.ts`）

**依存関係**:
- 依存可能: `src/services/`、`src/validators/`、`src/types/`
- 依存禁止: `src/storage/`（ストレージへの直接アクセス禁止）

**例**:
```
src/cli/
├── index.ts              # program.command('add').action(addHandler) 等
├── Formatter.ts          # formatTaskList(), formatTaskDetail()
└── commands/
    ├── add.ts            # export const addHandler: CommandHandler
    └── list.ts           # export const listHandler: CommandHandler
```

---

### src/services/ (サービスレイヤー)

**役割**: タスク管理のビジネスロジック実装、Git操作、GitHub API連携。アーキテクチャのサービスレイヤーに対応。

**配置ファイル**:
- `TaskManager.ts`: タスクのCRUD操作、ステータス遷移制御、IDの採番
- `GitManager.ts`: Gitリポジトリ検出、ブランチ作成・切り替え、ブランチ名生成
- `GitHubClient.ts`: GitHub REST APIによるIssues操作（P1機能）

**命名規則**:
- クラスファイル: PascalCase + 役割接尾辞（例: `TaskManager.ts`, `GitHubClient.ts`）

**依存関係**:
- 依存可能: `src/storage/`、`src/types/`、`src/validators/`
- 依存禁止: `src/cli/`（UIへの逆依存禁止）
- サービス間の循環依存禁止

**例**:
```
src/services/
├── TaskManager.ts        # class TaskManager { createTask(), listTasks(), ... }
├── GitManager.ts         # class GitManager { createAndSwitchBranch(), ... }
└── GitHubClient.ts       # class GitHubClient { listIssues(), ... }
```

---

### src/storage/ (ストレージレイヤー)

**役割**: JSONファイルへのデータ永続化とバックアップ管理。アーキテクチャのストレージレイヤーに対応。

**配置ファイル**:
- `FileStorage.ts`: `.task/tasks.json` と `.task/config.json` の読み書き
- `BackupManager.ts`: 書き込み前の自動バックアップと世代管理（最新5件）

**命名規則**:
- クラスファイル: PascalCase + 役割接尾辞（例: `FileStorage.ts`, `BackupManager.ts`）

**依存関係**:
- 依存可能: `src/types/`、Node.js `fs/promises`
- 依存禁止: `src/cli/`、`src/services/`（上位レイヤーへの依存禁止）

**例**:
```
src/storage/
├── FileStorage.ts        # class FileStorage implements IStorage
└── BackupManager.ts      # class BackupManager { backup(), cleanup() }
```

---

### src/validators/ (バリデーション)

**役割**: ユーザー入力値の検証。CLIレイヤーとサービスレイヤーの両方から利用される共有コンポーネント。

**配置ファイル**:
- `taskValidators.ts`: タスクタイトルの文字数チェック、日付形式チェック、ID形式チェック等の関数群

**命名規則**:
- 関数ファイル: camelCase（例: `taskValidators.ts`）
- 関数名: `validate` プレフィックス（例: `validateTitle`, `validateDueDate`）

**依存関係**:
- 依存可能: `src/types/`
- 依存禁止: `src/cli/`、`src/services/`、`src/storage/`

---

### src/types/ (共有型定義)

**役割**: 全レイヤーで共有するTypeScript型定義。循環依存を防ぐために独立したレイヤーとして管理。

**配置ファイル**:
- `index.ts`: `Task`、`Config`、`TaskStatus`、`TaskPriority`、`IStorage` 等の型・インターフェース定義

**命名規則**:
- 型定義ファイル: `index.ts` に集約（プロジェクト規模が小さいため）

**依存関係**:
- 依存可能: なし（他のモジュールに依存しない純粋な型定義）
- 依存禁止: 全モジュール

---

### tests/ (テストディレクトリ)

#### tests/unit/

**役割**: 単一クラス・関数のユニットテスト。外部依存はモックを使用。

**構造**:
```
tests/unit/
├── services/
│   ├── TaskManager.test.ts       # ビジネスロジックのテスト(FileStorage/GitManagerをモック)
│   └── GitManager.test.ts        # ブランチ名生成ロジックのテスト(simple-gitをモック)
├── storage/
│   ├── FileStorage.test.ts       # ファイルI/Oのテスト(fs/promisesをモック)
│   └── BackupManager.test.ts     # バックアップ生成・世代管理のテスト
├── cli/
│   └── Formatter.test.ts         # 出力フォーマットの文字列検証テスト
└── validators/
    └── taskValidators.test.ts    # 境界値テスト(空文字、200文字、201文字等)
```

**命名規則**: `[テスト対象ファイル名].test.ts`

#### tests/integration/

**役割**: 実際のファイルシステムを使った複数コンポーネントの結合テスト。

**構造**:
```
tests/integration/
└── task-crud/
    └── task-lifecycle.test.ts    # TaskManager + FileStorage の結合テスト
```

**命名規則**: `[機能名]-[シナリオ名].test.ts`（kebab-case）

#### tests/e2e/

**役割**: 実際のCLIコマンドを実行し、出力と副作用を検証するエンドツーエンドテスト。

**構造**:
```
tests/e2e/
└── user-workflow/
    └── basic-flow.test.ts        # add→list→start→done の一連フロー
```

**命名規則**: `[ユーザーシナリオ名].test.ts`（kebab-case）

---

### .task/ (タスクデータ)

**役割**: TaskCLI が管理するタスクデータの保存先。各プロジェクトリポジトリに独立して配置される。

**注意**: このディレクトリは `.gitignore` に追加することを推奨するが、チームで共有する場合はGitで管理することも可能（個人設定はリポジトリ外に保持）。

```
.task/
├── tasks.json            # タスクデータ本体
├── config.json           # ツール設定(nextId, defaultBranchPrefix等)
└── backup/               # 自動バックアップ(最新5件を保持)
    └── tasks-YYYYMMDD-HHmmss.json
```

---

## ファイル配置規則

### ソースファイル

| ファイル種別 | 配置先 | 命名規則 | 例 |
|------------|--------|---------|-----|
| CLIエントリーポイント | `src/cli/` | `index.ts` | `src/cli/index.ts` |
| コマンドハンドラ | `src/cli/commands/` | `[コマンド名].ts` | `add.ts`, `list.ts` |
| フォーマッター | `src/cli/` | `PascalCase.ts` | `Formatter.ts` |
| サービスクラス | `src/services/` | `PascalCase + Manager/Client.ts` | `TaskManager.ts` |
| ストレージクラス | `src/storage/` | `PascalCase + Storage/Manager.ts` | `FileStorage.ts` |
| バリデーション関数 | `src/validators/` | `camelCase + Validators.ts` | `taskValidators.ts` |
| 型定義 | `src/types/` | `index.ts` | `src/types/index.ts` |

### テストファイル

| テスト種別 | 配置先 | 命名規則 | 例 |
|-----------|--------|---------|-----|
| ユニットテスト | `tests/unit/[レイヤー]/` | `[対象クラス名].test.ts` | `TaskManager.test.ts` |
| 統合テスト | `tests/integration/[機能名]/` | `[シナリオ名].test.ts` | `task-lifecycle.test.ts` |
| E2Eテスト | `tests/e2e/[シナリオ名]/` | `[フロー名].test.ts` | `basic-flow.test.ts` |

### 設定ファイル（プロジェクトルート）

| ファイル種別 | ファイル名 |
|------------|-----------|
| TypeScript設定 | `tsconfig.json` |
| Jest設定 | `jest.config.ts` |
| ESLint設定 | `.eslintrc.json` |
| Prettier設定 | `.prettierrc` |
| Git除外設定 | `.gitignore` |
| npm設定 | `package.json` |
| CLIエントリーポイント(npm bin) | `package.json` の `bin` フィールドで `src/cli/index.ts` を指定 |

---

## 命名規則

### ディレクトリ名

- **レイヤーディレクトリ**: 複数形、kebab-case
  - 例: `services/`, `storage/`, `validators/`, `commands/`
- **テスト対象ディレクトリ**: srcと同じ構造でミラーリング
  - 例: `tests/unit/services/`

### ファイル名

- **クラスファイル**: PascalCase + 役割を示す接尾辞
  - 例: `TaskManager.ts`, `FileStorage.ts`, `BackupManager.ts`, `Formatter.ts`
- **関数ファイル**: camelCase + 動詞または役割で始める
  - 例: `taskValidators.ts`
- **型定義**: `index.ts`（集約）またはPascalCase
  - 例: `src/types/index.ts`
- **テストファイル**: `[対象].test.ts`
  - 例: `TaskManager.test.ts`, `basic-flow.test.ts`
- **設定ファイル**: ツールの規約に従う
  - 例: `jest.config.ts`, `.eslintrc.json`, `tsconfig.json`

### コード内の命名

- **クラス名**: PascalCase（例: `TaskManager`, `FileStorage`）
- **インターフェース名**: `I` プレフィックス + PascalCase（例: `IStorage`）
- **型エイリアス**: PascalCase（例: `TaskStatus`, `TaskPriority`）
- **関数名**: camelCase + 動詞で始める（例: `createTask`, `validateTitle`）
- **定数**: UPPER_SNAKE_CASE（例: `MAX_BACKUP_COUNT = 5`）
- **変数**: camelCase（例: `taskList`, `branchName`）

---

## 依存関係のルール

### レイヤー間の依存

```
src/cli/         (CLIレイヤー)
    ↓ OK
src/services/    (サービスレイヤー)
    ↓ OK
src/storage/     (ストレージレイヤー)

src/validators/  ← cli/ と services/ から参照可
src/types/       ← 全レイヤーから参照可
```

**禁止される依存**:
- `src/storage/` → `src/services/` (❌)
- `src/storage/` → `src/cli/` (❌)
- `src/services/` → `src/cli/` (❌)
- サービス間の循環依存 (❌)

### インポートパスの規約

```typescript
// ✅ 良い例: 相対パスを使用、上位レイヤーから下位レイヤーへ
// src/cli/commands/add.ts
import { TaskManager } from '../../services/TaskManager';
import { validateTitle } from '../../validators/taskValidators';
import type { Task } from '../../types';

// ❌ 悪い例: ストレージへの直接アクセス
// src/cli/commands/add.ts
import { FileStorage } from '../../storage/FileStorage'; // 禁止
```

---

## スケーリング戦略

### 機能追加時の方針

| 規模 | 対応方針 |
|------|---------|
| 小規模機能(ファイル1〜2個) | 既存ディレクトリ(`services/`等)に直接追加 |
| 中規模機能(ファイル3〜5個) | 既存ディレクトリ内にサブディレクトリを作成 |
| 大規模機能(ファイル6個以上) | `src/modules/[機能名]/` として独立したモジュールに分離 |

**中規模機能の例(チーム機能追加時)**:
```
src/services/
├── TaskManager.ts
├── GitManager.ts
└── team/                    # チーム機能のサブディレクトリ
    ├── TeamManager.ts
    ├── AssignmentService.ts
    └── TeamSyncService.ts
```

### ファイルサイズの管理

- **300行以下**: 推奨範囲
- **300〜500行**: リファクタリングを検討（クラスや関数の分割）
- **500行以上**: 強く分割を推奨

**分割例**:
```
# Before: TaskManager.ts が600行に成長した場合
src/services/TaskManager.ts  (600行)

# After: 責務ごとに分割
src/services/
├── TaskManager.ts           (200行) - CRUDとステータス管理
├── TaskFilterService.ts     (150行) - フィルタリング・検索
└── TaskIdService.ts         (100行) - ID採番管理
```

---

## 除外設定

### .gitignore

```gitignore
# 依存関係
node_modules/

# ビルド成果物
dist/

# 環境変数
.env
.env.local

# タスクデータ(プロジェクトポリシーによってはGit管理も可)
.task/

# ログ
*.log
npm-debug.log*

# OS固有ファイル
.DS_Store
Thumbs.db

# テストカバレッジ
coverage/

# TypeScriptビルドキャッシュ
*.tsbuildinfo
```

### .eslintignore / .prettierignore

```
dist/
node_modules/
coverage/
.steering/
```
