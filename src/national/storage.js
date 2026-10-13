export const NATIONAL_POSITION_ID_PREFIX = 'national:2027:';

export const NATIONAL_TABLE_COLUMN_KEYS = [
  'favorite', 'departmentName', 'organizationName', 'positionTitle', 'positionCode',
  'departmentCode', 'organizationType', 'sourceSheet', 'workLocation', 'settlementLocation',
  'recruitCount', 'educationRaw', 'degreeRaw', 'majorRaw', 'majorMatch', 'eligibility',
  'politicalStatusRaw', 'experienceRaw', 'professionalTestRaw', 'interviewRatioRaw',
  'remarkHint', 'actions',
];

export const NATIONAL_DEFAULT_VISIBLE_COLUMNS = [
  'favorite', 'departmentName', 'organizationName', 'positionTitle', 'workLocation', 'recruitCount',
  'educationRaw', 'majorMatch', 'eligibility', 'remarkHint', 'actions',
];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isNationalPositionId(value) {
  return typeof value === 'string' && /^national:\d{4}:[^:]+:[^:]+$/u.test(value);
}

export function emptyNationalWorkspace() {
  return {
    filters: {}, savedFilters: [], favorites: [], comparisons: [], notes: {},
    favoriteQuery: '', favoritePriority: 'all', comparisonOnlyDifferences: false,
  };
}

export function normalizeNationalWorkspace(source) {
  const value = isRecord(source) ? source : {};
  const favoritesById = new Map();
  for (const item of Array.isArray(value.favorites) ? value.favorites : []) {
    const positionId = typeof item === 'string' ? item : item?.positionId || item?.id;
    if (!isNationalPositionId(positionId) || favoritesById.has(positionId)) continue;
    const record = isRecord(item) ? item : {};
    favoritesById.set(positionId, {
      id: positionId,
      positionId,
      addedAt: typeof record.addedAt === 'string' ? record.addedAt : '',
      note: typeof record.note === 'string' ? record.note.slice(0, 2000) : '',
      priority: ['high', 'normal', 'watch'].includes(record.priority) ? record.priority : 'normal',
    });
  }
  const comparisons = [...new Set((Array.isArray(value.comparisons) ? value.comparisons : [])
    .filter(isNationalPositionId))].slice(0, 6);
  const savedById = new Map();
  for (const item of Array.isArray(value.savedFilters) ? value.savedFilters : []) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()
      || typeof item.name !== 'string' || !item.name.trim() || !isRecord(item.filters)) continue;
    savedById.set(item.id, { id: item.id, name: item.name.trim().slice(0, 80), filters: item.filters });
  }
  const notes = Object.fromEntries(Object.entries(isRecord(value.notes) ? value.notes : {})
    .filter(([id, note]) => isNationalPositionId(id) && typeof note === 'string')
    .map(([id, note]) => [id, note.slice(0, 2000)]));
  return {
    filters: isRecord(value.filters) ? value.filters : {},
    visibleColumns: value.visibleColumns === undefined || value.visibleColumns === null
      ? null
      : [...new Set((Array.isArray(value.visibleColumns) ? value.visibleColumns : [])
        .filter((key) => NATIONAL_TABLE_COLUMN_KEYS.includes(key) && key !== 'actions'))],
    savedFilters: [...savedById.values()],
    favorites: [...favoritesById.values()],
    comparisons,
    notes,
    favoriteQuery: typeof value.favoriteQuery === 'string' ? value.favoriteQuery.slice(0, 160) : '',
    favoritePriority: ['all', 'high', 'normal', 'watch'].includes(value.favoritePriority) ? value.favoritePriority : 'all',
    comparisonOnlyDifferences: value.comparisonOnlyDifferences === true,
  };
}

export function toggleNationalFavorite(source, positionId) {
  if (!isNationalPositionId(positionId)) throw new Error('只能收藏国考职位。');
  const workspace = normalizeNationalWorkspace(source);
  const existing = workspace.favorites.findIndex((item) => item.positionId === positionId);
  workspace.favorites = existing >= 0
    ? workspace.favorites.filter((item) => item.positionId !== positionId)
    : [...workspace.favorites, { id: positionId, positionId, addedAt: '', note: '', priority: 'normal' }];
  return workspace;
}

export function toggleNationalComparison(source, positionId) {
  if (!isNationalPositionId(positionId)) throw new Error('国考比较清单只接受国考职位。');
  const workspace = normalizeNationalWorkspace(source);
  if (workspace.comparisons.includes(positionId)) {
    workspace.comparisons = workspace.comparisons.filter((id) => id !== positionId);
  } else {
    if (workspace.comparisons.length >= 6) throw new Error('一次最多比较 6 个国考职位。');
    workspace.comparisons.push(positionId);
  }
  return workspace;
}

export function updateNationalFavorite(source, positionId, patch = {}) {
  if (!isNationalPositionId(positionId)) throw new Error('只能修改国考职位收藏。');
  const workspace = normalizeNationalWorkspace(source);
  const current = workspace.favorites.find((item) => item.positionId === positionId)
    || { id: positionId, positionId, addedAt: '', note: '', priority: 'normal' };
  const updated = {
    ...current,
    note: typeof patch.note === 'string' ? patch.note.slice(0, 2000) : current.note,
    priority: ['high', 'normal', 'watch'].includes(patch.priority) ? patch.priority : current.priority,
  };
  workspace.favorites = [...workspace.favorites.filter((item) => item.positionId !== positionId), updated];
  return workspace;
}

export function renameNationalSavedFilter(source, filterId, name) {
  const workspace = normalizeNationalWorkspace(source);
  const cleanName = String(name ?? '').trim().slice(0, 80);
  if (!cleanName) throw new Error('筛选方案名称不能为空。');
  const index = workspace.savedFilters.findIndex((item) => item.id === filterId);
  if (index < 0) throw new Error('找不到这条已保存筛选。');
  workspace.savedFilters[index] = { ...workspace.savedFilters[index], name: cleanName };
  return workspace;
}
