import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserDataBackup, mergeUserData, resolveUserDataConflicts, studyLogKey, validateUserDataBackup } from '../src/data/sync.js';

function makeBackup(data, options = {}) {
  return createUserDataBackup(data, {
    backupId: options.backupId || 'backup-test',
    updatedAt: options.updatedAt || '2026-10-09T00:00:00.000Z',
    tombstones: options.tombstones || [],
  });
}

test('backup schema includes stable task, session, and attempt identifiers and excludes device metadata', () => {
  const backup = makeBackup({
    studyPlanTasks: [{ id: 'task-1', title: '练习' }],
    scienceStudy: {
      sessions: [{ id: 'session-1', mode: 'exam' }],
      answers: [{ id: 'answer-1', sessionId: 'session-1', isCorrect: true }],
    },
    cloudSync: { token: 'MUST NOT BE BACKED UP', baseSnapshot: { secret: true } },
  });

  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.data.studyPlanTasks[0].task_id, 'task-1');
  assert.equal(backup.data.scienceStudy.sessions[0].session_id, 'session-1');
  assert.equal(backup.data.scienceStudy.answers[0].attempt_id, 'answer-1');
  assert.equal('cloudSync' in backup.data, false);
  assert.doesNotMatch(JSON.stringify(backup), /MUST NOT BE BACKED UP|secret/);
  assert.equal(validateUserDataBackup(backup).backupId, 'backup-test');
});

test('backup carries position filters and accepts older schema-1 files without them', () => {
  const backup = makeBackup({ positionPreferences: {
    filters: { districtId: 'changping', year: '2026', orgType: '街道' },
    jobSort: 'recruit-desc',
  } });

  assert.equal(backup.data.positionPreferences.filters.districtId, 'changping');
  assert.equal(backup.data.positionPreferences.filters.year, '2026');
  assert.equal(backup.data.positionPreferences.jobSort, 'recruit-desc');

  const olderBackup = makeBackup({});
  delete olderBackup.data.positionPreferences;
  const upgraded = validateUserDataBackup(olderBackup);
  assert.equal(upgraded.schemaVersion, 1);
  assert.equal(upgraded.data.positionPreferences.filters.districtId, 'all');
  assert.equal(upgraded.data.positionPreferences.jobSort, 'year-desc');
});

test('two devices merge distinct attempts and deduplicate their shared attempt ID', () => {
  const base = makeBackup({ scienceStudy: { sessions: [], answers: [] } });
  const local = makeBackup({ scienceStudy: { sessions: [], answers: [
    { id: 'attempt-local', questionId: 'q1', isCorrect: true },
    { id: 'attempt-shared', questionId: 'q2', isCorrect: false },
  ] } });
  const remote = makeBackup({ scienceStudy: { sessions: [], answers: [
    { id: 'attempt-remote', questionId: 'q3', isCorrect: true },
    { id: 'attempt-shared', questionId: 'q2', isCorrect: false },
  ] } });

  const result = mergeUserData({ base: base.data, local: local.data, remote: remote.data });
  const attempts = result.data.scienceStudy.answers;
  assert.deepEqual(attempts.map((answer) => answer.attempt_id).sort(), ['attempt-local', 'attempt-remote', 'attempt-shared']);
  assert.equal(attempts.length, 3);
  assert.deepEqual(result.conflicts, []);
});

test('pulling remote records preserves their stored order and does not create a needless write', () => {
  const local = makeBackup({});
  const remote = makeBackup({ scienceStudy: {
    sessions: [{ id: 'session-z', startedAt: '2026-10-09T09:00:00.000Z' }, { id: 'session-a', startedAt: '2026-10-09T10:00:00.000Z' }],
    answers: [{ id: 'attempt-z', questionId: 'q1' }, { id: 'attempt-a', questionId: 'q2' }],
  } });
  const merged = mergeUserData({ base: null, local: local.data, remote: remote.data });

  assert.deepEqual(
    merged.data.scienceStudy.answers.map((answer) => answer.attempt_id),
    remote.data.scienceStudy.answers.map((answer) => answer.attempt_id),
  );
  assert.deepEqual(
    merged.data.scienceStudy.sessions.map((session) => session.session_id),
    remote.data.scienceStudy.sessions.map((session) => session.session_id),
  );
});

test('new local records produce finite preview counts before the first sync', () => {
  const local = makeBackup({ mocks: [{ id: 'mock-new', exam: '模拟考试' }] });
  const empty = makeBackup({});
  const result = mergeUserData({ base: null, local: local.data, remote: empty.data });

  assert.equal(result.summary.localAdded, 1);
  assert.equal(result.summary.cloudAdded, 0);
  assert.equal(Number.isFinite(result.summary.updated), true);
  assert.equal(Number.isFinite(result.summary.deleted), true);
});

test('three-way merge combines independent fields and reports a same-field task conflict', () => {
  const base = makeBackup({ studyPlanTasks: [{ id: 'task-1', title: '每日练习', target: 10 }] });
  const local = makeBackup({ studyPlanTasks: [{ id: 'task-1', title: '每日练习', target: 20 }] });
  const remote = makeBackup({ studyPlanTasks: [{ id: 'task-1', title: '专练判断', target: 10 }] });
  const independent = mergeUserData({ base: base.data, local: local.data, remote: remote.data });

  assert.deepEqual(independent.data.studyPlanTasks[0], { id: 'task-1', task_id: 'task-1', title: '专练判断', target: 20 });
  assert.deepEqual(independent.conflicts, []);

  const otherDevice = makeBackup({ studyPlanTasks: [{ id: 'task-1', title: '每日练习', target: 15 }] });
  const conflicting = mergeUserData({ base: base.data, local: local.data, remote: otherDevice.data });
  assert.equal(conflicting.conflicts.length, 1);
  assert.equal(conflicting.conflicts[0].path, 'studyPlanTasks/task-1/target');
  assert.equal(conflicting.conflicts[0].local, 20);
  assert.equal(conflicting.conflicts[0].remote, 15);

  const resolved = resolveUserDataConflicts(conflicting, { [conflicting.conflicts[0].path]: 'remote' });
  assert.equal(resolved.data.studyPlanTasks[0].target, 15);
  assert.equal(resolved.resolvedConflicts, 1);
});

test('deletions become tombstones and remain deleted when another device still has the base copy', () => {
  const base = makeBackup({ studyPlanTasks: [{ id: 'task-delete', title: '删除我' }] });
  const local = makeBackup({ studyPlanTasks: [] });
  const remote = makeBackup({ studyPlanTasks: [{ id: 'task-delete', title: '删除我' }] });
  const deleted = mergeUserData({ base: base.data, local: local.data, remote: remote.data });

  assert.deepEqual(deleted.data.studyPlanTasks, []);
  assert.equal(deleted.tombstones.some((entry) => entry.collection === 'studyPlanTasks' && entry.id === 'task-delete'), true);

  const staleDevice = makeBackup({ studyPlanTasks: [{ id: 'task-delete', title: '删除我' }] });
  const syncedRemote = makeBackup(deleted.data, { tombstones: deleted.tombstones });
  const secondDevice = mergeUserData({
    base: base.data,
    local: staleDevice.data,
    remote: syncedRemote.data,
    remoteTombstones: syncedRemote.tombstones,
  });
  assert.deepEqual(secondDevice.data.studyPlanTasks, []);
});

test('invalid and unsupported remote backups are rejected before merge', () => {
  assert.throws(() => validateUserDataBackup({ schemaVersion: 99, data: {} }), /数据版本/);
  assert.throws(() => validateUserDataBackup({ schemaVersion: 1, backupId: 'bad', data: { studyPlanTasks: 'not-an-array' } }), /格式/);
});

test('manual aptitude and essay records use content identity instead of array position', () => {
  const aptitude = { area: '判断推理', item: '图形推理' };
  const essay = { area: '归纳概括', practice: '提炼主体、问题和措施' };
  assert.equal(studyLogKey('aptitude', aptitude), studyLogKey('aptitude', { ...aptitude }));
  assert.equal(studyLogKey('essay', essay), studyLogKey('essay', { ...essay }));
  assert.notEqual(studyLogKey('aptitude', aptitude), studyLogKey('aptitude', { area: '判断推理', item: '定义判断' }));
});
