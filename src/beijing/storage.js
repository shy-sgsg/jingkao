export const BEIJING_POSITION_ID_PREFIX = 'beijing:2027:';

const BEIJING_PROFILE_TEXT_FIELDS = [
  'degree', 'graduateMajor', 'graduateMajorCode', 'undergraduateMajor',
  'undergraduateMajorCode', 'politicalStatus', 'graduationStatus',
  'gender', 'ethnicity', 'age', 'grassrootsYears', 'grassrootsProjectStatus', 'hukou', 'studentOrigin',
  'credentials', 'acceptPhysicalTest', 'acceptPsychologicalTest', 'acceptProfessionalTest', 'acceptServiceDuration',
  'retiredUniversityStudentSoldier', 'serviceProjectStatus', 'disabilityStatus', 'disabilityType',
  'disabilityLevel', 'disabilityCertificate', 'freshGraduateNoEmployment', 'highestDegreeNoResit',
  'policeSpecialtyGraduate',
];

function beijingIsRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function beijingText(value, limit = 200) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, limit) : '';
}

export function isBeijingPositionId(value) {
  return typeof value === 'string' && /^beijing:2027:[^:]+$/u.test(value);
}

export function emptyBeijingWorkspace() {
  return {
    profile: Object.fromEntries(BEIJING_PROFILE_TEXT_FIELDS.map((key) => [key, ''])),
    filters: { sort: 'recruit-desc', page: 1, excludeExplicitMismatch: true },
    savedFilters: [], favorites: [], comparisons: [], notes: {},
    favoriteQuery: '', favoritePriority: 'all', comparisonOnlyDifferences: false,
  };
}

export function normalizeBeijingWorkspace(source) {
  const value = beijingIsRecord(source) ? source : {};
  const incomingProfile = beijingIsRecord(value.profile) ? value.profile : {};
  const profile = Object.fromEntries(BEIJING_PROFILE_TEXT_FIELDS.map((key) => [
    key, beijingText(incomingProfile[key], key === 'credentials' ? 1000 : 200),
  ]));
  if (!['女性', '男性', '其他'].includes(profile.gender)) profile.gender = '';
  if (!['中共党员', '共青团员', '群众', '其他'].includes(profile.politicalStatus)) profile.politicalStatus = '';
  if (!['应届毕业生', '非应届', '其他'].includes(profile.graduationStatus)) profile.graduationStatus = '';
  if (!['是', '否', '待确认'].includes(profile.grassrootsProjectStatus)) profile.grassrootsProjectStatus = '';
  for (const key of ['retiredUniversityStudentSoldier', 'serviceProjectStatus', 'disabilityStatus',
    'disabilityCertificate', 'policeSpecialtyGraduate']) {
    if (!['是', '否', '待确认'].includes(profile[key])) profile[key] = '';
  }
  if (!['听力', '肢体', '视力', '言语', '其他'].includes(profile.disabilityType)) profile.disabilityType = '';
  if (!['一级', '二级', '三级', '四级'].includes(profile.disabilityLevel)) profile.disabilityLevel = '';
  if (!['有', '没有', '待确认'].includes(profile.freshGraduateNoEmployment)) profile.freshGraduateNoEmployment = '';
  if (!['是', '否', '待确认'].includes(profile.highestDegreeNoResit)) profile.highestDegreeNoResit = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptPhysicalTest)) profile.acceptPhysicalTest = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptPsychologicalTest)) profile.acceptPsychologicalTest = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptProfessionalTest)) profile.acceptProfessionalTest = '';
  if (!['接受', '不接受', '待确认'].includes(profile.acceptServiceDuration)) profile.acceptServiceDuration = '';

  const incomingFilters = beijingIsRecord(value.filters) ? value.filters : {};
  const filters = {
    keyword: beijingText(incomingFilters.keyword),
    sourceSheet: beijingText(incomingFilters.sourceSheet),
    positionAttribute: beijingText(incomingFilters.positionAttribute),
    positionType: beijingText(incomingFilters.positionType),
    positionSubType: beijingText(incomingFilters.positionSubType),
    educationRaw: beijingText(incomingFilters.educationRaw),
    politicalStatusRaw: beijingText(incomingFilters.politicalStatusRaw),
    existingIdentityRaw: beijingText(incomingFilters.existingIdentityRaw),
    workDistrict: beijingText(incomingFilters.workDistrict),
    qualificationStatus: ['initialMatch', 'incompatible', 'needsReview', 'incomplete'].includes(incomingFilters.qualificationStatus)
      ? incomingFilters.qualificationStatus : '',
    minRecruitCount: beijingText(incomingFilters.minRecruitCount, 12),
    sort: ['recruit-desc', 'recruit-asc', 'department', 'position-code'].includes(incomingFilters.sort)
      ? incomingFilters.sort : 'recruit-desc',
    page: Number.isInteger(incomingFilters.page) && incomingFilters.page > 0 ? incomingFilters.page : 1,
    excludeExplicitMismatch: incomingFilters.excludeExplicitMismatch !== false,
    onlyMajorMatch: incomingFilters.onlyMajorMatch === true,
  };

  const favoritesById = new Map();
  for (const item of Array.isArray(value.favorites) ? value.favorites : []) {
    const positionId = typeof item === 'string' ? item : item?.positionId || item?.id;
    if (!isBeijingPositionId(positionId) || favoritesById.has(positionId)) continue;
    const record = beijingIsRecord(item) ? item : {};
    favoritesById.set(positionId, {
      id: positionId,
      positionId,
      addedAt: beijingText(record.addedAt, 120),
      note: beijingText(record.note, 2000),
      priority: ['high', 'normal', 'watch'].includes(record.priority) ? record.priority : 'normal',
    });
  }
  const comparisons = [...new Set((Array.isArray(value.comparisons) ? value.comparisons : [])
    .filter(isBeijingPositionId))].slice(0, 6);
  const savedFiltersById = new Map();
  for (const item of Array.isArray(value.savedFilters) ? value.savedFilters : []) {
    if (!beijingIsRecord(item) || typeof item.id !== 'string' || !item.id.trim()
      || typeof item.name !== 'string' || !item.name.trim() || !beijingIsRecord(item.filters)) continue;
    savedFiltersById.set(item.id, {
      id: item.id,
      name: item.name.trim().slice(0, 80),
      filters: normalizeBeijingWorkspace({ filters: item.filters }).filters,
    });
  }
  const notes = Object.fromEntries(Object.entries(beijingIsRecord(value.notes) ? value.notes : {})
    .filter(([id, note]) => isBeijingPositionId(id) && typeof note === 'string')
    .map(([id, note]) => [id, note.slice(0, 2000)]));

  return {
    profile,
    filters,
    savedFilters: [...savedFiltersById.values()],
    favorites: [...favoritesById.values()],
    comparisons,
    notes,
    favoriteQuery: beijingText(value.favoriteQuery, 160),
    favoritePriority: ['all', 'high', 'normal', 'watch'].includes(value.favoritePriority) ? value.favoritePriority : 'all',
    comparisonOnlyDifferences: value.comparisonOnlyDifferences === true,
  };
}

export function toggleBeijingFavorite(source, positionId) {
  if (!isBeijingPositionId(positionId)) throw new Error('只能收藏北京市考职位。');
  const workspace = normalizeBeijingWorkspace(source);
  const exists = workspace.favorites.some((item) => item.positionId === positionId);
  workspace.favorites = exists
    ? workspace.favorites.filter((item) => item.positionId !== positionId)
    : [...workspace.favorites, { id: positionId, positionId, addedAt: '', note: '', priority: 'normal' }];
  return workspace;
}

export function toggleBeijingComparison(source, positionId) {
  if (!isBeijingPositionId(positionId)) throw new Error('北京市考比较清单只接受北京市考职位。');
  const workspace = normalizeBeijingWorkspace(source);
  if (workspace.comparisons.includes(positionId)) {
    workspace.comparisons = workspace.comparisons.filter((id) => id !== positionId);
  } else {
    if (workspace.comparisons.length >= 6) throw new Error('一次最多比较 6 个北京市考职位。');
    workspace.comparisons.push(positionId);
  }
  return workspace;
}

export function updateBeijingFavorite(source, positionId, patch = {}) {
  if (!isBeijingPositionId(positionId)) throw new Error('只能修改北京市考职位收藏。');
  const workspace = normalizeBeijingWorkspace(source);
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
