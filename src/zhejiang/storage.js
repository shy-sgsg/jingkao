export const ZHEJIANG_POSITION_ID_PREFIX = 'zhejiang:2027:';

const ZHEJIANG_PROFILE_TEXT_FIELDS = [
  'degree', 'degreeTitle', 'graduateMajor', 'graduateMajorCode', 'undergraduateMajor',
  'undergraduateMajorCode', 'politicalStatus', 'graduationStatus', 'graduationYear',
  'gender', 'ethnicity', 'age', 'grassrootsYears', 'grassrootsProjectStatus', 'hukou', 'studentOrigin',
  'credentials', 'acceptPhysicalTest', 'acceptPsychologicalTest', 'acceptProfessionalTest', 'acceptServiceDuration',
];

function zhejiangIsRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function zhejiangText(value, limit = 200) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, limit) : '';
}

export function isZhejiangPositionId(value) {
  return typeof value === 'string' && /^zhejiang:2027:[^:]+$/u.test(value);
}

export function emptyZhejiangWorkspace() {
  return {
    profile: Object.fromEntries(ZHEJIANG_PROFILE_TEXT_FIELDS.map((key) => [key, ''])),
    filters: { sort: 'recruit-desc', page: 1, excludeExplicitMismatch: true },
    savedFilters: [], favorites: [], comparisons: [], notes: {},
    favoriteQuery: '', favoritePriority: 'all', comparisonOnlyDifferences: false,
  };
}

export function normalizeZhejiangWorkspace(source) {
  const value = zhejiangIsRecord(source) ? source : {};
  const incomingProfile = zhejiangIsRecord(value.profile) ? value.profile : {};
  const profile = Object.fromEntries(ZHEJIANG_PROFILE_TEXT_FIELDS.map((key) => [
    key, zhejiangText(incomingProfile[key], key === 'credentials' ? 1000 : 200),
  ]));
  if (!['女性', '男性', '其他'].includes(profile.gender)) profile.gender = '';
  if (!['中共党员', '共青团员', '群众', '其他'].includes(profile.politicalStatus)) profile.politicalStatus = '';
  if (!['应届毕业生', '非应届', '其他'].includes(profile.graduationStatus)) profile.graduationStatus = '';
  if (!['是', '否', '待确认'].includes(profile.grassrootsProjectStatus)) profile.grassrootsProjectStatus = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptPhysicalTest)) profile.acceptPhysicalTest = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptPsychologicalTest)) profile.acceptPsychologicalTest = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptProfessionalTest)) profile.acceptProfessionalTest = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptServiceDuration)) profile.acceptServiceDuration = '';

  const incomingFilters = zhejiangIsRecord(value.filters) ? value.filters : {};
  const filters = {
    keyword: zhejiangText(incomingFilters.keyword),
    sourceSheet: zhejiangText(incomingFilters.sourceSheet),
    positionAttribute: zhejiangText(incomingFilters.positionAttribute),
    positionType: zhejiangText(incomingFilters.positionType),
    educationRaw: zhejiangText(incomingFilters.educationRaw),
    politicalStatusRaw: zhejiangText(incomingFilters.politicalStatusRaw),
    existingIdentityRaw: zhejiangText(incomingFilters.existingIdentityRaw),
    qualificationStatus: ['initialMatch', 'incompatible', 'needsReview', 'incomplete'].includes(incomingFilters.qualificationStatus)
      ? incomingFilters.qualificationStatus : '',
    minRecruitCount: zhejiangText(incomingFilters.minRecruitCount, 12),
    sort: ['recruit-desc', 'recruit-asc', 'department', 'position-code'].includes(incomingFilters.sort)
      ? incomingFilters.sort : 'recruit-desc',
    page: Number.isInteger(incomingFilters.page) && incomingFilters.page > 0 ? incomingFilters.page : 1,
    excludeExplicitMismatch: incomingFilters.excludeExplicitMismatch !== false,
    onlyMajorMatch: incomingFilters.onlyMajorMatch === true,
  };

  const favoritesById = new Map();
  for (const item of Array.isArray(value.favorites) ? value.favorites : []) {
    const positionId = typeof item === 'string' ? item : item?.positionId || item?.id;
    if (!isZhejiangPositionId(positionId) || favoritesById.has(positionId)) continue;
    const record = zhejiangIsRecord(item) ? item : {};
    favoritesById.set(positionId, {
      id: positionId,
      positionId,
      addedAt: zhejiangText(record.addedAt, 120),
      note: zhejiangText(record.note, 2000),
      priority: ['high', 'normal', 'watch'].includes(record.priority) ? record.priority : 'normal',
    });
  }
  const comparisons = [...new Set((Array.isArray(value.comparisons) ? value.comparisons : [])
    .filter(isZhejiangPositionId))].slice(0, 10);
  const savedFiltersById = new Map();
  for (const item of Array.isArray(value.savedFilters) ? value.savedFilters : []) {
    if (!zhejiangIsRecord(item) || typeof item.id !== 'string' || !item.id.trim()
      || typeof item.name !== 'string' || !item.name.trim() || !zhejiangIsRecord(item.filters)) continue;
    savedFiltersById.set(item.id, {
      id: item.id,
      name: item.name.trim().slice(0, 80),
      filters: normalizeZhejiangWorkspace({ filters: item.filters }).filters,
    });
  }
  const notes = Object.fromEntries(Object.entries(zhejiangIsRecord(value.notes) ? value.notes : {})
    .filter(([id, note]) => isZhejiangPositionId(id) && typeof note === 'string')
    .map(([id, note]) => [id, note.slice(0, 2000)]));

  return {
    profile,
    filters,
    savedFilters: [...savedFiltersById.values()],
    favorites: [...favoritesById.values()],
    comparisons,
    notes,
    favoriteQuery: zhejiangText(value.favoriteQuery, 160),
    favoritePriority: ['all', 'high', 'normal', 'watch'].includes(value.favoritePriority) ? value.favoritePriority : 'all',
    comparisonOnlyDifferences: value.comparisonOnlyDifferences === true,
  };
}

export function toggleZhejiangFavorite(source, positionId) {
  if (!isZhejiangPositionId(positionId)) throw new Error('只能收藏浙江省考职位。');
  const workspace = normalizeZhejiangWorkspace(source);
  const exists = workspace.favorites.some((item) => item.positionId === positionId);
  workspace.favorites = exists
    ? workspace.favorites.filter((item) => item.positionId !== positionId)
    : [...workspace.favorites, { id: positionId, positionId, addedAt: '', note: '', priority: 'normal' }];
  return workspace;
}

export function toggleZhejiangComparison(source, positionId) {
  if (!isZhejiangPositionId(positionId)) throw new Error('浙江省考比较清单只接受浙江省考职位。');
  const workspace = normalizeZhejiangWorkspace(source);
  if (workspace.comparisons.includes(positionId)) {
    workspace.comparisons = workspace.comparisons.filter((id) => id !== positionId);
  } else {
    if (workspace.comparisons.length >= 10) throw new Error('一次最多比较 10 个浙江省考职位。');
    workspace.comparisons.push(positionId);
  }
  return workspace;
}

export function updateZhejiangFavorite(source, positionId, patch = {}) {
  if (!isZhejiangPositionId(positionId)) throw new Error('只能修改浙江省考职位收藏。');
  const workspace = normalizeZhejiangWorkspace(source);
  const existing = workspace.favorites.find((item) => item.positionId === positionId)
    || { id: positionId, positionId, addedAt: '', note: '', priority: 'normal' };
  const note = typeof patch.note === 'string' ? patch.note.slice(0, 2000) : existing.note;
  const updated = {
    ...existing,
    note,
    priority: ['high', 'normal', 'watch'].includes(patch.priority) ? patch.priority : existing.priority,
  };
  workspace.notes[positionId] = note;
  workspace.favorites = [...workspace.favorites.filter((item) => item.positionId !== positionId), updated];
  return workspace;
}

