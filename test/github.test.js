import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserDataBackup } from '../src/data/sync.js';
import { createSyncBranch, readRemoteBackup, writeUserDataBackup } from '../src/data/github.js';

const backup = createUserDataBackup({ scienceStudy: { sessions: [], answers: [{ id: 'attempt-1', questionId: 'q1' }] } }, {
  backupId: 'test-backup', updatedAt: '2026-10-09T01:00:00.000Z',
});

function response(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] || null },
    json: async () => body,
  };
}

function fileContents(value, sha = 'file-sha') {
  return { sha, encoding: 'base64', content: Buffer.from(JSON.stringify(value)).toString('base64') };
}

test('public remote reads are explicit, unauthenticated, and decode the backup file', async () => {
  const calls = [];
  const result = await readRemoteBackup({ fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/branches/sync-data')) return response(200, { name: 'sync-data' });
    return response(200, fileContents(backup));
  } });

  assert.equal(result.branchExists, true);
  assert.equal(result.sha, 'file-sha');
  assert.equal(result.backup.backupId, 'test-backup');
  assert.equal(calls.length, 2);
  assert.equal(calls.some(({ options }) => options.headers?.Authorization), false);
});

test('a missing data branch is reported without attempting a file read', async () => {
  const calls = [];
  const result = await readRemoteBackup({ fetchImpl: async (url) => {
    calls.push(String(url));
    return response(404, { message: 'Not Found' });
  } });
  assert.deepEqual(result, { branchExists: false, backup: null, sha: null });
  assert.equal(calls.length, 1);
});

test('branch initialization uses the existing default branch and requires the user token', async () => {
  const calls = [];
  const result = await createSyncBranch({ token: 'private-test-token', fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return String(url).endsWith('/branches/main')
      ? response(200, { commit: { sha: 'main-sha' } })
      : response(201, { ref: 'refs/heads/sync-data' });
  } });
  assert.deepEqual(result, { branch: 'sync-data' });
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-test-token');
  assert.deepEqual(JSON.parse(calls[1].options.body), { ref: 'refs/heads/sync-data', sha: 'main-sha' });
});

test('upload uses the reviewed file SHA and verifies the resulting remote backup', async () => {
  const calls = [];
  const result = await writeUserDataBackup({ backup, token: 'private-test-token', sha: 'reviewed-sha', fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    if (options.method === 'PUT') return response(200, { content: { sha: 'written-sha' }, commit: { sha: 'commit-sha' } });
    if (String(url).includes('/branches/sync-data')) return response(200, { name: 'sync-data' });
    return response(200, fileContents(backup, 'written-sha'));
  } });

  const upload = calls[0];
  const body = JSON.parse(upload.options.body);
  assert.equal(upload.options.method, 'PUT');
  assert.equal(body.branch, 'sync-data');
  assert.equal(body.sha, 'reviewed-sha');
  assert.deepEqual(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')), backup);
  assert.equal(result.verified, true);
  assert.equal(result.fileSha, 'written-sha');
  assert.equal(result.commitSha, 'commit-sha');
});

test('conflict and authorization failures return distinct actionable errors', async () => {
  await assert.rejects(
    writeUserDataBackup({ backup, token: 'token', sha: 'old-sha', fetchImpl: async () => response(409, { message: 'Conflict' }) }),
    (error) => error.code === 'conflict' && /重新读取云端/.test(error.message),
  );
  await assert.rejects(
    createSyncBranch({ token: 'expired-token', fetchImpl: async () => response(401, { message: 'Bad credentials' }) }),
    (error) => error.code === 'unauthorized' && /重新配置/.test(error.message),
  );
});

test('network failures are reported without claiming an upload succeeded', async () => {
  await assert.rejects(
    readRemoteBackup({ fetchImpl: async () => { throw new TypeError('offline'); } }),
    (error) => error.code === 'network' && /网络/.test(error.message),
  );
});
