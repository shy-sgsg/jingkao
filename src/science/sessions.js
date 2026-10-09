import { filterQuestions } from './questions.js';

function normalizeStudy(scienceStudy = {}) {
  return {
    knowledgeProgress: scienceStudy.knowledgeProgress && typeof scienceStudy.knowledgeProgress === 'object' ? scienceStudy.knowledgeProgress : {},
    sessions: Array.isArray(scienceStudy.sessions) ? scienceStudy.sessions : [],
    answers: Array.isArray(scienceStudy.answers) ? scienceStudy.answers : [],
    mistakes: scienceStudy.mistakes && typeof scienceStudy.mistakes === 'object' ? scienceStudy.mistakes : {},
    favorites: Array.isArray(scienceStudy.favorites) ? scienceStudy.favorites : [],
    favoriteKnowledgePointIds: Array.isArray(scienceStudy.favoriteKnowledgePointIds) ? scienceStudy.favoriteKnowledgePointIds : [],
    unclearKnowledgePointIds: Array.isArray(scienceStudy.unclearKnowledgePointIds) ? scienceStudy.unclearKnowledgePointIds : [],
  };
}

function findSession(scienceStudy, sessionId) {
  const session = scienceStudy.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error('找不到这次科学推理练习。');
  if (session.status !== 'active') throw new Error('这次科学推理练习已经结束。');
  return session;
}

function questionSourcePriority(question) {
  return ({
    official_outline_example: 0,
    verified_exam: 0,
    recalled: 1,
    third_party_mock: 2,
    licensed: 3,
    original: 4,
  })[question.sourceType] ?? 5;
}

export function createScienceSession(bank, sourceStudy, options = {}, { id, now = new Date().toISOString() } = {}) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const mode = options.mode === 'exam' ? 'exam' : 'practice';
  const targetQuestionCount = Number(options.targetQuestionCount);
  if (!Number.isInteger(targetQuestionCount) || targetQuestionCount < 1) {
    throw new Error('练习题量必须是大于 0 的整数。');
  }
  const filters = {
    subjectId: options.subjectId || undefined,
    topicId: options.topicId || undefined,
    knowledgePointId: options.knowledgePointId || options.knowledgePointIds?.[0] || undefined,
    difficulty: options.difficultyFilter && options.difficultyFilter !== 'all' ? options.difficultyFilter : undefined,
    sourceType: options.sourceFilter && options.sourceFilter !== 'all' ? options.sourceFilter : undefined,
    region: options.region || undefined,
    examYear: options.examYear || undefined,
    onlyUnanswered: options.onlyUnanswered === true,
    onlyMistakes: options.onlyMistakes === true,
    onlyFavorites: options.onlyFavorites === true,
    excludeQuestionIds: Array.isArray(options.excludeQuestionIds) ? options.excludeQuestionIds : [],
    answeredQuestionIds: scienceStudy.answers.map((answer) => answer.questionId),
    mistakeQuestionIds: Object.keys(scienceStudy.mistakes),
    favoriteQuestionIds: scienceStudy.favorites,
  };
  const sourcePriority = Array.isArray(options.sourcePriorityOrder)
    ? new Map(options.sourcePriorityOrder.map((sourceType, index) => [sourceType, index]))
    : null;
  const candidates = filterQuestions((Array.isArray(bank) ? bank : []).filter((question) => question.publishStatus === 'published'), filters)
    .sort((left, right) => sourcePriority
      ? (sourcePriority.get(left.sourceType) ?? 999) - (sourcePriority.get(right.sourceType) ?? 999)
      : questionSourcePriority(left) - questionSourcePriority(right));
  if (candidates.length < targetQuestionCount) {
    throw new Error(`当前筛选仅有 ${candidates.length} 道可用题目，少于目标题量 ${targetQuestionCount}。`);
  }
  const questionIds = candidates.slice(0, targetQuestionCount).map((question) => question.id);
  const startedAt = new Date(now);
  if (!Number.isFinite(startedAt.valueOf())) throw new Error('练习开始时间无效。');
  const durationSeconds = mode === 'exam' ? Number(options.durationSeconds) : null;
  if (mode === 'exam' && (!Number.isFinite(durationSeconds) || durationSeconds < 60)) {
    throw new Error('限时模拟时长至少为 1 分钟。');
  }
  const session = {
    id: id || `science_${startedAt.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    mode,
    status: 'active',
    planTaskId: options.planTaskId || null,
    questionIds,
    currentIndex: 0,
    correctCount: 0,
    reviewingAnswerId: null,
    draftAnswers: {},
    startedAt: startedAt.toISOString(),
    deadline: mode === 'exam' ? new Date(startedAt.valueOf() + durationSeconds * 1000).toISOString() : null,
    durationSeconds,
    filters,
  };
  const updated = { ...scienceStudy, sessions: [...scienceStudy.sessions, session] };
  return { scienceStudy: updated, session };
}

export function answerScienceQuestion(bank, sourceStudy, sessionId, selectedOptionId, { now = new Date().toISOString() } = {}) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const session = findSession(scienceStudy, sessionId);
  if (session.deadline && new Date(now).valueOf() >= new Date(session.deadline).valueOf()) {
    throw new Error('考试时间已结束。');
  }
  if (session.mode === 'exam') throw new Error('正式模拟请先选择答案，再继续或交卷。');
  if (session.reviewingAnswerId) throw new Error('尚未完成上一题复盘。');
  const questionId = session.questionIds[session.currentIndex];
  const question = (Array.isArray(bank) ? bank : []).find((item) => item.id === questionId);
  if (!question) throw new Error('题目数据缺失，无法保存本题答案。');
  if (!question.options.some((option) => option.id === selectedOptionId)) throw new Error('请选择一个有效选项。');
  const answerId = `answer_${session.id}_${session.currentIndex + 1}`;
  if (scienceStudy.answers.some((answer) => answer.id === answerId)) throw new Error('本题答案已保存。');
  const answer = {
    id: answerId,
    sessionId: session.id,
    questionId,
    selectedOptionId,
    correctAnswer: question.correctAnswer,
    isCorrect: selectedOptionId === question.correctAnswer,
    mode: 'practice',
    answeredAt: new Date(now).toISOString(),
    knowledgePointIds: [...(question.knowledgePointIds || [])],
  };
  const mistakes = { ...scienceStudy.mistakes };
  if (!answer.isCorrect) {
    const previous = mistakes[questionId] || { count: 0, firstMissedAt: answer.answeredAt };
    mistakes[questionId] = {
      ...previous,
      count: previous.count + 1,
      lastMissedAt: answer.answeredAt,
      lastSelectedOptionId: selectedOptionId,
      correctAnswer: question.correctAnswer,
    };
  }
  const sessions = scienceStudy.sessions.map((item) => item.id === session.id ? {
    ...item,
    reviewingAnswerId: answerId,
    correctCount: item.correctCount + Number(answer.isCorrect),
  } : item);
  return { scienceStudy: { ...scienceStudy, sessions, answers: [...scienceStudy.answers, answer], mistakes }, answer };
}

export function continueScienceSession(bank, sourceStudy, sessionId, { now = new Date().toISOString() } = {}) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const existing = scienceStudy.sessions.find((item) => item.id === sessionId);
  if (!existing) throw new Error('找不到这次科学推理练习。');
  if (existing.deadline && new Date(now).valueOf() >= new Date(existing.deadline).valueOf()) {
    return expireScienceSession(bank, scienceStudy, sessionId, { now });
  }
  if (existing.mode === 'exam') return advanceExamQuestion(scienceStudy, sessionId);
  const session = findSession(scienceStudy, sessionId);
  if (!session.reviewingAnswerId) throw new Error('请先提交当前题目，再继续。');
  const currentIndex = session.currentIndex + 1;
  const isComplete = currentIndex >= session.questionIds.length;
  return {
    ...scienceStudy,
    sessions: scienceStudy.sessions.map((item) => item.id === session.id ? {
      ...item,
      currentIndex,
      reviewingAnswerId: null,
      status: isComplete ? 'completed' : 'active',
      completedAt: isComplete ? new Date(now).toISOString() : null,
    } : item),
  };
}

export function selectExamAnswer(bank, sourceStudy, sessionId, selectedOptionId, { now = new Date().toISOString() } = {}) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const session = findSession(scienceStudy, sessionId);
  if (session.mode !== 'exam') throw new Error('只有正式模拟支持先选答案、后统一交卷。');
  if (session.deadline && new Date(now).valueOf() >= new Date(session.deadline).valueOf()) throw new Error('考试时间已结束。');
  const questionId = session.questionIds[session.currentIndex];
  if (!questionId) throw new Error('请返回一道题目，再修改答案。');
  const answerQuestion = (Array.isArray(bank) ? bank : []).find((question) => question.id === questionId);
  if (!answerQuestion || !answerQuestion.options.some((option) => option.id === selectedOptionId)) throw new Error('请选择一个有效选项。');
  const current = session.draftAnswers || {};
  return {
    ...scienceStudy,
    sessions: scienceStudy.sessions.map((item) => item.id === session.id ? {
      ...item,
      draftAnswers: { ...current, [questionId]: { optionId: selectedOptionId, selectedAt: new Date(now).toISOString() } },
    } : item),
  };
}

export function advanceExamQuestion(sourceStudy, sessionId) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const session = findSession(scienceStudy, sessionId);
  if (session.mode !== 'exam') throw new Error('这不是正式模拟。');
  return {
    ...scienceStudy,
    sessions: scienceStudy.sessions.map((item) => item.id === session.id ? {
      ...item,
      currentIndex: Math.min(item.currentIndex + 1, item.questionIds.length),
    } : item),
  };
}

export function goToExamQuestion(sourceStudy, sessionId, index) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const session = findSession(scienceStudy, sessionId);
  if (session.mode !== 'exam') throw new Error('这不是正式模拟。');
  if (!Number.isInteger(index) || index < 0 || index >= session.questionIds.length) throw new Error('所选题号无效。');
  return {
    ...scienceStudy,
    sessions: scienceStudy.sessions.map((item) => item.id === session.id ? { ...item, currentIndex: index } : item),
  };
}

export function finishExamSession(bank, sourceStudy, sessionId, { now = new Date().toISOString(), status = 'completed' } = {}) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const session = scienceStudy.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error('找不到这次科学推理练习。');
  if (session.status !== 'active') return scienceStudy;
  if (session.mode !== 'exam') throw new Error('只有正式模拟可以统一交卷。');
  const submittedAt = new Date(now).toISOString();
  const timedOut = status === 'timed_out' || (session.deadline && new Date(now).valueOf() >= new Date(session.deadline).valueOf());
  const answers = [];
  const mistakes = { ...scienceStudy.mistakes };
  for (const [index, questionId] of session.questionIds.entries()) {
    const selection = session.draftAnswers?.[questionId];
    if (!selection) continue;
    const question = (Array.isArray(bank) ? bank : []).find((item) => item.id === questionId);
    if (!question) continue;
    const answer = {
      id: `answer_${session.id}_${question.id}`,
      sessionId: session.id,
      questionId,
      selectedOptionId: selection.optionId,
      correctAnswer: question.correctAnswer,
      isCorrect: selection.optionId === question.correctAnswer,
      mode: 'exam',
      answeredAt: selection.selectedAt || submittedAt,
      submittedAt,
      questionIndex: index,
      knowledgePointIds: [...(question.knowledgePointIds || [])],
    };
    answers.push(answer);
    if (!answer.isCorrect) {
      const previous = mistakes[questionId] || { count: 0, firstMissedAt: answer.answeredAt };
      mistakes[questionId] = {
        ...previous, count: previous.count + 1, lastMissedAt: answer.answeredAt,
        lastSelectedOptionId: selection.optionId, correctAnswer: question.correctAnswer,
      };
    }
  }
  const existingIds = new Set(scienceStudy.answers.map((answer) => answer.id));
  const newAnswers = answers.filter((answer) => !existingIds.has(answer.id));
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const answeredCount = answers.length;
  const unansweredCount = session.questionIds.length - answeredCount;
  const finalSession = {
    ...session,
    status: timedOut ? 'timed_out' : 'completed',
    correctCount,
    answeredCount,
    unansweredCount,
    scoreRate: session.questionIds.length ? correctCount / session.questionIds.length : null,
    answeredAccuracy: answeredCount ? correctCount / answeredCount : null,
    submittedAt,
    completedAt: submittedAt,
    reviewingAnswerId: null,
  };
  return {
    ...scienceStudy,
    sessions: scienceStudy.sessions.map((item) => item.id === session.id ? finalSession : item),
    answers: [...scienceStudy.answers, ...newAnswers],
    mistakes,
  };
}

export function expireScienceSession(bank, sourceStudy, sessionId, { now = new Date().toISOString() } = {}) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const session = scienceStudy.sessions.find((item) => item.id === sessionId);
  if (!session || session.status !== 'active' || !session.deadline
    || new Date(now).valueOf() < new Date(session.deadline).valueOf()) return scienceStudy;
  if (session.mode === 'exam') return finishExamSession(bank, scienceStudy, sessionId, { now, status: 'timed_out' });
  const expiredAt = new Date(now).toISOString();
  return {
    ...scienceStudy,
    sessions: scienceStudy.sessions.map((item) => item.id === session.id ? {
      ...item, status: 'timed_out', completedAt: expiredAt, reviewingAnswerId: null,
    } : item),
  };
}

export function getScienceStats(sourceStudy) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const sessionById = new Map(scienceStudy.sessions.map((session) => [session.id, session]));
  const practiceAnswers = scienceStudy.answers.filter((answer) => sessionById.get(answer.sessionId)?.mode === 'practice');
  const examAnswers = scienceStudy.answers.filter((answer) => sessionById.get(answer.sessionId)?.mode === 'exam');
  const attemptedCount = scienceStudy.answers.length;
  const correctCount = scienceStudy.answers.filter((answer) => answer.isCorrect === true).length;
  const practiceCorrect = practiceAnswers.filter((answer) => answer.isCorrect === true).length;
  const examCorrect = examAnswers.filter((answer) => answer.isCorrect === true).length;
  const examSessions = scienceStudy.sessions.filter((session) => session.mode === 'exam' && ['completed', 'timed_out'].includes(session.status));
  const examQuestionCount = examSessions.reduce((sum, session) => sum + session.questionIds.length, 0);
  return {
    sessionCount: scienceStudy.sessions.length,
    completedSessionCount: scienceStudy.sessions.filter((session) => session.status === 'completed').length,
    attemptedCount,
    correctCount,
    accuracy: attemptedCount ? correctCount / attemptedCount : null,
    practice: {
      sessionCount: scienceStudy.sessions.filter((session) => session.mode === 'practice').length,
      attemptedCount: practiceAnswers.length,
      correctCount: practiceCorrect,
      accuracy: practiceAnswers.length ? practiceCorrect / practiceAnswers.length : null,
    },
    exam: {
      sessionCount: scienceStudy.sessions.filter((session) => session.mode === 'exam').length,
      completedSessionCount: examSessions.length,
      questionCount: examQuestionCount,
      answeredCount: examAnswers.length,
      correctCount: examCorrect,
      unansweredCount: Math.max(0, examQuestionCount - examAnswers.length),
      scoreRate: examQuestionCount ? examCorrect / examQuestionCount : null,
      answeredAccuracy: examAnswers.length ? examCorrect / examAnswers.length : null,
    },
    mistakeCount: Object.keys(scienceStudy.mistakes).length,
    favoriteCount: scienceStudy.favorites.length,
  };
}

export function toggleScienceFavorite(sourceStudy, questionId) {
  const scienceStudy = normalizeStudy(sourceStudy);
  const exists = scienceStudy.favorites.includes(questionId);
  return {
    ...scienceStudy,
    favorites: exists ? scienceStudy.favorites.filter((id) => id !== questionId) : [...scienceStudy.favorites, questionId],
  };
}
