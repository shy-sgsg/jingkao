const VALID_SOURCE_TYPES = new Set(['original', 'verified_exam', 'recalled', 'official_outline_example', 'third_party_mock', 'licensed']);
const VALID_VERIFICATION_STATES = new Set(['verified', 'pending', 'unverified']);
const VALID_COPYRIGHT_STATES = new Set(['original', 'licensed', 'reference_only', 'unknown']);

export function filterQuestions(bank, filters = {}) {
  const answered = new Set(filters.answeredQuestionIds || []);
  const excluded = new Set(filters.excludeQuestionIds || []);
  const mistakes = new Set(filters.mistakeQuestionIds || []);
  const favorites = new Set(filters.favoriteQuestionIds || []);
  const sourceTypes = Array.isArray(filters.sourceType)
    ? new Set(filters.sourceType)
    : filters.sourceType === 'official'
      ? new Set(['verified_exam', 'official_outline_example'])
      : filters.sourceType ? new Set([filters.sourceType]) : null;
  return bank.filter((question) => {
    if (excluded.has(question.id)) return false;
    if (filters.subjectId && question.subjectId !== filters.subjectId) return false;
    if (filters.topicId && question.topicId !== filters.topicId) return false;
    if (filters.knowledgePointId && !question.knowledgePointIds?.includes(filters.knowledgePointId)) return false;
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false;
    if (sourceTypes && !sourceTypes.has(question.sourceType)) return false;
    if (filters.region && question.region !== filters.region) return false;
    if (filters.examYear && Number(question.examYear) !== Number(filters.examYear)) return false;
    if (filters.onlyUnanswered && answered.has(question.id)) return false;
    if (filters.onlyMistakes && !mistakes.has(question.id)) return false;
    if (filters.onlyFavorites && !favorites.has(question.id)) return false;
    return true;
  });
}

export function validateQuestionBank(bank, { knowledgePointIds = [], sourceIds = [] } = {}) {
  const issues = [];
  const seenIds = new Set();
  const knownKnowledgePoints = new Set(knowledgePointIds);
  const knownSources = new Set(sourceIds);

  for (const question of Array.isArray(bank) ? bank : []) {
    const id = typeof question?.id === 'string' ? question.id : '';
    if (!id) {
      issues.push({ questionId: null, field: 'id', code: 'missing_id' });
    } else if (seenIds.has(id)) {
      issues.push({ questionId: id, field: 'id', code: 'duplicate_id' });
    } else {
      seenIds.add(id);
    }

    if (!String(question?.stem || '').trim()) issues.push({ questionId: id || null, field: 'stem', code: 'missing_stem' });
    if (!Array.isArray(question?.options) || question.options.length !== 4) {
      issues.push({ questionId: id || null, field: 'options', code: 'invalid_options' });
    }
    const optionIds = new Set((question?.options || []).map((option) => option?.id));
    if (!question?.correctAnswer || !optionIds.has(question.correctAnswer)) {
      issues.push({ questionId: id || null, field: 'correctAnswer', code: 'invalid_answer' });
    }
    if (!String(question?.explanation || '').trim()) issues.push({ questionId: id || null, field: 'explanation', code: 'missing_explanation' });
    if (!Array.isArray(question?.knowledgePointIds) || question.knowledgePointIds.length === 0) {
      issues.push({ questionId: id || null, field: 'knowledgePointIds', code: 'missing_knowledge_point' });
    } else if (knownKnowledgePoints.size && question.knowledgePointIds.some((pointId) => !knownKnowledgePoints.has(pointId))) {
      issues.push({ questionId: id || null, field: 'knowledgePointIds', code: 'unknown_knowledge_point' });
    }
    if (!VALID_SOURCE_TYPES.has(question?.sourceType)) issues.push({ questionId: id || null, field: 'sourceType', code: 'invalid_source_type' });
    if (!VALID_VERIFICATION_STATES.has(question?.verificationStatus)) issues.push({ questionId: id || null, field: 'verificationStatus', code: 'invalid_verification_status' });
    if (!VALID_COPYRIGHT_STATES.has(question?.copyrightStatus)) issues.push({ questionId: id || null, field: 'copyrightStatus', code: 'invalid_copyright_status' });
    if (knownSources.size && question?.sourceId && !knownSources.has(question.sourceId)) {
      issues.push({ questionId: id || null, field: 'sourceId', code: 'unknown_source' });
    }
    const referencePublication = ['official_outline_example', 'recalled', 'third_party_mock'].includes(question?.sourceType)
      && question?.copyrightStatus === 'reference_only'
      && Boolean(question?.sourceId)
      && (!knownSources.size || knownSources.has(question.sourceId));
    if (question?.publishStatus === 'published'
      && (question.verificationStatus !== 'verified'
        || (!['original', 'licensed'].includes(question.copyrightStatus) && !referencePublication)
        || (question.sourceType === 'verified_exam' && (!question.sourceId || !knownSources.has(question.sourceId))))) {
      issues.push({ questionId: id || null, field: 'publishStatus', code: 'unpublishable_source' });
    }
  }

  return { valid: issues.length === 0, issues, questionCount: Array.isArray(bank) ? bank.length : 0 };
}
