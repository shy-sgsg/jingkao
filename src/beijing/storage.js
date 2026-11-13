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
const BEIJING_MANUAL_REVIEW_CHECKS = new Set([
  'major', 'education', 'degree', 'politicalStatus', 'gender', 'ethnicity', 'graduation',
  'grassrootsExperience', 'age', 'locality', 'targetedIdentity', 'specialRequirements',
]);
const BEIJING_MONITOR_METRICS = ['applications', 'qualified'];
const BEIJING_MONITOR_SORTS = [
  'applications-desc', 'applications-asc', 'qualified-desc', 'qualified-asc',
  'applicationsRatio-desc', 'applicationsRatio-asc', 'qualifiedRatio-desc', 'qualifiedRatio-asc',
];

function beijingIsRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function beijingText(value, limit = 200) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().slice(0, limit) : '';
}

function beijingMonitorMetric(value) {
  if (!beijingIsRecord(value) || !Number.isSafeInteger(value.value) || value.value < 0
    || !['official', 'third-party', 'manual'].includes(value.sourceType)
    || !beijingText(value.sourceName, 240)
    || !Number.isFinite(Date.parse(beijingText(value.observedAt, 120)))) return null;
  let sourceUrl = '';
  const rawSourceUrl = beijingText(value.sourceUrl, 2000);
  if (!rawSourceUrl && value.sourceType !== 'manual') return null;
  if (rawSourceUrl) {
    try {
      const parsed = new URL(rawSourceUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      sourceUrl = parsed.href;
    } catch {
      return null;
    }
  }
  return {
    value: value.value,
    sourceType: value.sourceType,
    sourceName: beijingText(value.sourceName, 240),
    sourceUrl,
    sourceUpdatedAt: beijingText(value.sourceUpdatedAt, 120),
    observedAt: beijingText(value.observedAt, 120),
    importedAt: beijingText(value.importedAt, 120),
  };
}

function beijingMonitorThreshold(value) {
  const text = beijingText(value, 24);
  if (!text) return '';
  const number = Number(text);
  return /^\d+(?:\.\d{1,2})?$/u.test(text) && Number.isFinite(number) && number >= 0 ? text : '';
}

export function isBeijingPositionId(value) {
  return typeof value === 'string' && /^beijing:2027:[^:]+$/u.test(value);
}

export function emptyBeijingWorkspace() {
  return {
    profile: Object.fromEntries(BEIJING_PROFILE_TEXT_FIELDS.map((key) => [key, ''])),
    filters: { sort: 'recruit-desc', page: 1, excludeExplicitMismatch: true },
    savedFilters: [], favorites: [], myPicks: [], pickPriorities: [],
    pickFilters: {
      keyword: '', workDistrict: '', majorRaw: '', educationRaw: '', politicalStatusRaw: '',
      freshGraduateRaw: '', existingIdentityRaw: '', onlyPriority: false,
    },
    comparisons: [], notes: {}, manualReviews: {}, monitoringSnapshots: {},
    favoriteQuery: '', favoritePriority: 'all', comparisonOnlyDifferences: false,
    monitorFilters: { query: '', minApplications: '', minQualified: '', minApplicationsRatio: '', minQualifiedRatio: '', dataStatus: 'all' },
    monitorSort: 'applicationsRatio-desc',
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
    .filter(isBeijingPositionId))].slice(0, 10);
  const myPicks = [...new Set((Array.isArray(value.myPicks) ? value.myPicks : [])
    .filter(isBeijingPositionId))].slice(0, 60);
  const pickPriorities = [...new Set((Array.isArray(value.pickPriorities) ? value.pickPriorities : [])
    .filter(isBeijingPositionId))].filter((positionId) => myPicks.includes(positionId)).slice(0, 60);
  const incomingPickFilters = beijingIsRecord(value.pickFilters) ? value.pickFilters : {};
  const pickFilters = {
    keyword: beijingText(incomingPickFilters.keyword, 160),
    workDistrict: beijingText(incomingPickFilters.workDistrict, 200),
    majorRaw: beijingText(incomingPickFilters.majorRaw, 2000),
    educationRaw: beijingText(incomingPickFilters.educationRaw, 500),
    politicalStatusRaw: beijingText(incomingPickFilters.politicalStatusRaw, 500),
    freshGraduateRaw: beijingText(incomingPickFilters.freshGraduateRaw, 1000),
    existingIdentityRaw: beijingText(incomingPickFilters.existingIdentityRaw, 2000),
    onlyPriority: incomingPickFilters.onlyPriority === true,
  };
  const monitoringSnapshots = Object.fromEntries(Object.entries(
    beijingIsRecord(value.monitoringSnapshots) ? value.monitoringSnapshots : {},
  ).flatMap(([positionId, snapshot]) => {
    if (!isBeijingPositionId(positionId) || !beijingIsRecord(snapshot)) return [];
    const metrics = Object.fromEntries(BEIJING_MONITOR_METRICS
      .map((key) => [key, beijingMonitorMetric(snapshot[key])])
      .filter(([, metric]) => metric));
    return Object.keys(metrics).length ? [[positionId, metrics]] : [];
  }));
  const incomingMonitorFilters = beijingIsRecord(value.monitorFilters) ? value.monitorFilters : {};
  const monitorFilters = {
    query: beijingText(incomingMonitorFilters.query, 160),
    minApplications: beijingMonitorThreshold(incomingMonitorFilters.minApplications),
    minQualified: beijingMonitorThreshold(incomingMonitorFilters.minQualified),
    minApplicationsRatio: beijingMonitorThreshold(incomingMonitorFilters.minApplicationsRatio),
    minQualifiedRatio: beijingMonitorThreshold(incomingMonitorFilters.minQualifiedRatio),
    dataStatus: ['all', 'has-data', 'missing'].includes(incomingMonitorFilters.dataStatus)
      ? incomingMonitorFilters.dataStatus : 'all',
  };
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
  const manualReviews = Object.fromEntries(Object.entries(beijingIsRecord(value.manualReviews) ? value.manualReviews : {})
    .flatMap(([positionId, checks]) => {
      if (!isBeijingPositionId(positionId) || !beijingIsRecord(checks)) return [];
      const normalizedChecks = Object.fromEntries(Object.entries(checks).flatMap(([key, review]) => {
        if (!BEIJING_MANUAL_REVIEW_CHECKS.has(key) || !beijingIsRecord(review)
          || !['match', 'mismatch'].includes(review.status)) return [];
        const basis = beijingText(review.basis, 20000);
        return basis ? [[key, { status: review.status, basis }]] : [];
      }));
      return Object.keys(normalizedChecks).length ? [[positionId, normalizedChecks]] : [];
    }));

  return {
    profile,
    filters,
    savedFilters: [...savedFiltersById.values()],
    favorites: [...favoritesById.values()],
    myPicks,
    pickPriorities,
    pickFilters,
    comparisons,
    notes,
    manualReviews,
    monitoringSnapshots,
    favoriteQuery: beijingText(value.favoriteQuery, 160),
    favoritePriority: ['all', 'high', 'normal', 'watch'].includes(value.favoritePriority) ? value.favoritePriority : 'all',
    comparisonOnlyDifferences: value.comparisonOnlyDifferences === true,
    monitorFilters,
    monitorSort: BEIJING_MONITOR_SORTS.includes(value.monitorSort) ? value.monitorSort : 'applicationsRatio-desc',
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
    if (workspace.comparisons.length >= 10) throw new Error('一次最多比较 10 个北京市考职位。');
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

export function setBeijingManualReview(source, positionId, checkKey, status, basis) {
  if (!isBeijingPositionId(positionId) || !BEIJING_MANUAL_REVIEW_CHECKS.has(checkKey)
    || !['match', 'mismatch'].includes(status) || !beijingText(basis, 20000)) {
    throw new Error('人工核验记录无效。');
  }
  const workspace = normalizeBeijingWorkspace(source);
  workspace.manualReviews[positionId] = {
    ...(workspace.manualReviews[positionId] || {}),
    [checkKey]: { status, basis: beijingText(basis, 20000) },
  };
  return workspace;
}

export function clearBeijingManualReview(source, positionId, checkKey) {
  if (!isBeijingPositionId(positionId) || !BEIJING_MANUAL_REVIEW_CHECKS.has(checkKey)) {
    throw new Error('人工核验记录无效。');
  }
  const workspace = normalizeBeijingWorkspace(source);
  const checks = { ...(workspace.manualReviews[positionId] || {}) };
  delete checks[checkKey];
  if (Object.keys(checks).length) workspace.manualReviews[positionId] = checks;
  else delete workspace.manualReviews[positionId];
  return workspace;
}
