export function scoreAgainstSample(score, sample, scoreRows = []) {
  const rows = Array.isArray(scoreRows)
    ? scoreRows.filter((row) => Number(row.year) === Number(sample?.year) && Number.isFinite(row.score))
    : [];
  if (!Number.isFinite(score) || !sample || rows.length === 0) {
    return { label: '暂无可比样本', coveredPositions: 0, totalPositions: rows.length, coverageRate: null, relation: 'unknown' };
  }
  const coveredPositions = rows.filter((row) => row.score <= score).length;
  const minimum = Math.min(...rows.map((row) => row.score));
  const maximum = Math.max(...rows.map((row) => row.score));
  const relation = score < minimum ? 'below' : score > maximum ? 'above' : 'within';
  return {
    label: `历史线覆盖 ${coveredPositions}/${rows.length} 个岗位`,
    coveredPositions,
    totalPositions: rows.length,
    coverageRate: coveredPositions / rows.length,
    relation,
  };
}

export function getScoreSampleForYear(samples, year) {
  return (samples || []).find((sample) => Number(sample.year) === Number(year)) || null;
}

export function buildScoreEcdf(scoreRows, year) {
  const rows = (Array.isArray(scoreRows) ? scoreRows : [])
    .filter((row) => Number(row.year) === Number(year) && Number.isFinite(row.score));
  const counts = new Map();
  for (const row of rows) counts.set(row.score, (counts.get(row.score) || 0) + 1);
  const scores = [...counts.keys()].sort((left, right) => left - right);
  let cumulativeCount = 0;
  return {
    year: Number(year),
    count: rows.length,
    minimum: scores.length ? scores[0] : null,
    maximum: scores.length ? scores.at(-1) : null,
    points: scores.map((score) => {
      const count = counts.get(score);
      cumulativeCount += count;
      return { score, count, cumulativeCount, coverageRate: cumulativeCount / rows.length };
    }),
  };
}

const MODULE_AREAS = {
  dataAnalysis: ['资料分析'],
  reasoning: ['判断推理'],
  science: ['科学推理'],
  quantitative: ['数量关系'],
  verbal: ['言语'],
  politicalAndGeneral: ['政治理论', '常识判断'],
};

export function buildSevenDayRecommendations({ days = [], aptitude = [], mocks = [], today } = {}) {
  const startDate = String(today || '').slice(0, 10);
  const weekDays = [...days]
    .filter((day) => (!startDate || String(day.date || '') >= startDate) && day.status !== '已完成')
    .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
    .slice(0, 7);
  const plannedQuestions = weekDays.reduce((sum, day) => sum + Math.max(0, (Number(day.plannedQuestions) || 0) - (Number(day.actualQuestions) || 0)), 0);
  const targets = Object.values(MODULE_AREAS).flatMap((areas) => {
    const rows = aptitude.filter((item) => areas.includes(item.area) && Number.isFinite(item.targetAccuracy));
    if (!rows.length) return [];
    const weight = rows.reduce((sum, item) => sum + Math.max(1, Number(item.plannedQuestions) || 1), 0);
    return [{ areas, value: rows.reduce((sum, item) => sum + item.targetAccuracy * Math.max(1, Number(item.plannedQuestions) || 1), 0) / weight }];
  });
  const recentMocks = (Array.isArray(mocks) ? mocks : []).filter((mock) => Number.isFinite(mock.total)).slice(-5);
  const recommendations = [];

  for (const target of targets) {
    const practiceRows = aptitude.filter((item) => target.areas.includes(item.area)
      && Number.isFinite(item.attempted) && item.attempted > 0 && Number.isFinite(item.accuracy));
    const practiceQuestions = practiceRows.reduce((sum, item) => sum + item.attempted, 0);
    const practiceAccuracy = practiceQuestions
      ? practiceRows.reduce((sum, item) => sum + item.accuracy * item.attempted, 0) / practiceQuestions
      : null;
    const moduleKeys = Object.entries(MODULE_AREAS).filter(([, areas]) => areas === target.areas || areas.join('|') === target.areas.join('|')).map(([key]) => key);
    const mockRows = recentMocks.flatMap((mock) => moduleKeys
      .map((key) => mock.accuracy?.[key])
      .filter(Number.isFinite));
    const mockAccuracy = mockRows.length ? mockRows.reduce((sum, value) => sum + value, 0) / mockRows.length : null;
    const observedAccuracy = mockAccuracy ?? practiceAccuracy;
    if (!weekDays.length || !plannedQuestions || !Number.isFinite(observedAccuracy) || observedAccuracy >= target.value) continue;

    const gap = target.value - observedAccuracy;
    const remainingPractice = practiceRows.reduce((sum, item) => sum + Math.max(0, (Number(item.plannedQuestions) || 0) - item.attempted), 0);
    const questionBudget = Math.min(plannedQuestions, remainingPractice || plannedQuestions);
    const recommendedQuestions = plannedQuestions > 0 ? Math.ceil(questionBudget * gap - 1e-9) : 0;
    const sessions = weekDays.length ? Math.min(weekDays.length, Math.max(1, Math.ceil(gap / .07 - 1e-9))) : 0;
    recommendations.push({
      area: target.areas.join(' / '),
      observedAccuracy,
      targetAccuracy: target.value,
      gap,
      source: Number.isFinite(mockAccuracy) ? '模考' : '专项训练',
      sampleCount: Number.isFinite(mockAccuracy) ? mockRows.length : practiceQuestions,
      sessions,
      recommendedQuestions,
      questionsPerSession: sessions && recommendedQuestions ? Math.ceil(recommendedQuestions / sessions) : 0,
    });
  }

  recommendations.sort((left, right) => right.gap - left.gap);
  return {
    days: weekDays,
    phase: weekDays[0]?.stage || '',
    plannedQuestions,
    recommendations: recommendations.slice(0, 2),
  };
}

export function calculateDayCompletion(day) {
  if (!day) return null;
  const hasActualQuestions = Number.isFinite(day.actualQuestions);
  const hasActualHours = Number.isFinite(day.actualHours);
  if (!hasActualQuestions && !hasActualHours && !['进行中', '已完成'].includes(day.status)) return null;
  const plannedQuestions = Number(day.plannedQuestions) || 0;
  const plannedHours = Number(day.plannedHours) || 0;
  const actualQuestions = Number(day.actualQuestions) || 0;
  const actualHours = Number(day.actualHours) || 0;
  const questions = plannedQuestions > 0 ? Math.min(actualQuestions / plannedQuestions, 1) : 0;
  const hours = plannedHours > 0 ? Math.min(actualHours / plannedHours, 1) : 0;
  const status = day.status === '已完成' ? 1 : day.status === '进行中' ? 0.5 : 0;
  return Math.min(1, 0.35 * questions + 0.35 * hours + 0.3 * status);
}

function degreeLevel(degree) {
  const value = String(degree || '').replace(/\s/g, '');
  const undergraduate = /本科|学士/.test(value);
  const graduate = /研究生|硕士|博士/.test(value);
  if (undergraduate === graduate) return null;
  return undergraduate ? 'undergraduate' : 'graduate';
}

function profileEducationLevel(degree) {
  const value = String(degree || '').replace(/\s/g, '');
  if (/大专|专科/.test(value)) return 'college';
  if (/博士/.test(value)) return 'doctorate';
  if (/硕士/.test(value)) return 'masters';
  if (/本科|学士/.test(value)) return 'undergraduate';
  return null;
}

function educationRequirementLevels(requirement) {
  const value = String(requirement || '').replace(/[\s　]/g, '');
  if (!value) return null;
  if (/不限|无要求/.test(value)) return 'any';

  const levels = [];
  if (/博士/.test(value)) levels.push('doctorate');
  else if (/硕士/.test(value)) levels.push('masters');
  else if (/研究生/.test(value)) levels.push('masters', 'doctorate');
  if (/本科/.test(value)) levels.push('undergraduate');
  if (/大专|专科/.test(value)) levels.push('college');
  if (!levels.length) return null;

  if (/(大专|专科).*(及以上|以上)/.test(value)) return ['college', 'undergraduate', 'masters', 'doctorate'];
  if (/本科.*(及以上|以上)/.test(value)) return ['undergraduate', 'masters', 'doctorate'];
  if (/硕士.*(及以上|以上)/.test(value)) return ['masters', 'doctorate'];
  return [...new Set(levels)];
}

function evaluateEducation(degree, requirement) {
  const allowedLevels = educationRequirementLevels(requirement);
  if (!allowedLevels) return { status: 'unknown', degree: degree || '', requirement };
  if (allowedLevels === 'any') return { status: 'match', degree: degree || '', requirement };
  const level = profileEducationLevel(degree);
  if (!level) return { status: 'missing', degree: degree || '', requirement, allowedLevels };
  return {
    status: allowedLevels.includes(level) ? 'match' : 'mismatch',
    degree: degree || '',
    requirement,
    allowedLevels,
  };
}

export function evaluateMajorCode(profile, criteria) {
  const level = degreeLevel(profile?.degree);
  const tierCodeKey = level === 'undergraduate' ? 'undergraduateMajorCode' : 'graduateMajorCode';
  const hasTierCode = Object.prototype.hasOwnProperty.call(profile || {}, tierCodeKey);
  const code = String(hasTierCode ? profile[tierCodeKey] ?? '' : profile?.majorCode ?? '').trim();
  if (!level || !code) return { status: 'missing', level, code };

  const acceptedCodes = Array.isArray(criteria?.[level])
    ? criteria[level].map((item) => String(item).trim()).filter(Boolean)
    : [];
  if (!acceptedCodes.length) return { status: 'unknown', level, code, acceptedCodes };
  const matchesCategory = acceptedCodes.some((acceptedCode) => code.startsWith(acceptedCode));
  return {
    status: matchesCategory ? 'match' : 'mismatch',
    level,
    code,
    acceptedCodes,
  };
}

const REQUIREMENT_LABELS = {
  politicalStatus: '政治面貌',
  graduationStatus: '毕业身份',
  graduationYear: '毕业年份',
  grassrootsProjectStatus: '服务基层项目资格',
};

function buildRequirementChecks(requirements, profile) {
  return Object.entries(requirements).map(([field, requirement]) => {
    const rawValue = profile?.[field];
    const hasValue = rawValue !== null && rawValue !== undefined && rawValue !== '';
    const actual = hasValue ? String(rawValue) : null;
    const acceptedValues = (Array.isArray(requirement) ? requirement : [requirement]).map(String);
    return {
      field,
      label: REQUIREMENT_LABELS[field] || field,
      expected: acceptedValues.join(' / '),
      actual,
      status: !hasValue ? 'missing' : acceptedValues.includes(actual) ? 'match' : 'mismatch',
    };
  });
}

export function evaluateEligibility(position, profile) {
  const requirements = position?.requirements && typeof position.requirements === 'object'
    ? position.requirements
    : {};
  const hasRequirements = Object.keys(requirements).length > 0;
  const hasMajorCriteria = Boolean(position?.majorCriteria && typeof position.majorCriteria === 'object');
  const hasEducation = Boolean(String(position?.education || '').trim());
  if (!position || (!hasRequirements && !hasMajorCriteria && !hasEducation)) {
    return { status: '信息不足', missing: ['结构化职位条件'], failed: [], majorCheck: null, educationCheck: null, requirementChecks: [], reviewRequired: false };
  }

  const missing = [];
  const failed = [];
  const requirementChecks = buildRequirementChecks(requirements, profile);
  let needsManualReview = false;
  const majorCheck = hasMajorCriteria ? evaluateMajorCode(profile, position.majorCriteria) : null;
  const educationCheck = hasEducation ? evaluateEducation(profile?.degree, position.education) : null;
  if (educationCheck?.status === 'mismatch') failed.push('education');
  if (educationCheck?.status === 'missing' && !missing.includes('degree')) missing.push('degree');
  if (educationCheck?.status === 'unknown') needsManualReview = true;
  if (majorCheck?.status === 'mismatch') failed.push('majorCode');
  if (majorCheck?.status === 'missing') {
    const missingField = majorCheck.level ? 'majorCode' : 'degree';
    if (!missing.includes(missingField)) missing.push(missingField);
  }
  if (majorCheck?.status === 'unknown') needsManualReview = true;

  for (const check of requirementChecks) {
    if (check.status === 'missing') missing.push(check.field);
    if (check.status === 'mismatch') failed.push(check.field);
  }
  const reviewRequired = failed.length > 0 && position.sourceLevel !== 'official';
  if (failed.length && !reviewRequired) return { status: '明确不可报', missing, failed, majorCheck, educationCheck, requirementChecks, reviewRequired };
  if (missing.length || needsManualReview || reviewRequired) return { status: '信息不足', missing, failed, majorCheck, educationCheck, requirementChecks, reviewRequired };
  if (position.eligibilityComplete !== true || position.sourceLevel !== 'official') {
    return { status: '大概率可报但有条件待核', missing: ['官方职位表完整条件'], failed, majorCheck, educationCheck, requirementChecks, reviewRequired };
  }
  return { status: '明确可报', missing, failed, majorCheck, educationCheck, requirementChecks, reviewRequired };
}

const DIFFICULTY_WEIGHTS = [
  ['interviewCutoff', '历史进面线', 30],
  ['qualifiedCompetition', '资格审核通过竞争比', 25],
  ['recruitCount', '招录人数', 15],
  ['unrestrictedFields', '明确不限条件数', 15],
  ['cutoffVolatility', '可比组进面线波动', 10],
  ['sourceConfidence', '来源可信度', 5],
];

const FIT_WEIGHTS = [
  ['qualifiedCompetition', '岗位竞争度', 30],
  ['safeMargin', '历史进面安全垫', 25],
  ['recruitCount', '招录人数', 15],
  ['personalAdvantage', '个人限制匹配优势', 10],
  ['preferredType', '岗位类型偏好', 10],
  ['preferredLocation', '地点偏好', 5],
  ['sourceConfidence', '来源可信度', 5],
];

const MIN_PERCENTILE_SAMPLE = 5;
const SOURCE_CONFIDENCE = { official: 100, secondary: 70, estimated: 40 };
const EXPLICIT_ELIGIBILITY_FIELDS = [
  'education', 'majorText', 'politicalStatus', 'freshGraduateRequirement', 'hukouRequirement',
  'studentOriginRequirement', 'grassrootsExperience', 'qualificationCertificate', 'veteranRequirement',
  'genderRequirement', 'ageRequirement', 'specialExam', 'physicalTest', 'professionalTest',
];
const SCORE_DIRECTIONS = {
  interviewCutoff: '进面线越高，历史门槛越高',
  qualifiedCompetition: '难度分看竞争比越高越难；适配分看竞争比越低越有利',
  recruitCount: '难度分看名额越少越难；适配分看招录数越多越有利',
  unrestrictedFields: '明确不限条件越多，潜在人群越宽',
  cutoffVolatility: '跨年波动越大，历史稳定性越低',
  sourceConfidence: '来源等级越高，证据可信度越高',
  safeMargin: '安全垫越大越有利；不足五场只显示原始差值',
  personalAdvantage: '仅在来源直接支持匹配分布时计算',
  preferredType: '用户明确偏好命中记 100，未命中记 0',
  preferredLocation: '用户明确地点偏好命中记 100，未命中记 0',
};

function percentile(value, values, higherIsBetter = true) {
  const population = values.filter(Number.isFinite);
  if (!Number.isFinite(value) || population.length < MIN_PERCENTILE_SAMPLE) return null;
  const minimum = Math.min(...population);
  const maximum = Math.max(...population);
  if (minimum === maximum) return 50;
  const below = population.filter((item) => item < value).length;
  const tied = population.filter((item) => item === value).length;
  const averageRank = below + (tied + 1) / 2;
  const ascending = ((averageRank - 1) / (population.length - 1)) * 100;
  return Math.round((higherIsBetter ? ascending : 100 - ascending) * 100) / 100;
}

function mappedCutoffRows(dataset, year = null) {
  const positions = Array.isArray(dataset?.positions) ? dataset.positions : [];
  const knownCodes = new Set(positions
    .filter((position) => year === null || Number(position.year) === Number(year))
    .map((position) => `${position.year}:${position.code}`));
  const groups = new Map();
  for (const row of Array.isArray(dataset?.scoreRows) ? dataset.scoreRows : []) {
    if (row.mappingConfidence !== 'high' || !row.positionCode || !Number.isFinite(row.score)) continue;
    if (year !== null && Number(row.year) !== Number(year)) continue;
    if (!knownCodes.has(`${row.year}:${row.positionCode}`)) continue;
    const key = `${row.year}:${row.positionCode}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.values()]
    .filter((rows) => new Set(rows.map((row) => row.score)).size === 1)
    .map((rows) => rows[0]);
}

function positionCompetitionRows(dataset, year) {
  const positions = Array.isArray(dataset?.positions) ? dataset.positions : [];
  const positionCodes = new Set(positions
    .filter((position) => Number(position.year) === Number(year))
    .map((position) => position.code));
  const byCode = new Map();
  for (const observation of Array.isArray(dataset?.observations) ? dataset.observations : []) {
    if (Number(observation.year) !== Number(year) || !positionCodes.has(observation.positionCode)) continue;
    if (!['position', 'position-level', '岗位级'].includes(observation.scope)) continue;
    let value = Number.isFinite(observation.qualifiedCompetitionRatio) ? observation.qualifiedCompetitionRatio : null;
    if (value === null && Number.isFinite(observation.applicantsQualified)) {
      const position = positions.find((row) => Number(row.year) === Number(year) && row.code === observation.positionCode);
      const recruits = Number.isFinite(observation.recruitCount) ? observation.recruitCount : position?.recruitCount;
      if (Number.isFinite(recruits) && recruits > 0) value = observation.applicantsQualified / recruits;
    }
    if (!Number.isFinite(value) || value < 0) continue;
    byCode.set(observation.positionCode, [...(byCode.get(observation.positionCode) || []), value]);
  }
  return [...byCode.entries()]
    .filter(([, values]) => new Set(values).size === 1)
    .map(([positionCode, values]) => ({ positionCode, value: values[0] }));
}

function sourceConfidence(position, dataset) {
  const sourceIds = [...new Set(Array.isArray(position?.sources) ? position.sources.filter(Boolean) : [])];
  const sources = Array.isArray(dataset?.sources) ? dataset.sources : [];
  if (!sourceIds.length) return { value: null, sampleCount: 0 };
  const levels = sourceIds.map((sourceId) => sources.find((source) => source.sourceId === sourceId)?.level);
  if (levels.some((level) => !Number.isFinite(SOURCE_CONFIDENCE[level]))) return { value: null, sampleCount: sourceIds.length };
  return {
    value: levels.reduce((sum, level) => sum + SOURCE_CONFIDENCE[level], 0) / levels.length,
    sampleCount: sourceIds.length,
  };
}

function unrestrictedFieldCount(position) {
  if (position?.eligibilityComplete !== true) return null;
  const values = EXPLICIT_ELIGIBILITY_FIELDS
    .map((field) => position[field])
    .filter((value) => typeof value === 'string' && value.trim());
  if (!values.length) return null;
  return values.filter((value) => ['不限', '无限制', '无要求', '无'].includes(value.trim())).length;
}

function comparableGroupVolatilities(dataset) {
  const positions = Array.isArray(dataset?.positions) ? dataset.positions : [];
  const byPosition = new Map(positions.map((position) => [`${position.year}:${position.code}`, position]));
  const grouped = new Map();
  for (const row of mappedCutoffRows(dataset)) {
    const position = byPosition.get(`${row.year}:${row.positionCode}`);
    const groupId = position?.comparableGroupId;
    if (!groupId) continue;
    const key = String(groupId);
    const years = grouped.get(key) || new Map();
    years.set(Number(row.year), [...(years.get(Number(row.year)) || []), row.score]);
    grouped.set(key, years);
  }
  const volatilities = new Map();
  for (const [groupId, years] of grouped) {
    if (years.size < 2) continue;
    const annualMeans = [...years.values()].map((scores) => scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const mean = annualMeans.reduce((sum, score) => sum + score, 0) / annualMeans.length;
    const deviation = Math.sqrt(annualMeans.reduce((sum, score) => sum + (score - mean) ** 2, 0) / annualMeans.length);
    volatilities.set(groupId, deviation);
  }
  return volatilities;
}

function scoreComponent(key, label, weight, value, score, sampleCount, reason, extra = {}) {
  return { key, label, weight, direction: SCORE_DIRECTIONS[key] || null, value: Number.isFinite(value) ? value : null, score: Number.isFinite(score) ? score : null, sampleCount, reason: reason || null, ...extra };
}

function scoreBreakdown(components, extra = {}) {
  const availableWeight = components.reduce((sum, item) => sum + (Number.isFinite(item.score) ? item.weight : 0), 0);
  const score = components.length > 0 && availableWeight === components.reduce((sum, item) => sum + item.weight, 0)
    ? components.reduce((sum, item) => sum + item.score * item.weight / 100, 0)
    : null;
  return { score: Number.isFinite(score) ? Math.round(score * 100) / 100 : null, availableWeight, totalWeight: 100, components, ...extra };
}

function rankedComponent(key, label, weight, value, values, higherIsBetter, reasonWhenMissing, extra = {}) {
  const sampleCount = values.filter(Number.isFinite).length;
  const score = percentile(value, values, higherIsBetter);
  const reason = !Number.isFinite(value)
    ? reasonWhenMissing
    : sampleCount < MIN_PERCENTILE_SAMPLE
      ? `可比样本不足 ${MIN_PERCENTILE_SAMPLE} 个（n=${sampleCount}）`
      : null;
  return scoreComponent(key, label, weight, value, score, sampleCount, reason, extra);
}

export function scoreDifficulty(position, dataset) {
  const year = Number(position?.year);
  const positions = Array.isArray(dataset?.positions) ? dataset.positions : [];
  const yearPositions = positions.filter((row) => Number(row.year) === year);
  const cutoffs = mappedCutoffRows(dataset, year);
  const targetCutoff = cutoffs.find((row) => row.positionCode === position?.code);
  const competitions = positionCompetitionRows(dataset, year);
  const targetCompetition = competitions.find((row) => row.positionCode === position?.code);
  const recruitValues = yearPositions.map((row) => row.recruitCount).filter(Number.isFinite);
  const restrictionValues = yearPositions.map(unrestrictedFieldCount).filter(Number.isFinite);
  const volatilities = comparableGroupVolatilities(dataset);
  const volatility = position?.comparableGroupId ? volatilities.get(String(position.comparableGroupId)) : null;
  const confidence = sourceConfidence(position, dataset);

  const components = [
    rankedComponent('interviewCutoff', '历史进面线', 30, targetCutoff?.score ?? null, cutoffs.map((row) => row.score), true,
      `该岗位没有高置信代码匹配的历史进面线（本年可匹配 n=${cutoffs.length}）`),
    rankedComponent('qualifiedCompetition', '资格审核通过竞争比', 25, targetCompetition?.value ?? null, competitions.map((row) => row.value), true,
      '暂无经职位代码关联的岗位级资格审查通过竞争比；区级汇总不参与'),
    rankedComponent('recruitCount', '招录人数', 15, Number.isFinite(position?.recruitCount) ? position.recruitCount : null, recruitValues, false,
      `该年度有效招录人数样本不足（n=${recruitValues.length}）`),
    rankedComponent('unrestrictedFields', '明确不限条件数', 15, unrestrictedFieldCount(position), restrictionValues, true,
      '该岗位完整资格条件尚未结构化，不能把未知字段当作“不限”'),
    rankedComponent('cutoffVolatility', '可比组进面线波动', 10, volatility ?? null, [...volatilities.values()], true,
      '缺少至少两个年度的同组进面线，或可比组样本不足'),
    scoreComponent('sourceConfidence', '来源可信度', 5, confidence.value, confidence.value, confidence.sampleCount,
      confidence.value === null ? '缺少可追溯的来源等级' : null),
  ];
  return scoreBreakdown(components);
}

function preferenceScore(preference, candidates, key, label, weight) {
  const text = String(preference || '').trim();
  if (!text) return scoreComponent(key, label, weight, null, null, 0, '尚未设置该项偏好');
  const values = candidates.map((value) => String(value || '').trim()).filter(Boolean);
  if (!values.length) return scoreComponent(key, label, weight, null, null, 0, '职位缺少可比较的分类字段');
  const terms = text.split(/[，,、；;|/]+/).map((term) => term.trim()).filter(Boolean);
  const matched = terms.some((term) => values.some((value) => value.includes(term) || term.includes(value)));
  const score = matched ? 100 : 0;
  return scoreComponent(key, label, weight, score, score, 1, null);
}

const WORK_PREFERENCE_DEFINITIONS = [
  ['acceptAdministrativeEnforcement', '行政执法', 'accept'],
  ['acceptPhysicalTest', '体测', 'accept'],
  ['acceptNightShift', '夜班', 'accept'],
  ['acceptTown', '镇', 'accept'],
  ['prioritizeStreet', '街道优先', 'priority'],
  ['prioritizeDistrict', '区直优先', 'priority'],
];

function workPreferenceCondition(position, key) {
  if (key === 'acceptAdministrativeEnforcement') {
    const jobType = String(position?.jobType || '').trim();
    if (jobType) return { present: jobType === '行政执法', evidence: jobType === '行政执法' ? '职位类别标注为行政执法' : '已列职位类别不是行政执法' };
    if (/行政执法/.test(String(position?.title || ''))) return { present: true, evidence: '职位名称标注为行政执法' };
    return { present: null, evidence: '职位类别信息不足，无法确认是否为行政执法' };
  }

  if (key === 'acceptPhysicalTest') {
    if (typeof position?.physicalTest !== 'boolean') return { present: null, evidence: '职位资料未明确是否需要体测' };
    return position.physicalTest
      ? { present: true, evidence: '职位资料标明需要体测' }
      : { present: false, evidence: '职位资料明确标明无需体测' };
  }

  if (key === 'acceptNightShift') {
    const text = [position?.eligibilityText, position?.remarks, position?.otherConditions, position?.positionDescription]
      .filter((value) => typeof value === 'string')
      .join(' ');
    if (/(无夜班|不安排夜班|不涉及夜班|无需夜班|不需夜班|不要求夜班|无夜间值守|无需夜间值守)/.test(text)) {
      return { present: false, evidence: '职位条件原文明确无需夜班或夜间值守' };
    }
    if (/(夜班|夜间值守|值夜班|夜间执勤)/.test(text)) {
      return { present: true, evidence: '职位条件原文提及夜班或夜间值守' };
    }
    return { present: null, evidence: '职位条件未明确夜班要求，不能按未提及推断为无夜班' };
  }

  const orgType = String(position?.orgType || '').trim();
  if (!['区直', '街道', '镇'].includes(orgType)) return { present: null, evidence: '单位类型未明确，无法核对单位偏好' };
  if (key === 'acceptTown') {
    return orgType === '镇'
      ? { present: true, evidence: '单位类型为镇' }
      : { present: false, evidence: `单位类型为${orgType}，不是镇` };
  }
  if (key === 'prioritizeStreet') {
    return orgType === '街道'
      ? { present: true, evidence: '单位类型为街道' }
      : { present: false, evidence: `单位类型为${orgType}，不是街道` };
  }
  return orgType === '区直'
    ? { present: true, evidence: '单位类型为区直' }
    : { present: false, evidence: `单位类型为${orgType}，不是区直` };
}

export function evaluateWorkPreferences(position, profile = {}) {
  const items = WORK_PREFERENCE_DEFINITIONS.map(([key, label, kind]) => {
    const preference = String(profile?.[key] || '').trim() || '待确认';
    const condition = workPreferenceCondition(position, key);
    let status = 'unknown';
    let detail = '';

    if (kind === 'priority' && preference === '不优先') {
      status = 'neutral';
      detail = '你未将此类单位设为优先项，但仍可继续比较。';
    } else if (kind === 'priority' && preference === '优先') {
      if (condition.present === true) {
        status = 'match';
        detail = `符合你的优先选择；${condition.evidence}。`;
      } else if (condition.present === false) {
        status = 'not-prioritized';
        detail = `${condition.evidence}；这是软偏好，不会淘汰该岗位。`;
      } else {
        detail = `你的选择为“优先”，但${condition.evidence}。`;
      }
    } else if (kind === 'accept' && ['接受', '不接受'].includes(preference)) {
      if (condition.present === null) {
        detail = `${condition.evidence}。`;
      } else if (!condition.present) {
        status = 'match';
        detail = `${condition.evidence}；与当前选择相容。`;
      } else if (preference === '接受') {
        status = 'match';
        detail = `${condition.evidence}；你已确认接受。`;
      } else {
        status = 'conflict';
        detail = `${condition.evidence}；你已选择不接受。`;
      }
    } else {
      detail = `个人偏好“${label}”尚未确认。`;
    }

    return { key, label, preference, status, detail };
  });
  return { items };
}

export function scoreFit(position, profile, preferences, mocks, dataset) {
  const eligibility = evaluateEligibility(position, profile);
  if (!['明确可报', '大概率可报但有条件待核'].includes(eligibility.status)) {
    return { ...scoreBreakdown([]), eligibility, reason: '先完成硬性资格核验；资料不足或存在冲突时不计算适配分' };
  }

  const year = Number(position?.year);
  const competitions = positionCompetitionRows(dataset, year);
  const targetCompetition = competitions.find((row) => row.positionCode === position?.code);
  const yearPositions = (Array.isArray(dataset?.positions) ? dataset.positions : []).filter((row) => Number(row.year) === year);
  const recruitValues = yearPositions.map((row) => row.recruitCount).filter(Number.isFinite);
  const cutoffs = mappedCutoffRows(dataset, year);
  const targetCutoff = cutoffs.find((row) => row.positionCode === position?.code);
  const recentMocks = (Array.isArray(mocks) ? mocks : []).map((mock) => mock?.total).filter(Number.isFinite).slice(-5);
  const mockAverage = recentMocks.length
    ? recentMocks.reduce((sum, score) => sum + score, 0) / recentMocks.length
    : null;
  const safeMarginValue = Number.isFinite(mockAverage) && Number.isFinite(targetCutoff?.score)
    ? mockAverage - targetCutoff.score
    : null;
  const marginValues = Number.isFinite(mockAverage) ? cutoffs.map((row) => mockAverage - row.score) : [];
  const confidence = sourceConfidence(position, dataset);

  const safeMargin = rankedComponent('safeMargin', '历史进面安全垫', 25,
    recentMocks.length === 5 ? safeMarginValue : null,
    marginValues,
    true,
    Number.isFinite(targetCutoff?.score)
      ? `有效模考不足 5 场（n=${recentMocks.length}）；原始差值仍可参考`
      : '该岗位没有高置信代码匹配的可比历史进面线',
    { rawValue: safeMarginValue, userSampleCount: recentMocks.length });

  const components = [
    rankedComponent('qualifiedCompetition', '岗位竞争度', 30, targetCompetition?.value ?? null, competitions.map((row) => row.value), false,
      '暂无经职位代码关联的岗位级资格审查通过竞争比；区级汇总不参与'),
    safeMargin,
    rankedComponent('recruitCount', '招录人数', 15, Number.isFinite(position?.recruitCount) ? position.recruitCount : null, recruitValues, true,
      `该年度有效招录人数样本不足（n=${recruitValues.length}）`),
    scoreComponent('personalAdvantage', '个人限制匹配优势', 10, null, null, 0,
      '无来源支持的同类考生匹配分布，暂不估算优势'),
    preferenceScore(preferences?.preferredTypes, [position?.jobType, position?.title], 'preferredType', '岗位类型偏好', 10),
    preferenceScore(preferences?.preferredLocation, [position?.unit, position?.orgType], 'preferredLocation', '地点偏好', 5),
    scoreComponent('sourceConfidence', '来源可信度', 5, confidence.value, confidence.value, confidence.sampleCount,
      confidence.value === null ? '缺少可追溯的来源等级' : null),
  ];
  return { ...scoreBreakdown(components), eligibility, reason: null };
}

export function calculateSafeMargin(mocks, cutoff) {
  const scores = (mocks || []).map((mock) => mock.total).filter(Number.isFinite).slice(-5);
  if (!Number.isFinite(cutoff)) return { value: null, rawValue: null, status: '该岗位没有可比历史进面线', sampleCount: scores.length };
  if (!scores.length) return { value: null, rawValue: null, status: '尚无有效模考记录', sampleCount: 0 };
  const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const rawValue = average - cutoff;
  if (scores.length < 5) return { value: null, rawValue, status: `有效模考不足：${scores.length}/5 · 原始差值（非录取概率）`, sampleCount: scores.length };
  return { value: rawValue, rawValue, status: '原始差值（非录取概率）', sampleCount: scores.length };
}

export function summarizeMockScores(mocks) {
  const scores = (Array.isArray(mocks) ? mocks : [])
    .map((mock) => mock?.total)
    .filter(Number.isFinite);
  if (!scores.length) {
    return { count: 0, mean: null, median: null, standardDeviation: null, minimum: null, maximum: null, last3Mean: null, last5Mean: null };
  }

  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const ordered = [...scores].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const median = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  const rollingMean = (size) => scores.length >= size
    ? scores.slice(-size).reduce((sum, value) => sum + value, 0) / size
    : null;

  return {
    count: scores.length,
    mean,
    median,
    standardDeviation: scores.length >= 2
      ? Math.sqrt(scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length)
      : null,
    minimum: ordered[0],
    maximum: ordered.at(-1),
    last3Mean: rollingMean(3),
    last5Mean: rollingMean(5),
  };
}
