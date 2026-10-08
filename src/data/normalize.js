const ARRAY_FIELDS = ['positions', 'observations', 'sources', 'studyPlan', 'aptitude', 'essay', 'mocks', 'conflicts', 'scoreRows'];

function nullable(value) {
  return value === undefined || value === '' ? null : value;
}

export function normalizeDataset(input) {
  const data = { ...input, ...Object.fromEntries(ARRAY_FIELDS.map((field) => [field, Array.isArray(input?.[field]) ? input[field] : []])) };
  const positionsByCode = new Map(data.positions.map((position) => [position.code, position]));

  data.positions = data.positions.map((position) => ({
    ...position,
    recruitCount: nullable(position.recruitCount),
    sources: Array.isArray(position.sources) ? position.sources : [],
  }));
  data.observations = data.observations.map((observation) => {
    const linkedPosition = positionsByCode.get(observation.positionCode);
    const recruitCount = nullable(observation.recruitCount ?? linkedPosition?.recruitCount);
    const qualified = nullable(observation.applicantsQualified);
    const denominator = typeof recruitCount === 'number' ? recruitCount : Number.NaN;
    const numerator = typeof qualified === 'number' ? qualified : Number.NaN;
    return {
      ...observation,
      applicantsRegistered: nullable(observation.applicantsRegistered),
      applicantsQualified: qualified,
      applicantsPaid: nullable(observation.applicantsPaid),
      applicantsConfirmed: nullable(observation.applicantsConfirmed),
      actualTestTakers: nullable(observation.actualTestTakers),
      recruitCount,
      qualifiedCompetitionRatio: Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
        ? numerator / denominator
        : null,
      unknownRegistrationRatio: nullable(observation.unknownRegistrationRatio),
    };
  });
  return data;
}
