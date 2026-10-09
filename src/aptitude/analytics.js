import { APTITUDE_MODULES, getAptitudeModule } from './modules.js';
import { normalizeAptitudeModuleStudies } from './persistence.js';

function sessionsFromStore(study) {
  return Array.isArray(study?.sessions) ? study.sessions : [];
}

function answersFromStore(study) {
  return Array.isArray(study?.answers) ? study.answers : [];
}

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

export function getAptitudeMockSessionRecords({ scienceStudy = {}, generalKnowledgeStudy = {}, aptitudeModuleStudies = {}, aptitudeOverallStudy = {} } = {}) {
  const records = [];
  for (const module of APTITUDE_MODULES) {
    const study = module.studyStore === 'scienceStudy' ? scienceStudy
      : module.studyStore === 'generalKnowledgeStudy' ? generalKnowledgeStudy
        : aptitudeModuleStudies[module.id] || {};
    const sessions = sessionsFromStore(study);
    const answers = answersFromStore(study);
    for (const session of sessions) {
      if (session.mode !== 'exam' || !['completed', 'timed_out'].includes(session.status)) continue;
      if (module.studyStore === 'aptitudeModuleStudies' && session.moduleId !== module.id) continue;
      const questionCount = Array.isArray(session.questionIds) ? session.questionIds.length : 0;
      if (questionCount === 0) continue;
      const sessionAnswers = answers.filter((answer) => answer.sessionId === session.id
        && (answer.moduleId === undefined || answer.moduleId === module.id));
      const correctCount = sessionAnswers.filter((answer) => answer.isCorrect === true).length;
      const completedAt = session.completedAt || session.submittedAt || session.startedAt || '';
      records.push({
        id: session.id,
        moduleId: module.id,
        moduleName: module.area,
        mode: session.mode,
        status: session.status,
        date: String(completedAt).slice(0, 10),
        questionCount,
        answeredCount: sessionAnswers.length,
        correctCount,
        scoreRate: correctCount / questionCount,
        answeredAccuracy: sessionAnswers.length ? correctCount / sessionAnswers.length : null,
        href: `${module.route}?session=${encodeURIComponent(session.id)}`,
      });
    }
  }
  const overallAnswers = answersFromStore(aptitudeOverallStudy);
  for (const session of sessionsFromStore(aptitudeOverallStudy)) {
    if (session.mode !== 'exam' || !['completed', 'timed_out'].includes(session.status)) continue;
    const questionCount = Array.isArray(session.questionIds) ? session.questionIds.length : 0;
    if (!questionCount) continue;
    const sessionAnswers = overallAnswers.filter((answer) => answer.sessionId === session.id);
    const correctCount = sessionAnswers.filter((answer) => answer.isCorrect === true).length;
    const scopedModule = APTITUDE_MODULES.find((module) => module.id === session.scopeModuleId);
    const moduleName = session.mockType === 'full_paper'
      ? `${scopedModule ? `${scopedModule.area}分区卷` : '行测整卷'} · ${session.paperTitle || '来源卷'}`
      : scopedModule ? `${scopedModule.area}随机组卷` : '行测跨模块随机卷';
    const completedAt = session.completedAt || session.submittedAt || session.startedAt || '';
    records.push({
      id: session.id,
      moduleId: session.scopeModuleId || 'aptitude-overall',
      moduleName,
      mode: session.mode,
      status: session.status,
      date: String(completedAt).slice(0, 10),
      questionCount,
      answeredCount: sessionAnswers.length,
      correctCount,
      scoreRate: correctCount / questionCount,
      answeredAccuracy: sessionAnswers.length ? correctCount / sessionAnswers.length : null,
      href: `#/aptitude?session=${encodeURIComponent(session.id)}`,
    });
  }
  return records.sort((left, right) => right.date.localeCompare(left.date) || left.moduleName.localeCompare(right.moduleName, 'zh-CN'));
}
