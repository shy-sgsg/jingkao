const SOURCE_TYPES = new Set(['official_outline_example', 'verified_exam', 'recalled', 'third_party_mock', 'original']);
const ALLOWED_PUBLISHED_RIGHTS = new Set(['original', 'adapted_public_source', 'licensed']);

export function filterGeneralKnowledgeQuestions(bank, filters = {}) {
  const answered = new Set(filters.answeredQuestionIds || []);
  const mistakes = new Set(filters.mistakeQuestionIds || []);
  const favorites = new Set(filters.favoriteQuestionIds || []);
  const excluded = new Set(filters.excludeQuestionIds || []);
  const sourceTypes = filters.sourceType === 'official' ? new Set(['official_outline_example', 'verified_exam']) : null;
  return (Array.isArray(bank) ? bank : []).filter((question) => {
    if (question.moduleId !== 'general_knowledge' || question.publishStatus !== 'published') return false;
    if (filters.subjectId && question.subjectId !== filters.subjectId) return false;
    if (filters.topicId && question.topicId !== filters.topicId) return false;
    if (filters.knowledgePointId && !(question.knowledgePointIds || []).includes(filters.knowledgePointId)) return false;
    if (filters.difficulty && filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) return false;
    if (filters.sourceType && filters.sourceType !== 'all'
      && !(sourceTypes ? sourceTypes.has(question.sourceType) : question.sourceType === filters.sourceType)) return false;
    if (filters.region && filters.region !== 'all' && question.region !== filters.region) return false;
    if (filters.examYear && filters.examYear !== 'all' && String(question.examYear) !== String(filters.examYear)) return false;
    if (filters.onlyUnanswered && answered.has(question.id)) return false;
    if (filters.onlyMistakes && !mistakes.has(question.id)) return false;
    if (filters.onlyFavorites && !favorites.has(question.id)) return false;
    if (excluded.has(question.id)) return false;
    return true;
  });
}

export function validateGeneralKnowledgeQuestionBank(bank, { knowledgePointIds = [], sourceIds = [] } = {}) {
  const issues = [];
  const ids = new Set();
  const points = new Set(knowledgePointIds);
  const sources = new Set(sourceIds);
  for (const [index, question] of (Array.isArray(bank) ? bank : []).entries()) {
    const add = (code, message) => issues.push({ index, id: question?.id || null, code, message });
    if (!question || typeof question !== 'object' || Array.isArray(question)) { add('invalid_record', '题目记录格式无效。'); continue; }
    if (!question.id || typeof question.id !== 'string') add('missing_id', '题目编号不能为空。');
    else if (ids.has(question.id)) add('duplicate_id', '题目编号重复。');
    else ids.add(question.id);
    if (question.moduleId !== 'general_knowledge') add('invalid_module', '题目必须归属常识判断模块。');
    if (!question.subjectId || !question.topicId) add('missing_taxonomy', '题目缺少学科或专题。');
    if (!Array.isArray(question.knowledgePointIds) || !question.knowledgePointIds.length) add('missing_knowledge_point', '题目至少关联一个知识点。');
    else if (points.size && question.knowledgePointIds.some((id) => !points.has(id))) add('unknown_knowledge_point', '题目引用了不存在的知识点。');
    if (typeof question.stem !== 'string' || !question.stem.trim()) add('missing_stem', '题干不能为空。');
    if (!Array.isArray(question.options) || question.options.length < 2) add('invalid_options', '题目至少需要两个选项。');
    else {
      const optionIds = question.options.map((option) => option?.id);
      if (optionIds.some((id) => typeof id !== 'string' || !id) || new Set(optionIds).size !== optionIds.length) add('invalid_options', '选项编号必须非空且唯一。');
      if (!optionIds.includes(question.correctAnswer)) add('invalid_answer', '正确答案必须对应一个有效选项。');
    }
    if (typeof question.explanation !== 'string' || !question.explanation.trim()) add('missing_explanation', '题目缺少解析。');
    if (!SOURCE_TYPES.has(question.sourceType)) add('invalid_source_type', '题源类别无效。');
    if (!question.sourceId || (sources.size && !sources.has(question.sourceId))) add('invalid_source', '题目来源不存在。');
    if (question.sourceType !== 'original' && !question.sourceNote) add('missing_source_note', '来源题需要说明出处或改写方式。');
    if (question.publishStatus === 'published') {
      if (question.verificationStatus !== 'verified') add('unverified_publish', '未核验题目不能发布。');
      if (!ALLOWED_PUBLISHED_RIGHTS.has(question.copyrightStatus)) add('rights_unresolved', '展示授权未确认的题目不能发布。');
    }
  }
  return { valid: issues.length === 0, issues };
}
