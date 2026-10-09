import { getAptitudeModule } from './modules.js';
import { normalizeAptitudeModuleStudies } from './persistence.js';

export function getAptitudeModuleStats(moduleId, sourceStudy = {}) {
  const module = getAptitudeModule(moduleId);
  if (!module || module.studyStore !== 'aptitudeModuleStudies') throw new Error(`Unknown aptitude module: ${moduleId}`);
  const study = normalizeAptitudeModuleStudies({ [moduleId]: sourceStudy })[moduleId];
  const sessions = study.sessions.filter((session) => session.moduleId === moduleId);
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const answers = study.answers.filter((answer) => answer.moduleId === moduleId && sessionById.has(answer.sessionId));
  const practiceAnswers = answers.filter((answer) => sessionById.get(answer.sessionId)?.mode === 'practice');
  const examAnswers = answers.filter((answer) => sessionById.get(answer.sessionId)?.mode === 'exam');
  const attemptedCount = answers.length;
  const correctCount = answers.filter((answer) => answer.isCorrect === true).length;
  const completedSessionCount = sessions.filter((session) => session.status === 'completed').length;
  const examSessions = sessions.filter((session) => session.mode === 'exam' && ['completed', 'timed_out'].includes(session.status));
  const examQuestionCount = examSessions.reduce((sum, session) => sum + (Array.isArray(session.questionIds) ? session.questionIds.length : 0), 0);
  const mistakeCount = Object.keys(study.mistakes).length;
  return {
    sessionCount: sessions.length,
    completedSessionCount,
    attemptedCount,
    correctCount,
    accuracy: attemptedCount ? correctCount / attemptedCount : null,
    mistakeCount,
    favoriteCount: study.favorites.length,
    practice: {
      sessionCount: sessions.filter((session) => session.mode === 'practice').length,
      attemptedCount: practiceAnswers.length,
      correctCount: practiceAnswers.filter((answer) => answer.isCorrect === true).length,
      accuracy: practiceAnswers.length ? practiceAnswers.filter((answer) => answer.isCorrect === true).length / practiceAnswers.length : null,
    },
    exam: {
      sessionCount: examSessions.length,
      attemptedCount: examAnswers.length,
      correctCount: examAnswers.filter((answer) => answer.isCorrect === true).length,
      questionCount: examQuestionCount,
    },
  };
}
