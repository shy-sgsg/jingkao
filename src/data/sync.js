export const USER_DATA_SCHEMA_VERSION = 1;

export function studyLogKey(type, item) {
  if (!isRecord(item) || !['aptitude', 'essay'].includes(type)) throw new Error('训练记录类型或内容无效。');
  const title = type === 'aptitude' ? item.item : item.practice;
  if (typeof item.area !== 'string' || !item.area.trim() || typeof title !== 'string' || !title.trim()) {
    throw new Error('训练记录缺少稳定内容标识。');
  }
  return `${type}:${encodeURIComponent(item.area.trim())}:${encodeURIComponent(title.trim())}`;
}

const DATA_FIELDS = [
  'profile', 'dayLogs', 'planOverrides', 'studyPlanTasks', 'scienceStudy',
  'generalKnowledgeStudy', 'aptitudeModuleStudies', 'aptitudeLogs', 'essayLogs',
  'mocks', 'favorites', 'compared', 'settings', 'positionPreferences', 'onboarding',
];

const OPTIONAL_BACKUP_FIELDS = new Set(['positionPreferences']);
const DEFAULT_POSITION_FILTERS = Object.freeze({
  districtId: 'all', year: 'all', orgType: 'all', jobType: 'all', majorTopic: 'all', sourceLevel: 'all',
  unit: 'all', education: 'all', politicalStatus: 'all', freshGraduate: 'all',
  physicalTest: 'all', professionalTest: 'all', recruitmentGroup: 'all',
});
const POSITION_SORTS = new Set(['year-desc', 'recruit-desc', 'unit-asc', 'title-asc']);
const SCENARIO_SCOPES = new Set(['all', 'district', 'street', 'town', 'ordinary', 'enforcement', 'public-management']);

export function normalizePositionPreferences(source = {}) {
  const value = isRecord(source) ? source : {};
  const inputFilters = isRecord(value.filters) ? value.filters : {};
  const filters = Object.fromEntries(Object.entries(DEFAULT_POSITION_FILTERS).map(([key, fallback]) => {
    const candidate = inputFilters[key];
    return [key, typeof candidate === 'string' && candidate.length <= 160 ? candidate : fallback];
  }));
  const scenarioYear = ['2024', '2025', '2026'].includes(String(value.scenarioYear))
    ? String(value.scenarioYear) : '2026';
  return {
    filters,
    jobSort: POSITION_SORTS.has(value.jobSort) ? value.jobSort : 'year-desc',
    scenarioYear,
    scenarioScope: SCENARIO_SCOPES.has(value.scenarioScope) ? value.scenarioScope : 'all',
  };
}

const EMPTY_DATA = {
  profile: {}, dayLogs: {}, planOverrides: {}, studyPlanTasks: [],
  scienceStudy: {
    knowledgeProgress: {}, sessions: [], answers: [], mistakes: {},
    favorites: [], favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [],
  },
  generalKnowledgeStudy: {
    knowledgeProgress: {}, sessions: [], answers: [], mistakes: {}, favorites: [],
    favoriteKnowledgePointIds: [], unclearKnowledgePointIds: [], flashcards: [], flashcardReviews: [],
  },
  aptitudeModuleStudies: {}, aptitudeLogs: {}, essayLogs: {}, mocks: [], favorites: [], compared: [],
  settings: {}, positionPreferences: normalizePositionPreferences(), onboarding: {},
};

const RECORD_COLLECTIONS = [
  { path: ['studyPlanTasks'], alias: 'task_id' },
  { path: ['scienceStudy', 'sessions'], alias: 'session_id' },
  { path: ['scienceStudy', 'answers'], alias: 'attempt_id' },
  { path: ['generalKnowledgeStudy', 'sessions'], alias: 'session_id' },
  { path: ['generalKnowledgeStudy', 'answers'], alias: 'attempt_id' },
  { path: ['generalKnowledgeStudy', 'flashcards'], alias: 'id' },
  { path: ['generalKnowledgeStudy', 'flashcardReviews'], alias: 'id' },
  { path: ['mocks'], alias: 'mock_id' },
];

const TIMESTAMP_FIELDS = new Set(['updatedAt', 'lastViewedAt', 'lastReviewedAt', 'modifiedAt']);
const MISSING = Symbol('missing');

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  if (value === MISSING) return MISSING;
  if (value === undefined) return undefined;
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function stableSerialize(value) {
  if (value === MISSING) return 'missing';
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(',')}}`;
}

function equal(left, right) {
  return stableSerialize(left) === stableSerialize(right);
}

function readPath(source, path) {
  let value = source;
  for (const key of path) {
    if (!isRecord(value) && !Array.isArray(value)) return MISSING;
    if (!Object.hasOwn(value, key)) return MISSING;
    value = value[key];
  }
  return value;
}

function writePath(source, path, value) {
  let parent = source;
  for (const token of path.slice(0, -1)) {
    if (token.type === 'key') parent = parent[token.key];
    else parent = parent.find((item) => recordId(item) === token.id);
    if (parent === undefined || parent === null) return;
  }
  const last = path.at(-1);
  if (!last) return;
  if (last.type === 'key') {
    if (value === MISSING || value === undefined) delete parent[last.key];
    else parent[last.key] = clone(value);
    return;
  }
  const index = parent.findIndex((item) => recordId(item) === last.id);
  if (value === MISSING || value === undefined) {
    if (index >= 0) parent.splice(index, 1);
  } else if (index >= 0) parent[index] = clone(value);
  else parent.push(clone(value));
}

function recordId(item) {
  if (!isRecord(item)) return '';
  return String(item.task_id || item.session_id || item.attempt_id || item.mock_id || item.id || '');
}

function collectionPath(path) {
  return path.filter((token) => token.type === 'key').map((token) => token.key).join('/');
}

function pathLabel(path) {
  return path.map((token) => token.type === 'key' ? token.key : token.id).join('/');
}

function normalizeRecordArray(records, alias, label) {
  if (!Array.isArray(records)) throw new Error(`备份格式无效：${label}必须是数组。`);
  const ids = new Set();
  return records.map((record) => {
    if (!isRecord(record)) throw new Error(`备份格式无效：${label}中有无效记录。`);
    const id = String(record[alias] || record.id || '');
    if (!id) throw new Error(`备份格式无效：${label}缺少稳定记录编号。`);
    if ((record[alias] && record.id && record[alias] !== record.id)
      || ids.has(id)) throw new Error(`备份格式无效：${label}存在重复或不一致的记录编号。`);
    ids.add(id);
    return { ...record, id: record.id || id, [alias]: id };
  });
}

function normalizeSet(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item)) {
    throw new Error(`备份格式无效：${label}必须是字符串数组。`);
  }
  return [...new Set(value)].sort();
}

function requireRecord(value, label) {
  if (!isRecord(value)) throw new Error(`备份格式无效：${label}必须是对象。`);
  return value;
}

function normalizeStudy(source, label, { general = false } = {}) {
  const study = requireRecord(source, label);
  const normalized = {
    ...study,
    knowledgeProgress: requireRecord(study.knowledgeProgress || {}, `${label}.knowledgeProgress`),
    sessions: normalizeRecordArray(study.sessions || [], 'session_id', `${label}.sessions`),
    answers: normalizeRecordArray(study.answers || [], 'attempt_id', `${label}.answers`),
    mistakes: requireRecord(study.mistakes || {}, `${label}.mistakes`),
    favorites: normalizeSet(study.favorites || [], `${label}.favorites`),
    favoriteKnowledgePointIds: normalizeSet(study.favoriteKnowledgePointIds || [], `${label}.favoriteKnowledgePointIds`),
    unclearKnowledgePointIds: normalizeSet(study.unclearKnowledgePointIds || [], `${label}.unclearKnowledgePointIds`),
  };
  if (general) {
    normalized.flashcards = normalizeRecordArray(study.flashcards || [], 'id', `${label}.flashcards`);
    normalized.flashcardReviews = normalizeRecordArray(study.flashcardReviews || [], 'id', `${label}.flashcardReviews`);
  }
  return normalized;
}

function normalizeAptitudeStudies(value) {
  const studies = requireRecord(value, 'aptitudeModuleStudies');
  return Object.fromEntries(Object.entries(studies).map(([moduleId, study]) => {
    const normalized = normalizeStudy(study, `aptitudeModuleStudies.${moduleId}`);
    return [moduleId, normalized];
  }));
}

function projectUserData(source = {}) {
  if (!isRecord(source)) throw new Error('个人数据格式无效，无法同步。');
  const merged = { ...EMPTY_DATA };
  for (const field of DATA_FIELDS) {
    if (Object.hasOwn(source, field)) merged[field] = clone(source[field]);
  }
  merged.profile = requireRecord(merged.profile, 'profile');
  merged.dayLogs = requireRecord(merged.dayLogs, 'dayLogs');
  merged.planOverrides = requireRecord(merged.planOverrides, 'planOverrides');
  merged.studyPlanTasks = normalizeRecordArray(merged.studyPlanTasks, 'task_id', 'studyPlanTasks');
  merged.scienceStudy = normalizeStudy(merged.scienceStudy, 'scienceStudy');
  merged.generalKnowledgeStudy = normalizeStudy(merged.generalKnowledgeStudy, 'generalKnowledgeStudy', { general: true });
  merged.aptitudeModuleStudies = normalizeAptitudeStudies(merged.aptitudeModuleStudies);
  merged.aptitudeLogs = requireRecord(merged.aptitudeLogs, 'aptitudeLogs');
  merged.essayLogs = requireRecord(merged.essayLogs, 'essayLogs');
  merged.mocks = normalizeRecordArray(merged.mocks, 'mock_id', 'mocks');
  merged.favorites = normalizeSet(merged.favorites, 'favorites');
  merged.compared = normalizeSet(merged.compared, 'compared');
  merged.settings = requireRecord(merged.settings, 'settings');
  merged.positionPreferences = normalizePositionPreferences(merged.positionPreferences);
  merged.onboarding = requireRecord(merged.onboarding, 'onboarding');

  for (const collection of RECORD_COLLECTIONS) {
    if (collection.path[0] === 'aptitudeModuleStudies') continue;
    const records = readPath(merged, collection.path);
    if (Array.isArray(records)) normalizeRecordArray(records, collection.alias, collection.path.join('.'));
  }
  for (const [moduleId, study] of Object.entries(merged.aptitudeModuleStudies)) {
    study.sessions = normalizeRecordArray(study.sessions, 'session_id', `aptitudeModuleStudies.${moduleId}.sessions`);
    study.answers = normalizeRecordArray(study.answers, 'attempt_id', `aptitudeModuleStudies.${moduleId}.answers`);
  }
  return merged;
}

function normalizeTombstones(tombstones = []) {
  if (!Array.isArray(tombstones)) throw new Error('备份格式无效：删除标记必须是数组。');
  const byId = new Map();
  for (const item of tombstones) {
    if (!isRecord(item) || typeof item.collection !== 'string' || !item.collection
      || typeof item.id !== 'string' || !item.id
      || typeof item.deletedAt !== 'string' || !Number.isFinite(Date.parse(item.deletedAt))) {
      throw new Error('备份格式无效：删除标记内容无效。');
    }
    const key = `${item.collection}\u0000${item.id}`;
    const previous = byId.get(key);
    if (!previous || Date.parse(item.deletedAt) > Date.parse(previous.deletedAt)) {
      byId.set(key, { collection: item.collection, id: item.id, deletedAt: new Date(item.deletedAt).toISOString() });
    }
  }
  return [...byId.values()].sort((left, right) => left.collection.localeCompare(right.collection) || left.id.localeCompare(right.id));
}

function makeBackupId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `backup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createUserDataBackup(state, { backupId = makeBackupId(), updatedAt = new Date().toISOString(), tombstones = [] } = {}) {
  if (typeof backupId !== 'string' || !backupId.trim()) throw new Error('备份编号无效。');
  if (typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))) throw new Error('备份时间无效。');
  const backup = {
    schemaVersion: USER_DATA_SCHEMA_VERSION,
    backupId,
    updatedAt: new Date(updatedAt).toISOString(),
    data: projectUserData(state),
    tombstones: normalizeTombstones(tombstones),
  };
  assertNoTombstoneRecords(backup.data, backup.tombstones);
  return backup;
}

function assertNoTombstoneRecords(data, tombstones) {
  const live = liveEntityKeys(data);
  if (tombstones.some(({ collection, id }) => live.has(`${collection}\u0000${id}`))) {
    throw new Error('备份格式无效：同一记录不能同时存在和标记为删除。');
  }
}

function liveEntityKeys(data) {
  const keys = new Set();
  function walk(value, path = []) {
    if (Array.isArray(value)) {
      const records = value.length > 0 && value.every((item) => isRecord(item) && recordId(item));
      if (records) {
        const collection = path.join('/');
        for (const item of value) keys.add(`${collection}\u0000${recordId(item)}`);
      } else if (value.every((item) => typeof item === 'string')) {
        const collection = path.join('/');
        for (const item of value) keys.add(`${collection}\u0000${item}`);
      }
      return;
    }
    if (!isRecord(value)) return;
    for (const [key, item] of Object.entries(value)) walk(item, [...path, key]);
  }
  walk(data);
  return keys;
}

export function validateUserDataBackup(value) {
  if (!isRecord(value) || value.schemaVersion !== USER_DATA_SCHEMA_VERSION) {
    throw new Error('远端备份数据版本不受支持。');
  }
  if (typeof value.backupId !== 'string' || !value.backupId.trim()
    || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) {
    throw new Error('远端备份格式无效：缺少有效编号或更新时间。');
  }
  const data = requireRecord(value.data, 'data');
  const unknownFields = Object.keys(data).filter((field) => !DATA_FIELDS.includes(field));
  if (unknownFields.length) throw new Error('远端备份格式无效：包含不支持的数据字段。');
  for (const field of DATA_FIELDS) {
    if (!Object.hasOwn(data, field) && !OPTIONAL_BACKUP_FIELDS.has(field)) {
      throw new Error(`远端备份格式无效：缺少 ${field}。`);
    }
  }
  const normalized = {
    schemaVersion: value.schemaVersion,
    backupId: value.backupId,
    updatedAt: new Date(value.updatedAt).toISOString(),
    data: projectUserData(data),
    tombstones: normalizeTombstones(value.tombstones || []),
  };
  assertNoTombstoneRecords(normalized.data, normalized.tombstones);
  return normalized;
}

function tombstoneKey(collection, id) {
  return `${collection}\u0000${id}`;
}

function tombstoneSet(tombstones) {
  return new Set(normalizeTombstones(tombstones).map(({ collection, id }) => tombstoneKey(collection, id)));
}

function appendConflict(context, path, base, local, remote) {
  const pathParts = path.map((token) => ({ ...token }));
  context.conflicts.push({
    path: pathLabel(pathParts),
    pathParts,
    base: base === MISSING ? null : clone(base),
    local: local === MISSING ? null : clone(local),
    remote: remote === MISSING ? null : clone(remote),
    baseMissing: base === MISSING,
    localMissing: local === MISSING,
    remoteMissing: remote === MISSING,
  });
}

function identityMap(records, collection, tombstones) {
  const map = new Map();
  for (const record of records || []) {
    const id = recordId(record);
    if (!id) throw new Error(`同步数据无效：${collection}中的记录没有稳定编号。`);
    if (map.has(id)) throw new Error(`同步数据无效：${collection}中有重复编号。`);
    if (!tombstones.has(tombstoneKey(collection, id))) map.set(id, record);
  }
  return map;
}

function timestampChoice(local, remote, key) {
  if (!TIMESTAMP_FIELDS.has(key) || typeof local !== 'string' || typeof remote !== 'string') return MISSING;
  const localTime = Date.parse(local);
  const remoteTime = Date.parse(remote);
  if (!Number.isFinite(localTime) || !Number.isFinite(remoteTime)) return MISSING;
  return clone(localTime >= remoteTime ? local : remote);
}

function mergeRecordArrays(base, local, remote, path, context) {
  const collection = collectionPath(path);
  const baseMap = identityMap(base === MISSING ? [] : base, collection, context.baseTombstones);
  const localMap = identityMap(local, collection, context.localTombstones);
  const remoteMap = identityMap(remote, collection, context.remoteTombstones);
  const ids = [];
  const seen = new Set();
  for (const records of [base === MISSING ? [] : base, remote, local]) {
    for (const record of records || []) {
      const id = recordId(record);
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  const result = [];
  for (const id of ids) {
    const baseItem = baseMap.has(id) ? baseMap.get(id) : MISSING;
    const localItem = localMap.has(id) ? localMap.get(id) : MISSING;
    const remoteItem = remoteMap.has(id) ? remoteMap.get(id) : MISSING;
    const merged = mergeValue(baseItem, localItem, remoteItem, [...path, { type: 'record', collection, id }], context);
    if (merged !== MISSING) result.push(merged);
    else if (baseItem !== MISSING || localItem !== MISSING || remoteItem !== MISSING) {
      context.tombstones.push({ collection, id, deletedAt: context.now });
    }
  }
  return result;
}

function mergeStringSets(base, local, remote, path, context) {
  const collection = collectionPath(path);
  const baseSet = new Set(base === MISSING ? [] : base);
  const localSet = new Set(local);
  const remoteSet = new Set(remote);
  const ids = new Set([...baseSet, ...localSet, ...remoteSet]);
  const output = [];
  for (const id of [...ids].sort()) {
    const was = baseSet.has(id);
    const here = localSet.has(id) && !context.localTombstones.has(tombstoneKey(collection, id));
    const there = remoteSet.has(id) && !context.remoteTombstones.has(tombstoneKey(collection, id));
    const merged = here === there ? here : here === was ? there : there === was ? here : here;
    if (merged) output.push(id);
    else if (was || here || there) context.tombstones.push({ collection, id, deletedAt: context.now });
  }
  return output;
}

function mergeValue(base, local, remote, path, context) {
  if (equal(local, remote)) return clone(local);
  if (equal(local, base)) return clone(remote);
  if (equal(remote, base)) return clone(local);

  const finalToken = path.at(-1);
  if (finalToken?.type === 'key') {
    const timestamp = timestampChoice(local, remote, finalToken.key);
    if (timestamp !== MISSING) return timestamp;
  }

  if (isRecord(local) && isRecord(remote) && (base === MISSING || isRecord(base))) {
    const result = {};
    const keys = new Set([
      ...(base === MISSING ? [] : Object.keys(base)),
      ...Object.keys(local), ...Object.keys(remote),
    ]);
    for (const key of [...keys].sort()) {
      const merged = mergeValue(
        base !== MISSING && Object.hasOwn(base, key) ? base[key] : MISSING,
        Object.hasOwn(local, key) ? local[key] : MISSING,
        Object.hasOwn(remote, key) ? remote[key] : MISSING,
        [...path, { type: 'key', key }],
        context,
      );
      if (merged !== MISSING) result[key] = merged;
    }
    return result;
  }

  if (Array.isArray(local) && Array.isArray(remote) && (base === MISSING || Array.isArray(base))) {
    const allValues = [...(base === MISSING ? [] : base), ...local, ...remote];
    if (allValues.every((item) => typeof item === 'string')) {
      return mergeStringSets(base, local, remote, path, context);
    }
    const recordArrays = allValues.every((item) => isRecord(item) && recordId(item));
    if (recordArrays) return mergeRecordArrays(base, local, remote, path, context);
  }

  appendConflict(context, path, base, local, remote);
  return clone(local);
}

function collectDiffSummary(base, side) {
  const baseProjection = projectUserData(base || {});
  const sideProjection = projectUserData(side || {});
  const baseTombstones = new Set();
  const sideTombstones = new Set();
  const emptyContext = {
    conflicts: [], tombstones: [], now: new Date(0).toISOString(),
    baseTombstones, localTombstones: sideTombstones, remoteTombstones: new Set(),
  };
  const details = { add: 0, updated: 0, deleted: 0 };
  function visit(before, after, path = []) {
    if (Array.isArray(before) && Array.isArray(after)) {
      const combined = [...before, ...after];
      if (combined.every((item) => isRecord(item) && recordId(item))) {
        const collection = path.join('/');
        const beforeMap = identityMap(before, collection, baseTombstones);
        const afterMap = identityMap(after, collection, sideTombstones);
        for (const [id, item] of afterMap) {
          if (!beforeMap.has(id)) details.add += 1;
          else if (!equal(beforeMap.get(id), item)) details.updated += 1;
        }
        for (const id of beforeMap.keys()) if (!afterMap.has(id)) details.deleted += 1;
        return;
      }
      if (combined.every((item) => typeof item === 'string')) {
        const oldSet = new Set(before); const newSet = new Set(after);
        details.add += [...newSet].filter((item) => !oldSet.has(item)).length;
        details.deleted += [...oldSet].filter((item) => !newSet.has(item)).length;
        return;
      }
    }
    if (isRecord(before) && isRecord(after)) {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (!Object.hasOwn(before, key)) details.add += 1;
        else if (!Object.hasOwn(after, key)) details.deleted += 1;
        else visit(before[key], after[key], [...path, key]);
      }
      return;
    }
    if (!equal(before, after)) details.updated += 1;
  }
  visit(baseProjection, sideProjection);
  return details;
}

function cleanTombstones(data, tombstones) {
  const live = liveEntityKeys(data);
  return normalizeTombstones(tombstones).filter(({ collection, id }) => !live.has(tombstoneKey(collection, id)));
}

function detectDeletions(base, merged, now) {
  const deleted = [];
  function visit(before, after, path = []) {
    if (Array.isArray(before) && Array.isArray(after)) {
      const combined = [...before, ...after];
      if (combined.every((item) => isRecord(item) && recordId(item))) {
        const collection = path.join('/');
        const afterIds = new Set(after.map(recordId));
        for (const item of before) {
          const id = recordId(item);
          if (!afterIds.has(id)) deleted.push({ collection, id, deletedAt: now });
        }
        return;
      }
      if (combined.every((item) => typeof item === 'string')) {
        const afterIds = new Set(after);
        for (const id of before) {
          if (!afterIds.has(id)) deleted.push({ collection: path.join('/'), id, deletedAt: now });
        }
        return;
      }
    }
    if (isRecord(before) && isRecord(after)) {
      for (const [key, value] of Object.entries(before)) {
        if (Object.hasOwn(after, key)) visit(value, after[key], [...path, key]);
      }
    }
  }
  visit(base, merged);
  return deleted;
}

export function mergeUserData({ base = null, local, remote, baseTombstones = [], localTombstones = [], remoteTombstones = [], now = new Date().toISOString() }) {
  const baseData = base === null ? MISSING : projectUserData(base);
  const localData = projectUserData(local);
  const remoteData = projectUserData(remote);
  const context = {
    conflicts: [], tombstones: [], now: new Date(now).toISOString(),
    baseTombstones: tombstoneSet(baseTombstones),
    localTombstones: tombstoneSet(localTombstones),
    remoteTombstones: tombstoneSet(remoteTombstones),
  };
  const data = mergeValue(baseData, localData, remoteData, [], context);
  const tombstones = cleanTombstones(data, [
    ...normalizeTombstones(baseTombstones), ...normalizeTombstones(localTombstones),
    ...normalizeTombstones(remoteTombstones), ...context.tombstones,
    ...(baseData === MISSING ? [] : detectDeletions(baseData, data, context.now)),
  ]);
  const localDiff = collectDiffSummary(base === null ? {} : baseData, localData);
  const remoteDiff = collectDiffSummary(base === null ? {} : baseData, remoteData);
  const mergedDiff = collectDiffSummary(base === null ? {} : baseData, data);
  return {
    data,
    tombstones,
    conflicts: context.conflicts,
    summary: {
      localAdded: localDiff.add,
      cloudAdded: remoteDiff.add,
      updated: mergedDiff.updated,
      deleted: mergedDiff.deleted,
      conflicts: context.conflicts.length,
      conflictsResolved: 0,
    },
    localData,
    remoteData,
  };
}

export function resolveUserDataConflicts(preview, choices = {}) {
  if (!preview || !Array.isArray(preview.conflicts) || !isRecord(preview.data)) throw new Error('同步冲突预览无效。');
  const data = clone(preview.data);
  for (const conflict of preview.conflicts) {
    const choice = choices[conflict.path];
    if (!['local', 'remote'].includes(choice)) throw new Error(`请先处理冲突：${conflict.path}`);
    if (choice === 'local') continue;
    const value = conflict.remoteMissing ? MISSING : conflict.remote;
    writePath(data, conflict.pathParts, value);
  }
  return {
    data: projectUserData(data),
    tombstones: cleanTombstones(data, preview.tombstones),
    resolvedConflicts: preview.conflicts.length,
  };
}
