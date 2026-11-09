const FUNCTION_TERMS = [
  '不动产登记', '规划和自然资源', '执法巡查', '行政执法', '综合执法',
  '市场监督管理', '市场监管', '社会保险', '社保基金', '医疗保险', '医保基金',
  '劳动人事争议', '调解仲裁', '劳动关系', '就业服务', '就业经办',
  '投资管理', '固定资产投资', '绩效考评', '预算绩效', '教育管理', '教育教学',
  '乡村建设规划', '农村合作经济', '土地承包', '基金审核', '基金管理',
  '法制管理', '政府采购', '重点项目建设', '城市管理指挥',
];

const POLITICAL_TERMS = ['中共预备党员', '中共党员', '共青团员', '群众'];
const BEIJING_DISTRICTS = [
  '东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区',
  '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区',
];

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizeName(value) {
  return cleanText(value).normalize('NFKC').replace(/[\s,，。．·、/\\()（）]/gu, '');
}

function districtFromNames(...values) {
  const text = values.map(normalizeName).join(' ');
  return BEIJING_DISTRICTS.find((district) => {
    const nameWithoutSuffix = district.replace(/区$/u, '');
    return text.includes(district) || text.includes(`${nameWithoutSuffix}分局`);
  }) || '';
}

function targetDistrictInfo(position) {
  const declared = districtFromNames(position?.workDistrict);
  if (declared) return { name: declared, inferredFromUnit: false };
  const inferred = districtFromNames(position?.departmentName, position?.organizationName, position?.hiringDepartment);
  return { name: inferred, inferredFromUnit: Boolean(inferred) };
}

function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sourceDetails(sourceId, sourceById) {
  if (!sourceId) return null;
  const source = sourceById.get(sourceId);
  if (!source) return { sourceId, title: sourceId, url: '', publisher: '', level: '', accessedAt: '' };
  return {
    sourceId,
    title: cleanText(source.title) || sourceId,
    url: cleanText(source.url),
    publisher: cleanText(source.publisher),
    level: cleanText(source.level),
    accessedAt: cleanText(source.accessedAt),
  };
}

function sourceList(sourceIds, sourceById) {
  return [...new Set((Array.isArray(sourceIds) ? sourceIds : []).filter(Boolean))]
    .map((sourceId) => sourceDetails(sourceId, sourceById))
    .filter(Boolean);
}

function getMajorCodes(position, { current = false } = {}) {
  const codes = new Set();
  const addTextCodes = (value) => {
    for (const match of cleanText(value).matchAll(/[（(]\s*(\d{2,6})\s*[）)]/gu)) codes.add(match[1]);
  };

  if (current) {
    addTextCodes(position.majorRaw);
    return [...codes];
  }

  const collect = (value) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const code = String(value).trim();
      if (/^\d{2,6}$/u.test(code)) codes.add(code);
      else addTextCodes(code);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    if (value && typeof value === 'object') Object.values(value).forEach(collect);
  };

  collect(position.majorCriteria);
  addTextCodes(position.majorText);
  return [...codes];
}

function majorCodeOverlap(targetCodes, historicalCodes) {
  const matches = [];
  for (const targetCode of targetCodes) {
    for (const historicalCode of historicalCodes) {
      if (Math.min(targetCode.length, historicalCode.length) < 2) continue;
      if (targetCode === historicalCode || targetCode.startsWith(historicalCode) || historicalCode.startsWith(targetCode)) {
        matches.push(`${historicalCode} ↔ ${targetCode}`);
      }
    }
  }
  return [...new Set(matches)];
}

function majorTextOverlap(targetMajorText, historicalMajorText) {
  const targetText = cleanText(targetMajorText).normalize('NFKC');
  const historicalText = cleanText(historicalMajorText).normalize('NFKC');
  const unrestricted = /不限|无要求|不限制/u;
  if (!targetText || !historicalText || unrestricted.test(targetText) || unrestricted.test(historicalText)) return [];
  const split = (value) => value.normalize('NFKC').split(/[、,，;；\/\s\n]+/u)
    .map((term) => term.replace(/^(本科|研究生|硕士研究生|博士研究生)[:：]?/u, '')
      .replace(/[（(]\s*\d{2,6}[A-Za-z]{0,2}\s*[）)]/gu, '').replace(/[（()）]/gu, '').trim())
    .filter((term) => term && !unrestricted.test(term))
    .map((term) => normalizeName(term).replace(/类$/u, ''))
    .filter(Boolean);
  const targetTerms = split(targetText);
  const historicalTerms = split(historicalText);
  return [...new Set(targetTerms.filter((term) => historicalTerms.some((other) =>
    term === other || Math.min(term.length, other.length) >= 4 && (term.includes(other) || other.includes(term)))))];
}

function majorRequirementUnrestricted(value) {
  return /不限|无要求|不限制/u.test(cleanText(value).normalize('NFKC'));
}

function departmentSimilarity(target, historical) {
  const targetNames = [target.hiringDepartment, target.departmentName].map(normalizeName).filter(Boolean);
  const historicalName = normalizeName(historical.unit);
  return targetNames.some((name) => name === historicalName
    || Math.min(name.length, historicalName.length) >= 7 && (name.includes(historicalName) || historicalName.includes(name)));
}

function educationLevels(value) {
  const text = cleanText(value).normalize('NFKC');
  if (!text) return [];
  if (/博士/u.test(text)) return [4];
  if (/硕士|研究生/u.test(text)) return /本科或硕士|本科或研究生/u.test(text) ? [2, 3] : [3, 4];
  if (/本科/u.test(text)) return /本科及以上|本科以上|本科或/u.test(text) ? [2, 3, 4] : [2];
  if (/专科|大专/u.test(text)) return /及以上|以上/u.test(text) ? [1, 2, 3, 4] : [1];
  return [];
}

function educationOverlap(targetEducation, historicalEducation) {
  const target = educationLevels(targetEducation);
  const historical = educationLevels(historicalEducation);
  return target.some((level) => historical.includes(level));
}

function positiveConditionClauses(value) {
  return cleanText(value).normalize('NFKC').split(/[；;。\n]+/u)
    .map((clause) => clause.trim())
    .filter((clause) => clause
      && !/(?:未(?:提供|注明|说明|确认|核验|逐码核验)|尚未(?:提供|确认|核验)|待官方|以当年官方|资格条件.{0,6}(?:不完整|未确认)|完整条件.{0,6}(?:待|需))/u.test(clause));
}

function hasPositiveCondition(value, term) {
  return positiveConditionClauses(value).some((clause) => clause.includes(term)
    && !/(?:不限|无(?:要求|限制)|不(?:要求|限|需要)|非应届)/u.test(clause));
}

function explicitPoliticalOverlap(target, historical) {
  const targetText = [target.politicalStatusRaw, target.otherConditionsRaw, target.remarkRaw].map(cleanText).join(' ');
  const historicalText = [historical.politicalStatus, historical.eligibilityText];
  return POLITICAL_TERMS.some((term) => targetText.includes(term)
    && historicalText.some((value) => hasPositiveCondition(value, term)));
}

function explicitRequirementOverlap(target, historical) {
  const targetText = [
    target.freshGraduateRaw, target.existingIdentityRaw, target.grassrootsRequirementRaw,
    target.otherConditionsRaw, target.remarkRaw,
  ].map(cleanText).join(' ').normalize('NFKC');
  const historicalText = historical.eligibilityText;
  const reasons = [];
  if (/应届/u.test(targetText) && hasPositiveCondition(historicalText, '应届')) reasons.push('两岗原文均明确提到应届身份');
  if (/基层工作经历/u.test(targetText) && hasPositiveCondition(historicalText, '基层工作经历')) reasons.push('两岗原文均明确提到基层工作经历');
  return reasons;
}

function roleFunctionMatches(target, historical) {
  const targetText = [
    target.positionTitle, target.positionDescription, target.hiringDepartment,
  ].map(cleanText).join(' ').normalize('NFKC');
  const historicalRoleText = [historical.title, historical.jobType].map(cleanText).join(' ').normalize('NFKC');
  const historicalUnitText = cleanText(historical.unit).normalize('NFKC');
  return FUNCTION_TERMS.flatMap((term) => {
    if (!targetText.includes(term)) return [];
    if (historicalRoleText.includes(term)) return [{ term, basis: '职位名称或类别' }];
    if (historicalUnitText.includes(term)) return [{ term, basis: '目标用人部门与历史招录单位' }];
    return [];
  });
}

function isReliableScoreRow(row, sourceById) {
  if (row?.mappingConfidence !== 'high' || numberValue(row.score) === null) return false;
  const source = sourceById.get(row.sourceId);
  if (source?.year && Number(source.year) !== Number(row.year)) return false;
  const notes = `${cleanText(row.notes)} ${cleanText(source?.notes)}`;
  return !/(?:年份|年号).{0,5}(?:冲突|误写|误称|不一致)|(?:冲突|误写|误称).{0,5}(?:年份|年号)/u.test(notes);
}

function historicalObservations(position, observations, sourceById) {
  const code = String(position.code || '').trim();
  const year = Number(position.year);
  return observations
    .filter((item) => Number(item.year) === year
      && String(item.positionCode || '').trim() === code
      && item.scope === 'position-level'
      && ['registration_snapshot', 'qualified_snapshot'].includes(item.observationType))
    .map((item) => {
      const registration = item.observationType === 'registration_snapshot';
      const count = numberValue(registration ? item.applicantsRegistered : item.applicantsQualified);
      const recruitCount = numberValue(item.recruitCount) ?? numberValue(position.recruitCount);
      return {
        type: item.observationType,
        label: registration ? '报考人数快照' : '资格审查通过人数快照',
        count,
        recruitCount,
        ratio: count !== null && count >= 0 && recruitCount !== null && recruitCount > 0
          ? count / recruitCount : null,
        observedAt: cleanText(item.observedAt) || null,
        notes: cleanText(item.notes),
        source: sourceDetails(item.sourceId, sourceById),
      };
    })
    .sort((left, right) => String(left.observedAt || '').localeCompare(String(right.observedAt || '')));
}

function historicalScores(position, scoreRows, sourceById) {
  const code = String(position.code || '').trim();
  const year = Number(position.year);
  return scoreRows
    .filter((row) => Number(row.year) === year
      && String(row.positionCode || '').trim() === code
      && row.unit === position.unit
      && row.title === position.title
      && isReliableScoreRow(row, sourceById))
    .map((row) => ({
      score: numberValue(row.score),
      notes: cleanText(row.notes),
      mappingConfidence: row.mappingConfidence,
      source: sourceDetails(row.sourceId, sourceById),
    }))
    .sort((left, right) => (right.score ?? -Infinity) - (left.score ?? -Infinity));
}

function enrichHistoricalPosition(position, dataset, sourceById, relation, reasons = []) {
  const observations = Array.isArray(dataset.observations) ? dataset.observations : [];
  const scoreRows = Array.isArray(dataset.scoreRows) ? dataset.scoreRows : [];
  return {
    year: Number(position.year),
    positionCode: String(position.code || ''),
    unit: cleanText(position.unit),
    title: cleanText(position.title),
    recruitCount: numberValue(position.recruitCount),
    education: cleanText(position.education),
    majorText: cleanText(position.majorText),
    district: cleanText(position.districtMatch),
    relation,
    matchReasons: reasons,
    departmentNote: '历年职位记录未细分到用人科室。',
    positionSources: sourceList(position.sources, sourceById),
    observations: historicalObservations(position, observations, sourceById),
    scores: historicalScores(position, scoreRows, sourceById),
  };
}

export function buildBeijingHistoricalComparisons(position, dataset = {}) {
  const historicalPositions = Array.isArray(dataset.positions) ? dataset.positions : [];
  const observations = Array.isArray(dataset.observations) ? dataset.observations : [];
  const scoreRows = Array.isArray(dataset.scoreRows) ? dataset.scoreRows : [];
  const sources = Array.isArray(dataset.sources) ? dataset.sources : [];
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const targetUnit = normalizeName(position?.departmentName);
  const targetTitle = normalizeName(position?.positionTitle);
  const targetDistrictInfoValue = targetDistrictInfo(position);
  const targetDistrict = normalizeName(targetDistrictInfoValue.name);
  const targetCodes = getMajorCodes(position, { current: true });

  if (!targetUnit || !targetTitle) return { directMatches: [], similarMatches: [] };

  const directRows = historicalPositions.filter((historical) =>
    normalizeName(historical.unit) === targetUnit && normalizeName(historical.title) === targetTitle);
  const directIdentities = new Set(directRows.map((historical) => `${historical.year}:${historical.code}`));
  const directMatches = directRows
    .map((historical) => enrichHistoricalPosition(
      historical,
      { observations, scoreRows },
      sourceById,
      'same-unit-title',
      ['历史招录单位与职位名称均相同。'],
    ))
    .sort((left, right) => right.year - left.year || left.positionCode.localeCompare(right.positionCode));

  const similarMatches = historicalPositions.flatMap((historical) => {
    const identity = `${historical.year}:${historical.code}`;
    if (directIdentities.has(identity)) return [];
    const sameUnit = [position?.hiringDepartment, position?.departmentName]
      .some((name) => normalizeName(name) === normalizeName(historical.unit));
    const similarDepartment = !sameUnit && departmentSimilarity(position || {}, historical);
    const historicalDistrict = normalizeName(districtFromNames(historical.districtMatch, historical.unit));
    const sameDistrict = Boolean(targetDistrict && historicalDistrict && targetDistrict === historicalDistrict);
    if (!sameUnit && !similarDepartment && !sameDistrict) return [];

    const functionTerms = roleFunctionMatches(position || {}, historical);
    const historicalCodes = getMajorCodes(historical);
    const majorMatches = majorCodeOverlap(targetCodes, historicalCodes);
    const majorTextMatches = majorTextOverlap(position?.majorRaw, historical.majorText);
    const educationMatches = educationOverlap(position?.educationRaw, historical.education);
    const bothMajorsUnrestricted = majorRequirementUnrestricted(position?.majorRaw)
      && majorRequirementUnrestricted(historical.majorText);
    const politicalMatches = explicitPoliticalOverlap(position || {}, historical);
    const requirementMatches = explicitRequirementOverlap(position || {}, historical);
    const specificConditionMatch = majorMatches.length || majorTextMatches.length || politicalMatches || requirementMatches.length
      || (educationMatches && (sameUnit || similarDepartment))
      || (educationMatches && sameDistrict && bothMajorsUnrestricted);
    if (!specificConditionMatch) return [];

    const reasons = [];
    if (sameUnit) reasons.push('同招录单位');
    else if (similarDepartment) reasons.push('工作部门名称相近');
    if (sameDistrict) {
      reasons.push(targetDistrictInfoValue.inferredFromUnit
        ? `同区县单位名称：${targetDistrictInfoValue.name}（由部门名称推定，非实际地址）`
        : `同工作区县：${targetDistrictInfoValue.name}`);
    }
    if (majorMatches.length) reasons.push(`专业目录代码交集：${majorMatches.join('、')}`);
    if (majorTextMatches.length) reasons.push(`专业要求文本交集：${majorTextMatches.join('、')}`);
    if (bothMajorsUnrestricted) reasons.push('两岗专业要求均不限');
    if (educationMatches) reasons.push('学历层级有交集');
    if (politicalMatches) reasons.push('政治面貌要求相同');
    reasons.push(...requirementMatches);
    if (functionTerms.length) reasons.push(`补充职能依据：${functionTerms.map(({ term }) => term).join('、')}`);

    const enriched = enrichHistoricalPosition(
      historical,
      { observations, scoreRows },
      sourceById,
      'similar-conditions',
      reasons,
    );
    if (!enriched.observations.length && !enriched.scores.length) return [];
    return [{
      ...enriched,
      similarityRank: {
        department: sameUnit ? 3 : similarDepartment ? 2 : 1,
        conditions: majorMatches.length * 4 + majorTextMatches.length * 4
          + Number(politicalMatches) * 3 + requirementMatches.length * 3
          + Number(bothMajorsUnrestricted) * 3 + Number(educationMatches),
        evidence: enriched.observations.length + enriched.scores.length,
      },
    }];
  }).sort((left, right) => {
    return right.similarityRank.conditions - left.similarityRank.conditions
      || right.similarityRank.department - left.similarityRank.department
      || right.similarityRank.evidence - left.similarityRank.evidence
      || right.year - left.year || left.positionCode.localeCompare(right.positionCode);
  });

  return { directMatches, similarMatches };
}
