function numericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonEmptyValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? '需要' : '不需要';
  const text = String(value).trim();
  return text || null;
}

export function getPositionFilterValue(position, field) {
  const graduationStatus = position?.requirements?.graduationStatus ?? position?.freshGraduateRequirement;
  const graduationYear = position?.requirements?.graduationYear ?? position?.newGraduateYear;
  const graduationYears = (Array.isArray(graduationYear) ? graduationYear : [graduationYear])
    .map((year) => nonEmptyValue(year))
    .filter(Boolean);
  const freshGraduate = nonEmptyValue(graduationStatus);
  const values = {
    unit: position?.unit,
    education: position?.education,
    politicalStatus: position?.requirements?.politicalStatus ?? position?.politicalStatus,
    freshGraduate: freshGraduate && graduationYears.length && /应届/.test(freshGraduate)
      ? `${freshGraduate}（${graduationYears.join('、')}）`
      : freshGraduate || (graduationYears.length ? `应届毕业生（${graduationYears.join('、')}）` : null),
    physicalTest: position?.physicalTest,
    professionalTest: position?.professionalTest,
  };
  return nonEmptyValue(values[field]);
}

export function getPositionEvidenceGrade(position, sourceRegistry) {
  const registry = Array.isArray(sourceRegistry) ? sourceRegistry : [];
  const sourceById = new Map(registry.map((source) => [source.sourceId, source]));
  const linkedSources = (Array.isArray(position?.sources) ? position.sources : [])
    .map((sourceId) => sourceById.get(sourceId))
    .filter(Boolean);

  if (position?.sourceLevel === 'official' || linkedSources.some((source) => source.level === 'official')) return 'A';

  const publishers = new Set(linkedSources
    .filter((source) => source.level === 'secondary')
    .map((source) => String(source.publisher || '未知发布方').trim() || '未知发布方'));
  if (publishers.size > 1) return 'B';
  if (publishers.size === 1) return 'C';
  return 'D';
}

export function filterAndSortPositions(positions, options = {}) {
  const rows = Array.isArray(positions) ? positions : [];
  const year = String(options.year || 'all');
  const orgType = String(options.orgType || 'all');
  const jobType = String(options.jobType || 'all');
  const majorTopic = String(options.majorTopic || 'all');
  const exactFilters = ['unit', 'education', 'politicalStatus', 'freshGraduate', 'physicalTest', 'professionalTest'];
  const recruitmentGroup = String(options.recruitmentGroup || 'all');
  const query = String(options.query || '').trim().toLocaleLowerCase('zh-CN');
  const sortBy = String(options.sortBy || 'year-desc');

  const filtered = rows.filter((position) => {
    if (year !== 'all' && String(position.year) !== year) return false;
    if (orgType !== 'all' && position.orgType !== orgType) return false;
    if (jobType !== 'all' && position.jobType !== jobType) return false;
    const publicManagementStatuses = {
      'public-management': 'explicit',
      'public-management-review': 'manual-review',
      'public-management-unrestricted': 'unrestricted',
      'public-management-not-listed': 'not-listed',
      'public-management-unknown': 'unknown',
    };
    if (publicManagementStatuses[majorTopic]
      && classifyPublicManagementMatch(position).status !== publicManagementStatuses[majorTopic]) return false;
    for (const field of exactFilters) {
      const selected = String(options[field] || 'all');
      if (selected === 'all') continue;
      const value = getPositionFilterValue(position, field);
      if (selected === '__missing' ? value !== null : value !== selected) return false;
    }
    const recruitCount = numericValue(position.recruitCount);
    if (recruitmentGroup === 'one' && recruitCount !== 1) return false;
    if (recruitmentGroup === 'two-or-more' && (recruitCount === null || recruitCount < 2)) return false;
    if (recruitmentGroup === 'missing' && recruitCount !== null) return false;
    if (!query) return true;
    const searchable = [
      position.code,
      position.unit,
      position.title,
      position.orgType,
      position.jobType,
      position.education,
      position.majorText,
      position.eligibilityText,
    ].filter((value) => value !== null && value !== undefined).join(' ').toLocaleLowerCase('zh-CN');
    return searchable.includes(query);
  });

  return filtered.sort((left, right) => {
    if (sortBy === 'recruit-desc') {
      const leftCount = numericValue(left.recruitCount);
      const rightCount = numericValue(right.recruitCount);
      if (leftCount === null && rightCount !== null) return 1;
      if (rightCount === null && leftCount !== null) return -1;
      if (leftCount !== null && rightCount !== null && leftCount !== rightCount) return rightCount - leftCount;
    } else if (sortBy === 'unit-asc') {
      const byUnit = String(left.unit || '').localeCompare(String(right.unit || ''), 'zh-CN');
      if (byUnit) return byUnit;
    } else if (sortBy === 'title-asc') {
      const byTitle = String(left.title || '').localeCompare(String(right.title || ''), 'zh-CN');
      if (byTitle) return byTitle;
    } else {
      const byYear = (numericValue(right.year) ?? -Infinity) - (numericValue(left.year) ?? -Infinity);
      if (byYear) return byYear;
    }
    return String(left.code || '').localeCompare(String(right.code || ''), 'zh-CN');
  });
}

export function getPublicManagementMajorTypes(position) {
  const majorText = String(position?.majorText || '').trim();
  if (!majorText) return [];
  if (/^(不限|不限专业|专业不限|不限制|不限制专业)$/.test(majorText)) return ['unrestricted'];

  const undergraduate = majorText.match(/本科\s*[:：]([\s\S]*?)(?=研究生\s*[:：]|$)/)?.[1] || '';
  const graduate = majorText.match(/研究生\s*[:：]([\s\S]*)$/)?.[1] || '';
  const tags = [];
  if (/公共管理(?:类)?\s*[（(]\s*1204\s*[）)]/.test(undergraduate)) tags.push('undergraduate1204');
  if (/公共管理(?:学)?\s*[（(]\s*1204\s*[）)]/.test(graduate)) tags.push('graduate1204');
  if (/公共管理\s*[（(]\s*1252\s*[）)]/.test(graduate)) tags.push('professional1252');
  return tags;
}

export function classifyPublicManagementMatch(position) {
  const majorText = String(position?.majorText || '').trim();
  if (!majorText) return { status: 'unknown', types: [] };

  const types = getPublicManagementMajorTypes(position).filter((type) => type !== 'unrestricted');
  if (types.length) return { status: 'explicit', types };
  if (getPublicManagementMajorTypes(position).includes('unrestricted')) return { status: 'unrestricted', types: [] };

  const undergraduate = majorText.match(/本科\s*[:：]([\s\S]*?)(?=研究生\s*[:：]|$)/)?.[1] || '';
  const graduate = majorText.match(/研究生\s*[:：]([\s\S]*)$/)?.[1] || '';
  const possibleLevelText = `${undergraduate} ${graduate} ${majorText}`;
  const broadManagement = /(?:管理学|管理类|管理门类)\s*[（(]\s*12\s*[）)]/.test(possibleLevelText);
  const relatedCode = /\b1204\d{2,}[A-Z]{0,2}\b/i.test(possibleLevelText)
    || /\b1252\d{2,}[A-Z]{0,2}\b/i.test(possibleLevelText);
  const relatedName = /公共管理|行政管理|公共事业管理|劳动与社会保障|城市管理|养老服务管理/.test(possibleLevelText);
  if (broadManagement || relatedCode || relatedName) return { status: 'manual-review', types: [] };
  return { status: 'not-listed', types: [] };
}

export function summarizePublicManagementPositions(positions) {
  const rows = Array.isArray(positions) ? positions : [];
  const years = [...new Set(rows.map((position) => Number(position.year)).filter(Number.isFinite))].sort((a, b) => a - b);
  return years.map((year) => {
    const annualRows = rows.filter((position) => Number(position.year) === year);
    const classified = annualRows.map((position) => ({ position, ...classifyPublicManagementMatch(position) }));
    const explicit = classified.filter(({ status }) => status === 'explicit');
    const manualReview = classified.filter(({ status }) => status === 'manual-review');
    const notListed = classified.filter(({ status }) => status === 'not-listed');
    const unknown = classified.filter(({ status }) => status === 'unknown');
    const countByType = (type) => explicit.filter(({ position }) => position.orgType === type).length;
    const countByMajor = (type) => explicit.filter(({ types }) => types.includes(type)).length;
    const recruitCount = (records) => records.reduce((sum, { position }) => {
      if (position.recruitCount === null || position.recruitCount === undefined || position.recruitCount === '') return sum;
      const value = Number(position.recruitCount);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
    return {
      year,
      positionCount: explicit.length,
      recruitCount: recruitCount(explicit),
      manualReviewCount: manualReview.length,
      manualReviewRecruitCount: recruitCount(manualReview),
      notListedCount: notListed.length,
      unknownCount: unknown.length,
      byOrgType: { 区直: countByType('区直'), 街道: countByType('街道'), 镇: countByType('镇') },
      byMajorType: {
        undergraduate1204: countByMajor('undergraduate1204'),
        graduate1204: countByMajor('graduate1204'),
        professional1252: countByMajor('professional1252'),
      },
      unrestrictedCount: classified.filter(({ status }) => status === 'unrestricted').length,
    };
  });
}

export function filterScoreRowsBySegment(scoreRows, positions, segment = 'all') {
  const rows = Array.isArray(scoreRows) ? scoreRows : [];
  const positionRows = Array.isArray(positions) ? positions : [];
  if (segment === 'all') return rows;

  const organizationTypes = { district: '区直', street: '街道', town: '镇' };
  if (organizationTypes[segment]) {
    return rows.filter((row) => row.orgType === organizationTypes[segment]);
  }
  if (!['ordinary', 'enforcement', 'public-management'].includes(segment)) return [];

  return rows.filter((row) => {
    if (!row.positionCode || row.mappingConfidence !== 'high') return false;
    const matches = positionRows.filter((position) => Number(position.year) === Number(row.year)
      && position.code === row.positionCode);
    if (matches.length !== 1) return false;

    const [position] = matches;
    if (position.unit !== row.unit || position.title !== row.title) return false;
    const jobType = String(position.jobType || '').trim();
    const majorText = String(position.majorText || '').trim();
    if (!jobType) return false;
    const isEnforcement = jobType === '行政执法';
    const isPublicManagement = getPublicManagementMajorTypes(position).some((type) => type !== 'unrestricted');
    if (segment === 'enforcement') return isEnforcement;
    if (segment === 'public-management') return isPublicManagement;
    return Boolean(majorText) && !isEnforcement && !isPublicManagement;
  });
}

export function paginateItems(items, requestedPage, requestedPageSize = 25) {
  const rows = Array.isArray(items) ? items : [];
  const pageSize = Math.max(1, Math.floor(numericValue(requestedPageSize) ?? 25));
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const requested = Math.max(1, Math.floor(numericValue(requestedPage) ?? 1));
  const page = Math.min(requested, Math.max(totalPages, 1));
  const offset = (page - 1) * pageSize;
  return {
    items: rows.slice(offset, offset + pageSize),
    page,
    pageSize,
    total,
    totalPages,
    start: total ? offset + 1 : 0,
    end: Math.min(offset + pageSize, total),
  };
}
