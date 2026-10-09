import { normalizeGeneralKnowledgeStudy } from './persistence.js';
import { getScienceStats } from '../science/sessions.js';

export function getGeneralKnowledgeStats(sourceStudy = {}, bank = []) {
  const study = normalizeGeneralKnowledgeStudy(sourceStudy);
  const stats = getScienceStats(study);
  const questionById = new Map((Array.isArray(bank) ? bank : []).map((question) => [question.id, question]));
  const bySubject = {};
  for (const answer of study.answers) {
    const subjectId = questionById.get(answer.questionId)?.subjectId || 'uncategorized';
    const bucket = bySubject[subjectId] || { attemptedCount: 0, correctCount: 0, accuracy: null };
    bucket.attemptedCount += 1;
    if (answer.isCorrect === true) bucket.correctCount += 1;
    bucket.accuracy = bucket.correctCount / bucket.attemptedCount;
    bySubject[subjectId] = bucket;
  }
  return { ...stats, bySubject, sessionHistory: study.sessions.filter((session) => session.mode === 'exam' && session.status !== 'active') };
}

export function combinePracticeSummary(manualSummary, ...onlineStats) {
  const onlineAttempted = onlineStats.reduce((sum, stats) => sum + (Number(stats?.attemptedCount) || 0), 0);
  const onlineCorrect = onlineStats.reduce((sum, stats) => sum + (Number(stats?.correctCount) || 0), 0);
  const accuracyQuestionCount = (Number(manualSummary.accuracyQuestionCount) || 0) + onlineAttempted;
  const correctEstimate = (Number(manualSummary.correctEstimate) || 0) + onlineCorrect;
  const attemptedCount = (Number(manualSummary.attemptedCount) || 0) + onlineAttempted;
  return {
    ...manualSummary, attemptedCount, accuracyQuestionCount, correctEstimate,
    hasAttempted: Boolean(manualSummary.hasAttempted || onlineAttempted > 0),
    accuracy: accuracyQuestionCount ? correctEstimate / accuracyQuestionCount : null,
    onlineAttemptedCount: onlineAttempted, onlineCorrectCount: onlineCorrect,
  };
}
