const COMPLETENESS_SECTIONS = [
  ['职位基本信息', (position) => hasReportedNumber(position?.year)
    && ['code', 'unit', 'title'].every((field) => hasReportedText(position?.[field]))],
  ['单位与职位类别', (position) => hasReportedText(position?.orgType)
    && hasReportedText(position?.jobType) && position.orgType !== '未知' && position.jobType !== '类别待核'],
  ['招录人数', (position) => hasReportedNumber(position?.recruitCount) && Number(position.recruitCount) > 0],
  ['学历与专业', (position) => hasReportedText(position?.education) && hasReportedText(position?.majorText)],
  ['资格条件完整核验', (position) => position?.eligibilityComplete === true],
  ['岗位级报名观察', (position, dataset) => (Array.isArray(dataset?.observations) ? dataset.observations : [])
    .some((observation) => Number(observation.year) === Number(position?.year)
      && observation.positionCode === position?.code
      && ['applicantsRegistered', 'applicantsQualified', 'applicantsPaid', 'applicantsConfirmed', 'actualTestTakers']
        .some((field) => hasReportedNumber(observation[field]) && Number(observation[field]) >= 0))],
  ['岗位级进面线', (position, dataset) => {
    const matches = (Array.isArray(dataset?.scoreRows) ? dataset.scoreRows : []).filter((row) => (
      Number(row.year) === Number(position?.year)
      && row.positionCode === position?.code
      && row.unit === position?.unit
      && row.title === position?.title
      && row.mappingConfidence === 'high'
      && hasReportedNumber(row.score)
    ));
    return matches.length === 1;
  }],
  ['来源记录', (position, dataset) => {
    const sourceIds = new Set((Array.isArray(dataset?.sources) ? dataset.sources : [])
      .map((source) => source?.sourceId).filter(Boolean));
    const positionSources = Array.isArray(position?.sources) ? position.sources : [];
    return positionSources.length > 0 && positionSources.every((sourceId) => sourceIds.has(sourceId));
  }],
];

function hasReportedText(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  return Boolean(text) && !['待核验', '未知', '不详', '未提供'].includes(text);
}

function hasReportedNumber(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function getPositionDataCompleteness(position, dataset = {}) {
  const present = COMPLETENESS_SECTIONS.map(([, isPresent]) => isPresent(position, dataset));
  const availableSections = present.filter(Boolean).length;
  const identityPresent = present[0];
  const sourcePresent = present[7];
  const grade = !identityPresent || !sourcePresent || availableSections <= 4
    ? '严重缺失'
    : availableSections === COMPLETENESS_SECTIONS.length
      ? '完整'
      : availableSections >= 7
        ? '较完整'
        : '部分';
  return {
    grade,
    availableSections,
    totalSections: COMPLETENESS_SECTIONS.length,
    missingSections: COMPLETENESS_SECTIONS.flatMap(([label], index) => present[index] ? [] : [label]),
  };
}

export function summarizePositionCoverage(dataset, years = [2024, 2025, 2026]) {
  const positions = Array.isArray(dataset?.positions) ? dataset.positions : [];
  const scoreRows = Array.isArray(dataset?.scoreRows) ? dataset.scoreRows : [];
  const scoreSamples = Array.isArray(dataset?.scoreSamples) ? dataset.scoreSamples : [];
  const sources = Array.isArray(dataset?.sources) ? dataset.sources : [];
  return years.map((year) => {
    const visible = positions.filter((position) => Number(position.year) === Number(year));
    const knownRecruitments = visible.filter((position) => Number.isFinite(position.recruitCount) && position.recruitCount >= 0);
    const knownRecruitCount = knownRecruitments.reduce((sum, position) => sum + position.recruitCount, 0);
    const secondarySummary = sources.find((source) => (
      Number(source.year) === Number(year)
      && source.level === 'secondary'
      && source.geographicScope !== 'citywide'
      && Number.isFinite(source.reportedPositionCount)
      && source.reportedPositionCount > 0
    ));
    const secondaryReference = secondarySummary ? {
      sourceId: secondarySummary.sourceId || null,
      reportedPositionCount: secondarySummary.reportedPositionCount,
      reportedRecruitCount: Number.isFinite(secondarySummary.reportedRecruitCount) ? secondarySummary.reportedRecruitCount : null,
      visiblePositionRatio: visible.length / secondarySummary.reportedPositionCount,
      knownRecruitRatio: Number.isFinite(secondarySummary.reportedRecruitCount) && secondarySummary.reportedRecruitCount > 0
        ? knownRecruitCount / secondarySummary.reportedRecruitCount
        : null,
      } : null;
    const unitGaps = Array.isArray(secondarySummary?.positionUnitReferences)
      ? secondarySummary.positionUnitReferences.flatMap((reference) => {
        const unitRows = visible.filter((position) => position.unit === reference.unit);
        const knownUnitRows = unitRows.filter((position) => Number.isFinite(position.recruitCount) && position.recruitCount >= 0);
        const unknownRecruitPositions = unitRows.length - knownUnitRows.length;
        const importedRecruits = knownUnitRows.reduce((sum, position) => sum + position.recruitCount, 0);
        const missingPositions = Number.isFinite(reference.positionCount)
          ? Math.max(0, reference.positionCount - unitRows.length)
          : null;
        const reportedRecruits = Number.isFinite(reference.recruitCount) ? reference.recruitCount : null;
        const missingRecruits = reportedRecruits === null || unknownRecruitPositions > 0
          ? null
          : Math.max(0, reportedRecruits - importedRecruits);
        const hasGap = (missingPositions ?? 0) > 0 || unknownRecruitPositions > 0 || (missingRecruits ?? 0) > 0;
        if (!hasGap) return [];
        return [{
          unit: reference.unit,
          importedPositions: unitRows.length,
          reportedPositions: Number.isFinite(reference.positionCount) ? reference.positionCount : null,
          missingPositions,
          importedRecruits,
          reportedRecruits,
          missingRecruits,
        }];
      })
      : [];
    const rangeSamples = scoreSamples.filter((sample) => Number(sample.year) === Number(year)).map((sample) => ({
      reportedPositions: Number.isFinite(sample.samplePositions) ? sample.samplePositions : null,
      scope: sample.scope || '未注明范围',
      complete: sample.complete === true,
      sourceId: sample.sourceId || null,
    }));
    return {
      year: Number(year),
      visiblePositions: visible.length,
      knownRecruitCount,
      unknownRecruitPositions: visible.length - knownRecruitments.length,
      namedScoreExamples: scoreRows.filter((row) => Number(row.year) === Number(year)).length,
      rangeSamples,
      secondaryReference,
      unitGaps,
      coverageRate: null,
      status: 'INCOMPLETE',
    };
  });
}

export function getCoverageSpotlight(dataset, year = 2026) {
  const [row] = summarizePositionCoverage(dataset, [year]);
  const reference = row?.secondaryReference;
  return {
    year: Number(year),
    importedPositions: row?.visiblePositions ?? 0,
    referencePositions: reference?.reportedPositionCount ?? null,
    importedRecruits: row?.knownRecruitCount ?? 0,
    referenceRecruits: reference?.reportedRecruitCount ?? null,
    positionRatio: reference?.visiblePositionRatio ?? null,
    recruitRatio: reference?.knownRecruitRatio ?? null,
    sourceId: reference?.sourceId ?? null,
    verified: false,
  };
}
