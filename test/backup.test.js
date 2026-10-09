import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  createEncryptedUserBackup,
  createUserBackup,
  parseEncryptedUserBackup,
  parseUserBackup,
} from '../src/data/backup.js';
import { createEncryptedAccount, unlockEncryptedAccount } from '../src/data/encryptedStore.js';

const state = {
  profile: { major: '公共管理', degree: '硕士' },
  dayLogs: { 1: { actualQuestions: 40, status: '已完成' } },
  planOverrides: { 1: { focus: '错题复盘', plannedQuestions: 60 } },
  studyPlanTasks: [{ id: 'task-a', date: '2026-10-09', taskType: 'science_reasoning', title: '浮力专项练习' }],
  scienceStudy: {
    knowledgeProgress: { 'physics:buoyancy': { status: 'learning' } },
    sessions: [{ id: 'session-a', mode: 'practice', planTaskId: 'task-a' }],
    answers: [{ id: 'answer-a', sessionId: 'session-a', questionId: 'q-a' }],
    mistakes: { 'q-a': { count: 1 } },
    favorites: ['q-b'],
  },
  aptitudeLogs: {}, essayLogs: {},
  mocks: [{ aptitude: 72, essay: 68, total: 140, date: '2026-10-08' }],
  favorites: ['231260001'], compared: ['231260001'],
  settings: { density: 'compact', fontSize: 'large', motion: 'immersive' },
  onboarding: { step: 0, hidden: true, completed: true },
};

test('personal-data backup round-trips without changing user records', () => {
  const backup = createUserBackup(state, '2026-10-08T08:00:00.000Z');
  const parsed = parseUserBackup(JSON.stringify(backup));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.state, state);
  assert.equal(parsed.exportedAt, '2026-10-08T08:00:00.000Z');
});

test('restore rejects unknown backup formats and structurally invalid records', () => {
  assert.equal(parseUserBackup('{broken').ok, false);
  assert.equal(parseUserBackup(JSON.stringify({ format: 'other', version: 1, data: state })).ok, false);
  assert.equal(parseUserBackup(JSON.stringify({ ...createUserBackup(state), data: { ...state, compared: ['1', '2', '3', '4', '5', '6'] } })).ok, false);
});

test('restore rejects mock scores that are not actual numeric records', () => {
  const invalid = { ...state, mocks: [{ aptitude: 72, essay: 68, total: null }] };
  assert.equal(parseUserBackup(JSON.stringify(createUserBackup(invalid))).ok, false);
});

test('older personal backups remain importable and receive empty plan edits and default display settings', () => {
  const { planOverrides, settings, studyPlanTasks, scienceStudy, ...olderState } = state;
  const parsed = parseUserBackup(createUserBackup(olderState));

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.state.planOverrides, {});
  assert.deepEqual(parsed.state.studyPlanTasks, []);
  assert.deepEqual(parsed.state.scienceStudy, {
    knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
  });
  assert.deepEqual(parsed.state.settings, { density: 'comfortable', fontSize: 'standard', motion: 'enhanced' });
});

test('personal backups preserve science plan and learning records and reject malformed science collections', () => {
  const parsed = parseUserBackup(createUserBackup(state));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.state.studyPlanTasks, state.studyPlanTasks);
  assert.deepEqual(parsed.state.scienceStudy, state.scienceStudy);

  const malformed = { ...state, scienceStudy: { ...state.scienceStudy, answers: 'not-an-array' } };
  assert.equal(parseUserBackup(createUserBackup(malformed)).ok, false);
});

test('encrypted backup contains only an anonymous account ID and opaque ciphertext', () => {
  const backup = createEncryptedUserBackup({
    id: 'abcdefghijklmnop-qrstuv',
    envelope: {
      version: 1,
      kdf: 'PBKDF2-SHA-256',
      iterations: 600000,
      cipher: 'AES-GCM-256',
      salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
      iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  }, '2026-10-08T08:00:00.000Z');
  const serialized = JSON.stringify(backup);
  const parsed = parseEncryptedUserBackup(serialized);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.id, 'abcdefghijklmnop-qrstuv');
  assert.equal(parsed.envelope.ciphertext, backup.data.envelope.ciphertext);
  assert.equal(backup.format, 'changping-jingkao-dashboard-encrypted-user-data');
  assert.equal(backup.version, 1);
  for (const privateValue of ['公共管理', 'PROFILE ALPHA', 'PRIVATE PLAN NOTE', 'correct horse battery staple']) {
    assert.equal(serialized.includes(privateValue), false);
  }
});

test('encrypted backup parser rejects unknown formats, versions and malformed envelopes', () => {
  const valid = createEncryptedUserBackup({
    id: 'abcdefghijklmnop-qrstuv',
    envelope: {
      version: 1, kdf: 'PBKDF2-SHA-256', iterations: 600000, cipher: 'AES-GCM-256',
      salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  });
  assert.equal(parseEncryptedUserBackup('{broken').ok, false);
  assert.equal(parseEncryptedUserBackup({ ...valid, format: 'other' }).ok, false);
  assert.equal(parseEncryptedUserBackup({ ...valid, version: 2 }).ok, false);
  assert.equal(parseEncryptedUserBackup({ ...valid, data: { ...valid.data, envelope: { ...valid.data.envelope, version: 99 } } }).ok, false);
  assert.equal(parseEncryptedUserBackup({ ...valid, data: { ...valid.data, envelope: { ...valid.data.envelope, name: 'LEAKED NAME' } } }).ok, false);
});

test('legacy JSON backups remain explicitly distinguishable from encrypted backups', () => {
  const legacy = createUserBackup(state);
  const encrypted = createEncryptedUserBackup({
    id: 'abcdefghijklmnop-qrstuv',
    envelope: {
      version: 1, kdf: 'PBKDF2-SHA-256', iterations: 600000, cipher: 'AES-GCM-256',
      salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iv: 'AAAAAAAAAAAAAAAA',
      ciphertext: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    },
  });

  assert.equal(parseUserBackup(legacy).ok, true);
  assert.equal(parseUserBackup(encrypted).ok, false);
  assert.equal(parseEncryptedUserBackup(legacy).ok, false);
});

test('structurally valid ciphertext tampering is rejected when the encrypted backup is unlocked', async () => {
  const { id, envelope } = await createEncryptedAccount({
    name: 'PRIVATE BACKUP PROFILE', password: 'backup passphrase', state, cryptoApi: webcrypto,
  });
  const backup = createEncryptedUserBackup({ id, envelope });
  const ciphertext = Buffer.from(backup.data.envelope.ciphertext, 'base64');
  ciphertext[0] ^= 1;
  const tampered = {
    ...backup,
    data: { ...backup.data, envelope: { ...backup.data.envelope, ciphertext: ciphertext.toString('base64') } },
  };
  const parsed = parseEncryptedUserBackup(tampered);

  assert.equal(parsed.ok, true, 'parsing only checks the encrypted backup structure');
  await assert.rejects(unlockEncryptedAccount({ ...parsed, password: 'backup passphrase', cryptoApi: webcrypto }));
});
