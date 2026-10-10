# GitHub Manual Sync Implementation Plan

> **Execution:** Implement task by task in the current worktree. Preserve existing user changes; do not commit unless requested.

**Goal:** Add opt-in, manual cross-device synchronization of personal study records through the existing public GitHub repository, without migrating legacy browser data.

**Architecture:** Keep the static single-page app and its local save path. Add a fixed-password UI gate, a versioned personal-data backup with stable record IDs and three-way merge, a GitHub REST client for `shy-sgsg/jingkao` on `sync-data`, and device-local token wrapping with a non-exportable Web Crypto key in IndexedDB. Only an explicit user sync action may read or write the GitHub backup; the user reviews the merge preview before any write.

**Tech Stack:** Existing vanilla JavaScript ES modules, Web Crypto, IndexedDB, GitHub REST API, Node built-in test runner. No runtime dependency or server.

**Spec:** `/home/shy/.codex/attachments/22900709-ad9c-439e-9c56-a54a3fa9e40c/pasted-text-1.txt`, with the user's current instruction to omit legacy data migration.

## Global Constraints

- Fixed site access password: `1234567890123`; it is a front-end gate, not server authentication.
- Use the existing public repository `shy-sgsg/jingkao`, branch `sync-data`, file `user-data/backup.json`.
- Do not migrate or restore legacy browser data as part of startup or synchronization.
- Local study changes save automatically; GitHub access occurs only after a user action in the sync panel.
- Never include the GitHub token, session credentials, or device key in source, build output, or backup JSON.
- A missing `sync-data` branch may be created only inside an explicitly confirmed manual sync.
- No new service, server, or runtime package.
- Keep existing learning, position, and planning features working.

## Review Focus

- Malformed or unsupported remote JSON must stop before local state changes or upload.
- Concurrent edits to one task must surface a field-level conflict; unrelated fields and new records should merge.
- Deleting a task on one device must not resurrect it on another device.
- Repeated sync must not duplicate attempts, sessions, or mock records or inflate accuracy.
- Missing, expired, under-scoped, rate-limited, or network-failed GitHub access must leave local records intact and show a useful message.

## Files and Responsibilities

- `src/app.js`: fixed-password gate, local record keying, sync panel and explicit user-confirmed flow.
- `src/data/sync.js`: schema validation, state projection, stable-ID three-way merge, tombstones, conflict resolution, and preview counts.
- `src/data/github.js`: Contents and Git References API calls, branch/file SHA handling, error mapping, and post-write verification.
- `src/data/githubTokenStore.js`: IndexedDB storage of a non-exportable AES-GCM key and wrapped per-device token; session-only fallback when IndexedDB is unavailable.
- `src/science/sessions.js`, `src/science/planTasks.js`: stable `attempt_id`, `session_id`, and `task_id` values for newly created records.
- `src/styles.css`: responsive sync panel and confirmation/conflict presentation.
- `test/sync.test.js`, `test/github.test.js`, `test/github-token-store.test.js`, and relevant existing account/UI tests: behavioral coverage.
- `docs/github-manual-sync/`: numbered project audit, architecture, storage, authorization, backup schema, sync and conflicts, legacy-data decision, security, test report, user guide, and acceptance record.

## Tasks

### Task 1: Fixed access gate and stable personal record keys

**Files:** `src/app.js`, `src/science/sessions.js`, `src/science/planTasks.js`, `test/account-ui.test.js`, focused session/task tests.

- [x] Add a test that the fixed password opens one local profile and a wrong password does not.
- [x] Remove registration, password creation, multi-profile selection, and migration UI; retain automatic local persistence and tab-session unlock.
- [x] Add stable aliases for attempts, exam/practice sessions, and plan tasks; key manual aptitude/essay logs by content identity, not array position.
- [x] Run focused tests and preserve unrelated existing worktree edits.

### Task 2: Versioned backup schema and three-way merge

**Files:** `src/data/sync.js`, `test/sync.test.js`.

- [x] Test schema validation, duplicate-ID rejection, independent additions, repeated sync, field-level task conflicts, deletion tombstones, and accurate result counts.
- [x] Include position filter and scenario preferences; accept earlier schema-v1 backups that omit this additive field.
- [x] Implement the JSON schema projection so only personal state is exported; exclude public dataset/question banks and local-only sync metadata.
- [x] Implement merge against the last-synced local baseline, recording deletions and returning unresolved conflicts without choosing silently.
- [x] Derive study summaries from the merged records saved by the application.

### Task 3: Device-local token and GitHub REST client

**Files:** `src/data/githubTokenStore.js`, `src/data/github.js`, `test/github-token-store.test.js`, `test/github.test.js`.

- [x] Test token round-trip without plaintext persistence, unauthenticated public reads, branch/file SHA handling, API error translation, conflict handling, and post-write verification.
- [x] Wrap the token with AES-GCM and a non-exportable device key persisted in IndexedDB; use page-memory fallback when durable device storage is unavailable.
- [x] Implement GET/PUT Contents calls and explicit creation of `sync-data` from the existing default branch only after confirmation.
- [x] Stop on malformed data, failed HTTP requests, SHA conflicts, and token/API failures; report when Token persistence falls back to page memory.

### Task 4: Manual sync UI and workflow

**Files:** `src/app.js`, `src/styles.css`, focused UI tests.

- [x] Test that startup and ordinary interaction make no GitHub request; only manual sync reads the remote.
- [x] Test local practice answers, timed exam submissions, and plan edits across app reloads.
- [x] Add the top navigation entry, sync panel, settings, local/cloud status, public-repository reminder, preview, conflict choices, confirmation, progress lock, and result summary.
- [x] Wire a single in-flight operation: read local and remote, validate, merge, preview, confirm, write with SHA, re-read/verify, then persist merged local data and baseline.
- [x] On cancel or failure, keep local state and baseline unchanged; require an explicit retry.
- [ ] Visually check mobile layout and touch target sizes; no graphical browser was available in this session.

### Task 5: Documentation and acceptance evidence

**Files:** `docs/github-manual-sync/*.md`.

- [x] Record the actual project/deployment audit and final architecture.
- [x] Document fixed password, local save behavior, token setup, backup schema, sync steps, conflicts, security boundaries, and plain-language user instructions, including the no-migration decision.
- [x] Run focused tests, the full existing suite, and the production build; record acceptance status with evidence.
- [x] Exercise two-device merge scenarios with isolated local states and a mocked GitHub API. No real repository writes or record uploads were made.

## Self-Review

- Coverage: all requested features are assigned above; legacy migration is excluded by the user's explicit correction.
- The deployment workflow already deploys only the default branch. `sync-data` pushes may run build checks but do not deploy; no workflow change is needed.
- The GitHub REST Contents and Git References APIs support the requested manual flow; the write token's repository permission is not branch-scoped.
- Existing working-tree changes (`test/gwyzwb-2026-yanqing.test.js`, `.aws`, and existing plans) are outside this plan and must be preserved.
- Full test result: 69/72 test files pass; three existing aptitude/position test files fail and the successful build is recorded in `docs/github-manual-sync/11_test_report.md`. Focused sync, account, and plan tests pass. Browser visual QA remains untested because no browser surface was available.
