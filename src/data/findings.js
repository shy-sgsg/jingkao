import { getPublicManagementMajorTypes, summarizePublicManagementPositions } from './positions.js';

const CONFLICT_METRICS = Object.freeze({
  position_count: 'positionCount',
  recruit_count: 'recruitCount',
});

function summarizeMetric(rows, metric) {
  const values = rows
    .filter((row) => row.metric === metric && Number.isFinite(row.value))
    .map((row) => ({ value: Number(row.value), sourceId: row.sourceId || null }));
  return {
    minimum: values.length ? Math.min(...values.map((item) => item.value)) : null,
    maximum: values.length ? Math.max(...values.map((item) => item.value)) : null,
    sourceCount: new Set(values.map((item) => item.sourceId).filter(Boolean)).size,
    values,
  };
}

function summarizeSourceNotes(rows) {
  const bySource = new Map();
  for (const row of rows) {
    if (typeof row.sourceId !== 'string' || !row.sourceId || typeof row.notes !== 'string' || !row.notes.trim()) continue;
    const notes = bySource.get(row.sourceId) || [];
    const note = row.notes.trim();
    if (!notes.includes(note)) notes.push(note);
    bySource.set(row.sourceId, notes);
  }
  return [...bySource].map(([sourceId, notes]) => ({ sourceId, notes }));
}

export function summarizeAnnualConflicts(conflicts, years = [2024, 2025, 2026]) {
  const rows = Array.isArray(conflicts) ? conflicts : [];
  return years.map((year) => {
    const annualRows = rows.filter((row) => Number(row.year) === Number(year));
    const positionCount = summarizeMetric(annualRows, 'position_count');
    const recruitCount = summarizeMetric(annualRows, 'recruit_count');
    const comparableValues = [positionCount, recruitCount].filter((metric) => metric.values.length > 1);
    const hasDifferentValues = comparableValues.some((metric) => metric.minimum !== metric.maximum);
    const attributedSources = new Set(annualRows
      .filter((row) => Number.isFinite(row.value))
      .map((row) => row.sourceId)
      .filter(Boolean));
    const hasValues = positionCount.values.length > 0 || recruitCount.values.length > 0;
    const sourceCount = attributedSources.size;

    return {
      year: Number(year),
      positionCount,
      recruitCount,
      sourceNotes: summarizeSourceNotes(annualRows),
      sourceCount,
      status: !hasValues ? 'unavailable'
        : hasDifferentValues ? 'conflicting'
          : sourceCount === 0 ? 'unattributed'
            : sourceCount === 1 ? 'single-source' : 'aligned',
    };
  });
}

function uniqueSourceIds(rows) {
  return [...new Set((Array.isArray(rows) ? rows : [])
    .flatMap((row) => [row?.sourceId, ...(Array.isArray(row?.sources) ? row.sources : [])])
    .filter((sourceId) => typeof sourceId === 'string' && sourceId))];
}

function countKnownRecruits(rows) {
  const known = rows
    .filter((row) => row.recruitCount !== null && row.recruitCount !== undefined && row.recruitCount !== '')
    .map((row) => Number(row.recruitCount))
    .filter(Number.isFinite);
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function finding(id, topic, icon, title, summary, evidence, sourceIds, href, actionLabel, facts) {
  return { id, topic, icon, title, summary, evidence, sourceIds, href, actionLabel, facts };
}

function conflictDistrict(dataset, conflicts, year) {
  const sources = Array.isArray(dataset?.sources) ? dataset.sources : [];
  const districts = Array.isArray(dataset?.districts) ? dataset.districts : [];
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const scopes = new Set(conflicts
    .filter((row) => Number(row.year) === Number(year))
    .map((row) => sourceById.get(row.sourceId)?.geographicScope)
    .filter(Boolean));
  if (scopes.size !== 1) return null;
  return districts.find((district) => district.name === [...scopes][0]) || null;
}

function matchesSourceDistrictScope(position, district, sourceById) {
  if (position.districtId === district.id) return true;
  const districtLabel = district.name.replace(/区$/, '');
  return (Array.isArray(position.sources) ? position.sources : []).some((sourceId) => {
    const source = sourceById.get(sourceId);
    return source?.districtId === district.id
      || source?.geographicScope === district.name
      || source?.geographicScope === districtLabel
      || String(source?.title || '').includes(districtLabel);
  });
}

export function buildResearchFindings(dataset) {
  const positions = Array.isArray(dataset?.positions) ? dataset.positions : [];
  const observations = Array.isArray(dataset?.observations) ? dataset.observations : [];
  const scoreSamples = Array.isArray(dataset?.scoreSamples) ? dataset.scoreSamples : [];
  const scoreRows = Array.isArray(dataset?.scoreRows) ? dataset.scoreRows : [];
  const conflicts = Array.isArray(dataset?.conflicts) ? dataset.conflicts : [];
  const sources = Array.isArray(dataset?.sources) ? dataset.sources : [];
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const years = [2024, 2025, 2026];
  const annualSummaries = summarizeAnnualConflicts(conflicts, years);
  const findings = [];

  for (const year of [2024, 2025]) {
    const scopeDistrict = conflictDistrict(dataset, conflicts, year);
    const annualPositions = positions.filter((position) => Number(position.year) === year
      && (!scopeDistrict || matchesSourceDistrictScope(position, scopeDistrict, sourceById)));
    const annualSummary = annualSummaries.find((item) => item.year === year);
    const sampleRecruits = countKnownRecruits(annualPositions);
    const reportedPositions = [annualSummary.positionCount.minimum, annualSummary.positionCount.maximum];
    const reportedRecruits = [annualSummary.recruitCount.minimum, annualSummary.recruitCount.maximum];
    const positionRange = reportedPositions[0] === reportedPositions[1]
      ? `${reportedPositions[0]} 岗` : `${reportedPositions[0]}–${reportedPositions[1]} 岗`;
    const recruitRange = reportedRecruits[0] === reportedRecruits[1]
      ? `${reportedRecruits[0]} 人` : `${reportedRecruits[0]}–${reportedRecruits[1]} 人`;
    findings.push(finding(
      `coverage-${year}`,
      '岗位覆盖',
      '↔',
      `${year} 年${scopeDistrict ? `${scopeDistrict.name}来源清单列出 ` : ''}${annualPositions.length} 条职位样例，来源汇总为 ${positionRange}`,
      `当前样例已知招录 ${sampleRecruits ?? '—'} 人；第三方汇总范围为 ${recruitRange}。保留各来源原值，不把样例当作年度全量。`,
      '职位数与招录数在不同镜像来源间存在差异。当前职位库条数是已收录样例，不是官方覆盖分母。',
      uniqueSourceIds([...conflicts.filter((row) => Number(row.year) === year), ...annualPositions]),
      '#/evidence',
      '查看年度覆盖与口径',
      { samplePositions: annualPositions.length, sampleRecruits, reportedPositions, reportedRecruits },
    ));
  }

  const positions2026 = positions.filter((position) => Number(position.year) === 2026);
  const summary2026 = annualSummaries.find((item) => item.year === 2026);
  const scopeDistrict2026 = conflictDistrict(dataset, conflicts, 2026);
  const comparedPositions2026 = positions2026.filter((position) => (
    !scopeDistrict2026 || matchesSourceDistrictScope(position, scopeDistrict2026, sourceById)
  ));
  const sampleRecruits2026 = countKnownRecruits(comparedPositions2026);
  const reportedPositions2026 = [summary2026.positionCount.minimum, summary2026.positionCount.maximum];
  const reportedRecruits2026 = [summary2026.recruitCount.minimum, summary2026.recruitCount.maximum];
  const reportedPositionTotal2026 = summary2026.positionCount.maximum;
  const reportedRecruitTotal2026 = summary2026.recruitCount.maximum;
  findings.push(finding(
    'coverage-2026',
    '岗位覆盖',
    '＋',
    `2026 年${scopeDistrict2026 ? `${scopeDistrict2026.name}来源清单列出 ` : ''}${comparedPositions2026.length} 条岗位样例`,
    `样例已知 ${sampleRecruits2026 ?? '—'} 人；第三方汇总为 ${reportedPositionTotal2026 ?? '—'} 岗 / ${reportedRecruitTotal2026 ?? '—'} 人。差额用于定位待补明细，不代表官方核验结果。`,
    '单位级二手汇总可帮助找到可能缺失的单位；在取得官方职位代码并逐条核对前，不据此补造岗位。',
    uniqueSourceIds([...conflicts.filter((row) => Number(row.year) === 2026), ...comparedPositions2026]),
    '#/evidence',
    '查看单位缺口与数据覆盖',
    {
      samplePositions: comparedPositions2026.length,
      sampleRecruits: sampleRecruits2026,
      reportedPositions: reportedPositions2026,
      reportedRecruits: reportedRecruits2026,
    },
  ));

  const orgTypes = ['区直', '街道', '镇'];
  const orgCounts = Object.fromEntries(orgTypes.map((type) => [
    type,
    positions2026.filter((position) => position.orgType === type).length,
  ]));
  findings.push(finding(
    'organization-mix-2026',
    '岗位覆盖',
    '▦',
    '当前 2026 样例的单位类型构成',
    `${orgTypes.map((type) => `${type} ${orgCounts[type]} 条`).join(' · ')}。这是已收录样例的构成，不代表昌平区年度完整分布。`,
    '按职位库当前的单位类型标签计数；遇到分类或来源差异应回到职位明细核验。',
    uniqueSourceIds(positions2026),
    '#/positions',
    '查看职位样例',
    orgCounts,
  ));

  const managementByYear = summarizePublicManagementPositions(positions);
  const managementFacts = Object.fromEntries(managementByYear.map((item) => [item.year, {
    positions: item.positionCount,
    recruits: item.recruitCount,
    undergraduate1204: item.byMajorType.undergraduate1204,
    graduate1204: item.byMajorType.graduate1204,
    professional1252: item.byMajorType.professional1252,
  }]));
  const managementRows = positions.filter((position) => getPublicManagementMajorTypes(position).some((type) => type !== 'unrestricted'));
  findings.push(finding(
    'public-management-codes',
    '专业资格',
    '⌕',
    '公共管理专业代码在样例中有明确记录',
    managementByYear.map((item) => `${item.year} 年 ${item.positionCount} 岗 / ${item.recruitCount} 人`).join('；') + '。1204 与 1252 等代码可能同时出现在同一岗位，分项不能相加。',
    '仅统计职位专业文本中明确标出的代码；这不是资格判定，最终须逐岗对照官方专业目录与职位表。',
    uniqueSourceIds(managementRows),
    '#/positions',
    '查看公共管理代码专题',
    managementFacts,
  ));

  const latestScoreYear = Math.max(...scoreSamples.map((sample) => Number(sample.year)).filter(Number.isFinite));
  const latestScoreSamples = scoreSamples.filter((sample) => Number(sample.year) === latestScoreYear);
  const latestScoreSample = latestScoreSamples[0];
  if (latestScoreSample) {
    const annualScores = scoreRows.filter((row) => Number(row.year) === latestScoreYear
      && row.score !== null && row.score !== undefined && row.score !== '' && Number.isFinite(Number(row.score)));
    const scores = annualScores.map((row) => Number(row.score));
    const linkedRows = annualScores.filter((row) => row.positionCode
      && row.mappingConfidence === 'high'
      && positions.some((position) => Number(position.year) === Number(row.year)
        && position.code === row.positionCode && position.unit === row.unit && position.title === row.title)).length;
    const ambiguousRows = annualScores.filter((row) => row.mappingConfidence === 'ambiguous').length;
    const unmatchedRows = annualScores.filter((row) => row.mappingConfidence === 'unmatched').length;
    const sampleRecruits = latestScoreSamples.every((sample) => Number.isFinite(Number(sample.sampleRecruits)))
      ? latestScoreSamples.reduce((total, sample) => total + Number(sample.sampleRecruits), 0)
      : null;
    const scopeNames = [...new Set(latestScoreSamples.map((sample) => String(sample.scope || '').replace(/岗位最低进面线部分样本$/, '')).filter(Boolean))];
    const scope = scopeNames.length === 1 ? `${scopeNames[0]}岗位最低进面线部分样本` : `${scopeNames.join('、')}岗位最低进面线部分样本`;
    const minimum = Math.min(...scores);
    const maximum = Math.max(...scores);
    findings.push(finding(
      `score-sample-${latestScoreYear}`,
      '分数样本',
      '⌁',
      `${latestScoreYear} 年具名进面分：${annualScores.length} 条部分样本`,
      `范围 ${minimum}–${maximum} 分，中位数 ${median(scores)} 分；所列区县页面合计称 ${sampleRecruits ?? '—'} 人进入面试。范围覆盖 ${scope}，不代表全市全量分布。`,
      `${linkedRows} 条分数记录可唯一关联到已收录职位代码，${ambiguousRows} 条同名岗位有歧义，${unmatchedRows} 条暂未匹配。未唯一确认的分数不用于具体职位判断。`,
      uniqueSourceIds([...latestScoreSamples, ...annualScores]),
      '#/scenarios',
      '打开分数情景',
      {
        sampleRows: annualScores.length,
        sampleRecruits,
        minimum,
        maximum,
        median: median(scores),
        linkedRows,
        ambiguousRows,
        unmatchedRows,
        scope,
      },
    ));

    const thresholds = [125, 130, 135, 138, 140];
    const thresholdFacts = Object.fromEntries(thresholds.map((threshold) => [
      threshold,
      scores.filter((score) => score <= threshold).length,
    ]));
    findings.push(finding(
      `score-distribution-${latestScoreYear}`,
      '分数样本',
      '⌁',
      '样本分数的累计分布',
      thresholds.map((threshold) => `≤${threshold} 分 ${thresholdFacts[threshold]} / ${scores.length} 条`).join(' · '),
      '这些数字只是第三方可见分数条目的累计分布；样本不完整，不能解释为个人进面概率、岗位录取率或安全分数。',
      uniqueSourceIds([latestScoreSample, ...annualScores]),
      '#/scenarios',
      '查看样本使用边界',
      { sampleRows: scores.length, cumulativeCounts: thresholdFacts },
    ));
  }

  const sampledYears = new Set(scoreSamples.map((sample) => Number(sample.year)));
  const missingScoreYears = years.filter((year) => !sampledYears.has(year));
  findings.push(finding(
    'cutoff-history-gap',
    '分数样本',
    '◷',
    missingScoreYears.length ? `${missingScoreYears.join('、')} 年暂无具名进面分样本` : '已收录年度均有具名进面分样本',
    missingScoreYears.length
      ? '目前不能据此比较不同年度的岗位进面分变化，也不能把笔试合格线当成岗位实际进面线。'
      : '具名分数样本年度已覆盖当前列出的招考年度；仍须查看每个样本自己的完整度标记。',
    '只有 source registry 中明确登记的岗位名分数样本才纳入；缺失年度不会补成 0 分。',
    uniqueSourceIds([...scoreSamples, ...scoreRows]),
    '#/sources',
    '查看分数来源与口径',
    { missingYears: missingScoreYears, sampledYears: [...sampledYears].sort((a, b) => a - b) },
  ));

  const structuredRequirements = positions2026.filter((position) => position.requirements && Object.keys(position.requirements).length > 0).length;
  const completeEligibility = positions2026.filter((position) => position.eligibilityComplete === true).length;
  const officialPositionRows = positions.filter((position) => position.sourceLevel === 'official').length;
  findings.push(finding(
    'qualification-coverage',
    '专业资格',
    '✓',
    '资格条件已结构化记录的岗位仍有限',
    `2026 年 ${structuredRequirements} / ${positions2026.length} 条样例有结构化要求字段；完整资格标记 ${completeEligibility} 条，直接标为官方来源的职位记录 ${officialPositionRows} 条。`,
    '字段存在不等于条件完整，也不等于官方核验。当前资料不足以对任一用户给出最终可报结论。',
    uniqueSourceIds(positions2026),
    '#/assistant',
    '用选岗助手逐项核验',
    {
      positions: positions2026.length,
      structuredRequirements,
      completeEligibility,
      officialPositionRows,
    },
  ));

  const positionLevelObservations = observations.filter((item) => item.positionCode !== null
    && item.positionCode !== undefined && item.positionCode !== '').length;
  const positionLevelCodes = new Set(observations
    .filter((item) => item.positionCode !== null && item.positionCode !== undefined && item.positionCode !== '')
    .map((item) => item.positionCode));
  const aggregateObservations = observations.length - positionLevelObservations;
  findings.push(finding(
    'competition-grain',
    '报考竞争',
    '↔',
    positionLevelObservations ? '已收录岗位级资格审查快照，仍非最终竞争情况' : '竞争观察目前停留在区级汇总',
    `${observations.length} 条报名 / 竞争观察中，岗位级快照 ${positionLevelObservations} 条，覆盖 ${positionLevelCodes.size} 个职位代码；其余 ${aggregateObservations} 条为全市、区级或单位级汇总。`,
    positionLevelObservations
      ? '岗位级数据为第三方转载的资格审查通过人数，且多个时点属于同一职位的重复快照；全市总比按过审人数/计划招录人数计算，不是岗位竞争比的简单平均。以上均不等于最终报名、缴费或实考人数，也不能据此推断考试概率。'
      : '资格审查人数、报道平均竞争比和岗位计划人数不是同一统计口径；现有数据不能据此给具体单位或岗位排名。',
    uniqueSourceIds(observations),
    '#/evidence',
    '查看报名观察与口径',
    {
      observations: observations.length,
      jobLevelObservations: positionLevelObservations,
      aggregateObservations,
      jobLevelPositions: positionLevelCodes.size,
    },
  ));

  return findings;
}
