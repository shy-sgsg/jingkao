const GENERAL_KNOWLEDGE_MODULE_ID = 'general_knowledge';

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeGeneralKnowledgeStudy(source = {}) {
  const state = isRecord(source) ? source : {};
  const records = (value) => Array.isArray(value)
    ? value.filter((item) => isRecord(item) && (!item.moduleId || item.moduleId === GENERAL_KNOWLEDGE_MODULE_ID))
      .map((item) => ({ ...item, moduleId: GENERAL_KNOWLEDGE_MODULE_ID }))
    : [];
  const ids = (value) => Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string'))] : [];
  return {
    knowledgeProgress: isRecord(state.knowledgeProgress) ? state.knowledgeProgress : {},
    sessions: records(state.sessions),
    answers: records(state.answers),
    mistakes: isRecord(state.mistakes) ? Object.fromEntries(Object.entries(state.mistakes)
      .filter(([, item]) => isRecord(item) && (!item.moduleId || item.moduleId === GENERAL_KNOWLEDGE_MODULE_ID))
      .map(([id, item]) => [id, { ...item, moduleId: GENERAL_KNOWLEDGE_MODULE_ID }])) : {},
    favorites: ids(state.favorites),
    favoriteKnowledgePointIds: ids(state.favoriteKnowledgePointIds),
    unclearKnowledgePointIds: ids(state.unclearKnowledgePointIds),
    flashcards: records(state.flashcards),
    flashcardReviews: records(state.flashcardReviews),
  };
}

export function setGeneralKnowledgePointStatus(source, pointId, status, at = new Date().toISOString()) {
  if (!pointId) throw new Error('知识点编号不能为空。');
  if (!['learning', 'completed'].includes(status)) throw new Error('知识点学习状态无效。');
  const state = normalizeGeneralKnowledgeStudy(source);
  const previous = state.knowledgeProgress[pointId] || {};
  return {
    ...state,
    knowledgeProgress: {
      ...state.knowledgeProgress,
      [pointId]: { ...previous, status, startedAt: previous.startedAt || at, lastViewedAt: at,
        ...(status === 'completed' ? { completedAt: previous.completedAt || at } : {}) },
    },
  };
}

export function toggleGeneralKnowledgePointFlag(source, pointId, flag = 'favorite') {
  if (!pointId) throw new Error('知识点编号不能为空。');
  const flagKey = flag === 'favorite' ? 'favoriteKnowledgePointIds' : flag === 'unclear' ? 'unclearKnowledgePointIds' : null;
  if (!flagKey) throw new Error('知识点标记类型无效。');
  const state = normalizeGeneralKnowledgeStudy(source);
  const current = state[flagKey];
  return { ...state, [flagKey]: current.includes(pointId) ? current.filter((id) => id !== pointId) : [...current, pointId] };
}

export function toggleGeneralKnowledgeFavorite(source, questionId) {
  if (!questionId) throw new Error('题目编号不能为空。');
  const state = normalizeGeneralKnowledgeStudy(source);
  return { ...state, favorites: state.favorites.includes(questionId) ? state.favorites.filter((id) => id !== questionId) : [...state.favorites, questionId] };
}

export function reviewFlashcard(source, knowledgePointId, rating, now = new Date().toISOString()) {
  if (!knowledgePointId) throw new Error('记忆卡片知识点编号不能为空。');
  if (!['again', 'hard', 'good', 'easy'].includes(rating)) throw new Error('请选择有效的复习评价。');
  const reviewedAt = new Date(now);
  if (!Number.isFinite(reviewedAt.valueOf())) throw new Error('记忆卡片复习时间无效。');
  const state = normalizeGeneralKnowledgeStudy(source);
  const prior = state.flashcards.find((card) => card.knowledgePointId === knowledgePointId) || {
    id: `gk-card-${knowledgePointId}`, moduleId: GENERAL_KNOWLEDGE_MODULE_ID, knowledgePointId,
    repetitions: 0, intervalDays: 0, easeFactor: 2.5,
  };
  let repetitions = Number(prior.repetitions) || 0;
  let easeFactor = Number(prior.easeFactor) || 2.5;
  let intervalDays;
  if (rating === 'again') { repetitions = 0; intervalDays = 1; }
  else if (rating === 'hard') { repetitions += 1; intervalDays = Math.max(1, Math.round((Number(prior.intervalDays) || 1) * 1.2)); easeFactor = Math.max(1.3, easeFactor - 0.15); }
  else if (rating === 'easy') { repetitions += 1; intervalDays = repetitions === 1 ? 3 : Math.max(1, Math.round((Number(prior.intervalDays) || 1) * (easeFactor + 0.4))); easeFactor += 0.15; }
  else { repetitions += 1; intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(1, Math.round((Number(prior.intervalDays) || 1) * easeFactor)); }
  const nextReviewAt = new Date(reviewedAt.valueOf() + intervalDays * 86400000).toISOString();
  const card = { ...prior, moduleId: GENERAL_KNOWLEDGE_MODULE_ID, knowledgePointId, repetitions, intervalDays, easeFactor, lastReviewedAt: reviewedAt.toISOString(), nextReviewAt };
  const history = {
    id: `gk-review-${knowledgePointId}-${reviewedAt.valueOf()}`, moduleId: GENERAL_KNOWLEDGE_MODULE_ID,
    knowledgePointId, rating, intervalDays, reviewedAt: reviewedAt.toISOString(), nextReviewAt,
  };
  return {
    ...state,
    flashcards: [...state.flashcards.filter((item) => item.knowledgePointId !== knowledgePointId), card],
    flashcardReviews: [...state.flashcardReviews, history],
  };
}
