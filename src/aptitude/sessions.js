import {
  answerScienceQuestion,
  continueScienceSession,
  createScienceSession,
  finishExamSession,
  goToExamQuestion,
  selectExamAnswer,
} from '../science/sessions.js';
import { randomizeQuestionGroups } from '../science/questions.js';
import { getAptitudeModule } from './modules.js';
import { normalizeAptitudeModuleStudies, setAptitudeModulePointStatus } from './persistence.js';

function requireStudyModule(moduleId) {
  const module = getAptitudeModule(moduleId);
  if (!module || module.studyStore !== 'aptitudeModuleStudies') throw new Error(`行测模块 ${moduleId} 没有通用练习会话。`);
  return module;
}

function moduleQuestions(bank, moduleId) {
  return (Array.isArray(bank) ? bank : []).filter((question) => question?.moduleId === moduleId
    && question.publishStatus === 'published');
}

function identifyStudy(source, moduleId) {
  const study = normalizeAptitudeModuleStudies({ [moduleId]: source })[moduleId];
  return {
    ...study,
    sessions: study.sessions.map((session) => ({ ...session, moduleId })),
    answers: study.answers.map((answer) => ({ ...answer, moduleId })),
    mistakes: Object.fromEntries(Object.entries(study.mistakes).map(([id, mistake]) => [id, { ...mistake, moduleId }])),
  };
}

function studiesWith(source, moduleId, study) {
  return { ...normalizeAptitudeModuleStudies(source), [moduleId]: identifyStudy(study, moduleId) };
}

function sessionFor(source, moduleId, sessionId) {
  requireStudyModule(moduleId);
  const session = normalizeAptitudeModuleStudies(source)[moduleId].sessions.find((item) => item.id === sessionId);
  if (!session || session.moduleId !== moduleId) throw new Error('找不到这次行测练习。');
  return session;
}

export function randomizeLegacyAptitudePracticeSession(session, bank) {
  if (!session || session.mode !== 'practice' || session.status !== 'active' || session.randomizedQuestionOrder === true) return session;
  const questionIds = Array.isArray(session.questionIds) ? session.questionIds : [];
  const currentIndex = Math.min(Math.max(0, Number(session.currentIndex) || 0), Math.max(0, questionIds.length - 1));
  const visitedQuestionIds = questionIds.slice(0, currentIndex + 1);
  const remainingIds = questionIds.slice(currentIndex + 1);
  const questionsById = new Map((Array.isArray(bank) ? bank : []).map((question) => [question.id, question]));
  const remainingQuestions = remainingIds.map((id) => questionsById.get(id)).filter(Boolean);
  const randomized = randomizeQuestionGroups(remainingQuestions, remainingQuestions.length);
  const randomizedIds = randomized.questions.map((question) => question.id);
  const unavailableIds = remainingIds.filter((id) => !questionsById.has(id));
  return {
    ...session,
    questionIds: [...visitedQuestionIds, ...randomizedIds, ...unavailableIds],
    randomizedQuestionOrder: true,
  };
}

function rewriteError(moduleId, error) {
  const area = getAptitudeModule(moduleId)?.area || '行测';
  if (error instanceof Error) throw new Error(error.message.replaceAll('科学推理', area));
  throw error;
}

function createKnowledgeCompletion(sourceStudies, moduleId, options, { id, now = new Date().toISOString() } = {}) {
  const module = requireStudyModule(moduleId);
  const pointId = options.knowledgePointId;
  if (typeof pointId !== 'string' || !pointId.trim()) throw new Error('知识点学习需要选择一个知识点。');
  const completedAt = new Date(now);
  if (!Number.isFinite(completedAt.valueOf())) throw new Error('学习完成时间无效。');
  const sessionId = id || `apt_${moduleId}_${completedAt.getTime().toString(36)}`;
  const session = {
    id: sessionId,
    moduleId,
    mode: 'knowledge',
    status: 'completed',
    planTaskId: options.planTaskId || null,
    knowledgePointId: pointId,
    filters: { subjectId: options.subjectId || null, topicId: options.topicId || null },
    completionSource: 'manual',
    startedAt: completedAt.toISOString(),
    completedAt: completedAt.toISOString(),
  };
  const marked = setAptitudeModulePointStatus(
    normalizeAptitudeModuleStudies(sourceStudies), module.id, pointId, 'completed', completedAt.toISOString(),
  );
  return {
    aptitudeModuleStudies: {
      ...marked,
      [module.id]: { ...marked[module.id], sessions: [...marked[module.id].sessions, session] },
    },
    session,
  };
}

export function createAptitudeModuleSession(bank, sourceStudies, moduleId, options = {}, { id, now = new Date().toISOString() } = {}) {
  const module = requireStudyModule(moduleId);
  const study = identifyStudy(sourceStudies?.[moduleId], moduleId);
  if (options.mode === 'knowledge') return createKnowledgeCompletion(sourceStudies, moduleId, options, { id, now });
  const questions = moduleQuestions(bank, moduleId);
  const sessionId = id || `apt_${moduleId}_${new Date(now).getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const created = createScienceSession(questions, study, options, { id: sessionId, now });
    const aptitudeModuleStudies = studiesWith(sourceStudies, module.id, created.scienceStudy);
    return { aptitudeModuleStudies, session: aptitudeModuleStudies[module.id].sessions.find((item) => item.id === created.session.id) };
  } catch (error) { rewriteError(moduleId, error); }
}

export function answerAptitudeModuleQuestion(bank, sourceStudies, moduleId, sessionId, optionId, options = {}) {
  sessionFor(sourceStudies, moduleId, sessionId);
  const questions = moduleQuestions(bank, moduleId);
  try {
    const result = answerScienceQuestion(questions, identifyStudy(sourceStudies[moduleId], moduleId), sessionId, optionId, options);
    return studiesWith(sourceStudies, moduleId, result.scienceStudy);
  } catch (error) { rewriteError(moduleId, error); }
}

export function continueAptitudeModuleSession(bank, sourceStudies, moduleId, sessionId, options = {}) {
  sessionFor(sourceStudies, moduleId, sessionId);
  try {
    const next = continueScienceSession(moduleQuestions(bank, moduleId), identifyStudy(sourceStudies[moduleId], moduleId), sessionId, options);
    return studiesWith(sourceStudies, moduleId, next);
  } catch (error) { rewriteError(moduleId, error); }
}

export function selectAptitudeModuleAnswer(bank, sourceStudies, moduleId, sessionId, optionId, options = {}) {
  sessionFor(sourceStudies, moduleId, sessionId);
  try {
    const next = selectExamAnswer(moduleQuestions(bank, moduleId), identifyStudy(sourceStudies[moduleId], moduleId), sessionId, optionId, options);
    return studiesWith(sourceStudies, moduleId, next);
  } catch (error) { rewriteError(moduleId, error); }
}

export function goToAptitudeModuleQuestion(sourceStudies, moduleId, sessionId, index) {
  sessionFor(sourceStudies, moduleId, sessionId);
  try {
    const next = goToExamQuestion(identifyStudy(sourceStudies[moduleId], moduleId), sessionId, index);
    return studiesWith(sourceStudies, moduleId, next);
  } catch (error) { rewriteError(moduleId, error); }
}

export function finishAptitudeModuleSession(bank, sourceStudies, moduleId, sessionId, options = {}) {
  sessionFor(sourceStudies, moduleId, sessionId);
  try {
    const next = finishExamSession(moduleQuestions(bank, moduleId), identifyStudy(sourceStudies[moduleId], moduleId), sessionId, options);
    return studiesWith(sourceStudies, moduleId, next);
  } catch (error) { rewriteError(moduleId, error); }
}
