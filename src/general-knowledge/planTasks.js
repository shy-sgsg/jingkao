import { updatePlanTask } from '../science/planTasks.js';

function matchesConfig(session, config) {
  const expectedMode = config.activityType === 'knowledge' ? 'knowledge' : config.activityType === 'exam' ? 'exam' : 'practice';
  if (session.mode !== expectedMode) return false;
  const filters = session.filters || {};
  if (config.subjectId && filters.subjectId !== config.subjectId) return false;
  if (config.topicId && filters.topicId !== config.topicId) return false;
  if (config.knowledgePointIds?.length && config.activityType === 'knowledge' && !config.knowledgePointIds.includes(session.knowledgePointId)) return false;
  if (config.knowledgePointIds?.length && config.activityType !== 'knowledge' && filters.knowledgePointId && !config.knowledgePointIds.includes(filters.knowledgePointId)) return false;
  if (config.sourceFilter !== 'all' && filters.sourceType && filters.sourceType !== config.sourceFilter) return false;
  if (config.difficultyFilter !== 'all' && filters.difficulty && filters.difficulty !== config.difficultyFilter) return false;
  if (config.activityType === 'mistakes' && filters.onlyMistakes === false) return false;
  if (config.activityType === 'practice' && filters.onlyMistakes === true) return false;
  return true;
}

export function getGeneralKnowledgeTaskProgress(task, sessions = [], answers = []) {
  const config = task?.generalKnowledgeConfig || { activityType: 'free' };
  const eligibleSessions = task?.taskType === 'general_knowledge'
    ? sessions.filter((session) => session.moduleId === 'general_knowledge' && session.planTaskId === task.id && matchesConfig(session, config))
    : [];
  const hasStarted = eligibleSessions.length > 0;
  if (config.activityType === 'free') return { activityType: 'free', progressCount: 0, completedCount: 0, displayCount: 0, targetCount: null, remainingCount: null, isComplete: false, hasStarted, questionIds: [] };
  if (config.activityType === 'knowledge') {
    const completedPointIds = new Set(eligibleSessions.filter((session) => session.status === 'completed' && session.knowledgePointId).map((session) => session.knowledgePointId));
    const targetCount = new Set(config.knowledgePointIds || []).size;
    const completedCount = completedPointIds.size;
    return { activityType: 'knowledge', progressCount: completedCount, completedCount, displayCount: completedCount,
      targetCount, remainingCount: Math.max(0, targetCount - completedCount), isComplete: targetCount > 0 && completedCount >= targetCount, hasStarted, questionIds: [] };
  }
  const targetCount = Number(config.targetQuestionCount) || null;
  const eligibleIds = new Set(eligibleSessions.map((session) => session.id));
  const completedIds = new Set(eligibleSessions.filter((session) => config.activityType === 'exam'
    ? ['completed', 'timed_out'].includes(session.status) : session.status === 'completed').map((session) => session.id));
  const answered = answers.filter((answer) => answer.moduleId === 'general_knowledge' && eligibleIds.has(answer.sessionId));
  const submitted = answers.filter((answer) => answer.moduleId === 'general_knowledge' && completedIds.has(answer.sessionId));
  const allQuestions = new Set(answered.map((answer) => answer.questionId));
  const completedQuestions = new Set(submitted.map((answer) => answer.questionId));
  const drafts = eligibleSessions.filter((session) => session.mode === 'exam' && session.status === 'active').flatMap((session) => Object.keys(session.draftAnswers || {}));
  const displayIds = new Set([...allQuestions, ...drafts]);
  return {
    activityType: config.activityType, progressCount: allQuestions.size, completedCount: completedQuestions.size,
    displayCount: targetCount ? Math.min(targetCount, displayIds.size) : displayIds.size, targetCount,
    remainingCount: targetCount ? Math.max(0, targetCount - allQuestions.size) : null,
    isComplete: Boolean(targetCount && targetCount > 0 && completedQuestions.size >= targetCount),
    hasStarted, questionIds: [...displayIds],
  };
}

export function reconcileGeneralKnowledgePlanTaskProgress(tasks, id, sessions, answers, { now = new Date().toISOString() } = {}) {
  const task = tasks.find((item) => item.id === id && item.taskType === 'general_knowledge');
  if (!task || (task.status === 'completed' && task.completionSource === 'manual')) return tasks;
  const progress = getGeneralKnowledgeTaskProgress(task, sessions, answers);
  if (progress.isComplete) {
    if (task.status === 'completed' && task.completionSource === 'system_verified') return tasks;
    return updatePlanTask(tasks, id, { status: 'completed', completionSource: 'system_verified' }, { now });
  }
  if (task.status === 'completed' && task.completionSource === 'system_verified') return updatePlanTask(tasks, id, {
    status: progress.hasStarted ? 'in_progress' : 'not_started', completionSource: 'not_completed',
  }, { now });
  if (progress.hasStarted && task.status === 'not_started') return updatePlanTask(tasks, id, { status: 'in_progress' }, { now });
  return tasks;
}
