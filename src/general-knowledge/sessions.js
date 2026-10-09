import {
  advanceExamQuestion, answerScienceQuestion, continueScienceSession, createScienceSession,
  expireScienceSession, finishExamSession, getScienceStats, goToExamQuestion,
  selectExamAnswer,
} from '../science/sessions.js';
import { normalizeGeneralKnowledgeStudy, toggleGeneralKnowledgeFavorite } from './persistence.js';

const MODULE_ID = 'general_knowledge';
const SOURCE_PRIORITY = ['official_outline_example', 'verified_exam', 'third_party_mock', 'recalled', 'licensed', 'original'];

function withModuleIdentity(sourceStudy, bank = []) {
  const study = normalizeGeneralKnowledgeStudy(sourceStudy);
  const questionById = new Map((Array.isArray(bank) ? bank : []).map((question) => [question.id, question]));
  return {
    ...study,
    sessions: study.sessions.map((session) => ({ ...session, moduleId: MODULE_ID })),
    answers: study.answers.map((answer) => {
      const question = questionById.get(answer.questionId) || {};
      return { ...answer, moduleId: MODULE_ID, sourceType: answer.sourceType || question.sourceType || null, sourceId: answer.sourceId || question.sourceId || null };
    }),
    mistakes: Object.fromEntries(Object.entries(study.mistakes).map(([id, mistake]) => [id, { ...mistake, moduleId: MODULE_ID }])),
  };
}

function rewriteError(error) {
  if (error instanceof Error) throw new Error(error.message.replaceAll('科学推理', '常识判断'));
  throw error;
}

export function createGeneralKnowledgeSession(bank, sourceStudy, options = {}, { id, now = new Date().toISOString() } = {}) {
  const availableBank = (Array.isArray(bank) ? bank : []).filter((question) => question.moduleId === MODULE_ID && question.publishStatus === 'published');
  const sessionId = id || `gk_${new Date(now).getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    const created = createScienceSession(availableBank, withModuleIdentity(sourceStudy, availableBank), {
      ...options, sourcePriorityOrder: SOURCE_PRIORITY,
    }, { id: sessionId, now });
    const generalKnowledgeStudy = withModuleIdentity(created.scienceStudy, availableBank);
    return { generalKnowledgeStudy, session: generalKnowledgeStudy.sessions.find((item) => item.id === created.session.id) };
  } catch (error) { rewriteError(error); }
}

export function answerGeneralKnowledgeQuestion(bank, sourceStudy, sessionId, selectedOptionId, options = {}) {
  try {
    const result = answerScienceQuestion(bank, withModuleIdentity(sourceStudy, bank), sessionId, selectedOptionId, options);
    return withModuleIdentity(result.scienceStudy, bank);
  }
  catch (error) { rewriteError(error); }
}

export function continueGeneralKnowledgeSession(bank, sourceStudy, sessionId, options = {}) {
  try { return withModuleIdentity(continueScienceSession(bank, withModuleIdentity(sourceStudy, bank), sessionId, options), bank); }
  catch (error) { rewriteError(error); }
}

export function selectGeneralKnowledgeAnswer(bank, sourceStudy, sessionId, selectedOptionId, options = {}) {
  try { return withModuleIdentity(selectExamAnswer(bank, withModuleIdentity(sourceStudy, bank), sessionId, selectedOptionId, options), bank); }
  catch (error) { rewriteError(error); }
}

export function advanceGeneralKnowledgeQuestion(sourceStudy, sessionId) {
  try { return withModuleIdentity(advanceExamQuestion(withModuleIdentity(sourceStudy), sessionId)); }
  catch (error) { rewriteError(error); }
}

export function goToGeneralKnowledgeQuestion(sourceStudy, sessionId, index) {
  try { return withModuleIdentity(goToExamQuestion(withModuleIdentity(sourceStudy), sessionId, index)); }
  catch (error) { rewriteError(error); }
}

export function finishGeneralKnowledgeSession(bank, sourceStudy, sessionId, options = {}) {
  try { return withModuleIdentity(finishExamSession(bank, withModuleIdentity(sourceStudy, bank), sessionId, options), bank); }
  catch (error) { rewriteError(error); }
}

export function expireGeneralKnowledgeSession(bank, sourceStudy, sessionId, options = {}) {
  try { return withModuleIdentity(expireScienceSession(bank, withModuleIdentity(sourceStudy, bank), sessionId, options), bank); }
  catch (error) { rewriteError(error); }
}

export function getGeneralKnowledgeSessionStats(sourceStudy) {
  return getScienceStats(withModuleIdentity(sourceStudy));
}

export { toggleGeneralKnowledgeFavorite };
