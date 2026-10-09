export const BACKUP_FORMAT = 'changping-jingkao-dashboard-user-data';
export const BACKUP_VERSION = 1;
export const ENCRYPTED_BACKUP_FORMAT = 'changping-jingkao-dashboard-encrypted-user-data';
export const ENCRYPTED_BACKUP_VERSION = 1;

const ENVELOPE_FIELDS = ['cipher', 'ciphertext', 'iterations', 'iv', 'kdf', 'salt', 'version'];

function base64ByteLength(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) return -1;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

function validateEncryptedBackupData(data) {
  if (!isRecord(data) || Object.keys(data).sort().join(',') !== 'envelope,id'
    || typeof data.id !== 'string' || !/^[A-Za-z0-9_-]{20,}$/u.test(data.id)
    || !isRecord(data.envelope)
    || Object.keys(data.envelope).sort().join(',') !== ENVELOPE_FIELDS.join(',')) return false;
  const envelope = data.envelope;
  return envelope.version === 1
    && envelope.kdf === 'PBKDF2-SHA-256'
    && envelope.iterations === 600000
    && envelope.cipher === 'AES-GCM-256'
    && base64ByteLength(envelope.salt) === 16
    && base64ByteLength(envelope.iv) === 12
    && base64ByteLength(envelope.ciphertext) >= 16;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isRecordMap(value) {
  return isRecord(value) && Object.values(value).every(isRecord);
}

function isScienceStudyRecord(value) {
  return isRecord(value)
    && isRecord(value.knowledgeProgress)
    && Array.isArray(value.sessions) && value.sessions.every(isRecord)
    && Array.isArray(value.answers) && value.answers.every(isRecord)
    && isRecord(value.mistakes)
    && Array.isArray(value.favorites) && value.favorites.every((id) => typeof id === 'string')
    && (value.favoriteKnowledgePointIds === undefined || (Array.isArray(value.favoriteKnowledgePointIds) && value.favoriteKnowledgePointIds.every((id) => typeof id === 'string')))
    && (value.unclearKnowledgePointIds === undefined || (Array.isArray(value.unclearKnowledgePointIds) && value.unclearKnowledgePointIds.every((id) => typeof id === 'string')));
}

function emptyScienceStudyRecord() {
  return { knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [] };
}

export function createEncryptedUserBackup({ id, envelope }, exportedAt = new Date().toISOString()) {
  const data = { id, envelope };
  if (!validateEncryptedBackupData(data)) throw new Error('档案加密格式不受支持或已损坏，无法导出。');
  return { format: ENCRYPTED_BACKUP_FORMAT, version: ENCRYPTED_BACKUP_VERSION, exportedAt, data };
}

export function parseEncryptedUserBackup(input) {
  let backup;
  try {
    backup = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return { ok: false, error: '文件不是有效的 JSON 加密备份。' };
  }
  if (!isRecord(backup) || backup.format !== ENCRYPTED_BACKUP_FORMAT
    || backup.version !== ENCRYPTED_BACKUP_VERSION || !validateEncryptedBackupData(backup.data)) {
    return { ok: false, error: '加密备份格式、版本或密文信封无效。' };
  }
  return {
    ok: true,
    id: backup.data.id,
    envelope: backup.data.envelope,
    exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : null,
  };
}

export function createUserBackup(state, exportedAt = new Date().toISOString()) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, data: state };
}

export function parseUserBackup(input) {
  let backup;
  try {
    backup = typeof input === 'string' ? JSON.parse(input) : input;
  } catch {
    return { ok: false, error: '文件不是有效的 JSON 备份。' };
  }
  if (!isRecord(backup) || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    return { ok: false, error: '备份格式或版本不受支持。请使用本工作台导出的 JSON 文件。' };
  }
  const state = backup.data;
  if (!isRecord(state) || !isRecord(state.profile) || !isRecordMap(state.dayLogs)
    || !isRecordMap(state.aptitudeLogs) || !isRecordMap(state.essayLogs)
    || !Array.isArray(state.mocks) || !Array.isArray(state.favorites) || !Array.isArray(state.compared)
    || !isRecord(state.onboarding)
    || (state.planOverrides !== undefined && !isRecordMap(state.planOverrides))
    || (state.studyPlanTasks !== undefined && (!Array.isArray(state.studyPlanTasks)
      || state.studyPlanTasks.some((task) => !isRecord(task) || typeof task.id !== 'string'
        || !task.id || typeof task.title !== 'string' || !task.title.trim()
        || typeof task.date !== 'string' || typeof task.taskType !== 'string')))
    || (state.scienceStudy !== undefined && !isScienceStudyRecord(state.scienceStudy))
    || (state.settings !== undefined && !isRecord(state.settings))) {
    return { ok: false, error: '备份缺少必要的个人记录字段，未修改本机数据。' };
  }
  const settings = state.settings || {};
  const displaySettings = {
    density: settings.density === 'compact' ? 'compact' : 'comfortable',
    fontSize: ['small', 'standard', 'large'].includes(settings.fontSize) ? settings.fontSize : 'standard',
    motion: settings.motion === 'immersive' ? 'immersive' : 'enhanced',
  };
  if (state.favorites.some((id) => typeof id !== 'string')
    || state.compared.some((id) => typeof id !== 'string') || state.compared.length > 5
    || state.mocks.some((mock) => !isRecord(mock) || !Number.isFinite(mock.aptitude)
      || !Number.isFinite(mock.essay) || !Number.isFinite(mock.total))) {
    return { ok: false, error: '备份中的收藏、比较清单或模考记录格式异常，未修改本机数据。' };
  }
  const onboarding = state.onboarding;
  if (!Number.isInteger(onboarding.step) || onboarding.step < 0 || onboarding.step > 3
    || typeof onboarding.hidden !== 'boolean' || typeof onboarding.completed !== 'boolean') {
    return { ok: false, error: '备份中的引导状态格式异常，未修改本机数据。' };
  }
  return {
    ok: true,
    state: {
      profile: state.profile,
      dayLogs: state.dayLogs,
      planOverrides: state.planOverrides || {},
      studyPlanTasks: state.studyPlanTasks || [],
      scienceStudy: state.scienceStudy || emptyScienceStudyRecord(),
      aptitudeLogs: state.aptitudeLogs,
      essayLogs: state.essayLogs,
      mocks: state.mocks,
      favorites: state.favorites,
      compared: state.compared,
      settings: displaySettings,
      onboarding: state.onboarding,
    },
    exportedAt: typeof backup.exportedAt === 'string' ? backup.exportedAt : null,
  };
}
