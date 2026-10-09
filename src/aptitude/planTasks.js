import { APTITUDE_MODULES } from './modules.js';

const APTITUDE_MODULES_WITH_OWN_STATE = APTITUDE_MODULES.filter((module) => module.studyStore === 'aptitudeModuleStudies');
const APTITUDE_ACTIVITY_TYPES = new Set(['knowledge', 'practice', 'exam', 'mistakes', 'free']);
const SOURCE_FILTERS = new Set([
  'all', 'official', 'official_outline_example', 'verified_exam', 'recalled', 'third_party_mock', 'licensed', 'original',
]);
const DIFFICULTY_FILTERS = new Set(['all', 'easy', 'medium', 'hard']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalId(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !value.trim() || value.length > 120) throw new Error(`${label}格式无效。`);
  return value.trim();
}

function normalizePointIds(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error('知识点筛选格式无效。');
  const ids = value.map((item) => optionalId(item, '知识点编号'));
  if (ids.some((id) => id === null)) throw new Error('知识点编号不能为空。');
  return [...new Set(ids)];
}

export function getAptitudeModuleForTaskType(taskType) {
  return APTITUDE_MODULES_WITH_OWN_STATE.find((module) => module.taskType === taskType) || null;
}

export function normalizeAptitudeConfig(moduleId, config = {}) {
  const module = APTITUDE_MODULES_WITH_OWN_STATE.find((item) => item.id === moduleId);
  if (!module) throw new Error(`模块 ${moduleId} 不是新建行测模块。`);
  if (!isRecord(config)) throw new Error('行测任务配置格式无效。');
  if (config.moduleId !== undefined && config.moduleId !== module.id) throw new Error('行测任务配置模块与任务类型不匹配。');

  const activityType = config.activityType || 'free';
  if (!APTITUDE_ACTIVITY_TYPES.has(activityType)) throw new Error('请选择有效的行测训练方式。');
  if (activityType === 'free') {
    return {
      moduleId: module.id, activityType, subjectId: null, topicId: null, knowledgePointIds: [],
      mode: null, targetQuestionCount: null, durationSeconds: null, sourceFilter: 'all', difficultyFilter: 'all',
    };
  }

  const subjectId = optionalId(config.subjectId, '学科');
  const topicId = optionalId(config.topicId, '专题');
  if (topicId && !subjectId) throw new Error('选择专题时必须先选择学科。');
  const knowledgePointIds = normalizePointIds(config.knowledgePointIds);
  if (activityType === 'knowledge' && (!subjectId || knowledgePointIds.length === 0)) {
    throw new Error('知识点学习需要选择学科和至少一个知识点。');
  }

  const needsQuestionCount = ['practice', 'exam', 'mistakes'].includes(activityType);
  const targetQuestionCount = needsQuestionCount
    ? Number(config.targetQuestionCount ?? (activityType === 'exam' || activityType === 'mistakes' ? 10 : NaN))
    : null;
  if (needsQuestionCount && (!Number.isInteger(targetQuestionCount) || targetQuestionCount < 1)) {
    throw new Error('目标题量必须是大于 0 的整数。');
  }
  const durationSeconds = activityType === 'exam' ? Number(config.durationSeconds ?? 600) : null;
  if (activityType === 'exam' && (!Number.isFinite(durationSeconds) || durationSeconds < 60)) {
    throw new Error('限时模拟时长至少为 1 分钟。');
  }
  const sourceFilter = config.sourceFilter ?? 'all';
  if (typeof sourceFilter !== 'string' || !SOURCE_FILTERS.has(sourceFilter)) throw new Error('题源筛选无效。');
  const difficultyFilter = config.difficultyFilter ?? 'all';
  if (typeof difficultyFilter !== 'string' || !DIFFICULTY_FILTERS.has(difficultyFilter)) throw new Error('难度筛选无效。');

  return {
    moduleId: module.id,
    activityType,
    subjectId,
    topicId,
    knowledgePointIds,
    mode: activityType === 'exam' ? 'exam' : ['practice', 'mistakes'].includes(activityType) ? 'practice' : null,
    targetQuestionCount,
    durationSeconds,
    sourceFilter,
    difficultyFilter,
  };
}

function emptyProgress(activityType = 'free', hasStarted = false) {
  return {
    activityType, progressCount: 0, completedCount: 0, displayCount: 0, targetCount: null,
    remainingCount: null, isComplete: false, hasStarted, questionIds: [],
  };
}

function sessionMatchesConfig(session, config) {
  const expectedMode = config.activityType === 'knowledge' ? 'knowledge' : config.activityType === 'exam' ? 'exam' : 'practice';
  if (session.mode !== expectedMode) return false;
  const filters = isRecord(session.filters) ? session.filters : {};
  if (config.subjectId && filters.subjectId !== config.subjectId) return false;
  if (config.topicId && filters.topicId !== config.topicId) return false;
  if (config.activityType === 'knowledge' && config.knowledgePointIds.length
    && !config.knowledgePointIds.includes(session.knowledgePointId)) return false;
  if (config.activityType !== 'knowledge' && config.knowledgePointIds.length
    && !config.knowledgePointIds.includes(filters.knowledgePointId)) return false;
  if (config.sourceFilter !== 'all' && filters.sourceType !== config.sourceFilter) return false;
  if (config.difficultyFilter !== 'all' && filters.difficulty !== config.difficultyFilter) return false;
  if (config.activityType === 'mistakes' && filters.onlyMistakes !== true) return false;
  if (config.activityType === 'practice' && filters.onlyMistakes === true) return false;
  return true;
}

export function getAptitudeModuleTaskProgress(task, sessions = [], answers = []) {
  const module = getAptitudeModuleForTaskType(task?.taskType);
  if (!module) return emptyProgress();
  let config;
  try {
    config = normalizeAptitudeConfig(module.id, task.aptitudeConfig || { activityType: 'free' });
  } catch {
    return emptyProgress();
  }
  if (config.moduleId !== module.id) return emptyProgress(config.activityType);
  const eligibleSessions = config.activityType === 'free' ? [] : (Array.isArray(sessions) ? sessions : []).filter((session) =>
    session?.moduleId === module.id && session.planTaskId === task.id && sessionMatchesConfig(session, config));
  const hasStarted = eligibleSessions.length > 0;
  if (config.activityType === 'free') return emptyProgress('free', hasStarted);

  if (config.activityType === 'knowledge') {
    const targetCount = new Set(config.knowledgePointIds).size;
    const completedPointIds = new Set(eligibleSessions
      .filter((session) => session.status === 'completed' && session.knowledgePointId)
      .map((session) => session.knowledgePointId));
    const completedCount = completedPointIds.size;
    return {
      activityType: 'knowledge', progressCount: completedCount, completedCount, displayCount: completedCount,
      targetCount, remainingCount: Math.max(0, targetCount - completedCount),
      isComplete: targetCount > 0 && completedCount >= targetCount, hasStarted, questionIds: [],
    };
  }

  const targetCount = config.targetQuestionCount;
  const eligibleSessionIds = new Set(eligibleSessions.map((session) => session.id));
  const completedSessionIds = new Set(eligibleSessions.filter((session) => config.activityType === 'exam'
    ? ['completed', 'timed_out'].includes(session.status) : session.status === 'completed').map((session) => session.id));
  const eligibleAnswers = (Array.isArray(answers) ? answers : []).filter((answer) =>
    answer?.moduleId === module.id && eligibleSessionIds.has(answer.sessionId) && typeof answer.questionId === 'string');
  const answeredQuestionIds = new Set(eligibleAnswers.map((answer) => answer.questionId));
  const completedQuestionIds = new Set(eligibleAnswers.filter((answer) => completedSessionIds.has(answer.sessionId))
    .map((answer) => answer.questionId));
  const draftQuestionIds = new Set(eligibleSessions.filter((session) => config.activityType === 'exam' && session.status === 'active')
    .flatMap((session) => Object.keys(isRecord(session.draftAnswers) ? session.draftAnswers : {})));
  const displayQuestionIds = new Set([...answeredQuestionIds, ...draftQuestionIds]);
  const progressCount = answeredQuestionIds.size;
  const completedCount = completedQuestionIds.size;
  return {
    activityType: config.activityType,
    progressCount,
    completedCount,
    displayCount: Math.min(targetCount, displayQuestionIds.size),
    targetCount,
    remainingCount: Math.max(0, targetCount - progressCount),
    isComplete: targetCount > 0 && completedCount >= targetCount,
    hasStarted,
    questionIds: [...displayQuestionIds],
  };
}

export function reconcileAptitudeModuleTaskProgress(tasks, id, sessions, answers, { now = new Date().toISOString() } = {}) {
  const index = tasks.findIndex((task) => task.id === id && getAptitudeModuleForTaskType(task.taskType));
  if (index < 0) return tasks;
  const task = tasks[index];
  if (task.status === 'completed' && task.completionSource === 'manual') return tasks;
  const progress = getAptitudeModuleTaskProgress(task, sessions, answers);
  let status = task.status;
  let completionSource = task.completionSource;
  if (progress.isComplete) {
    status = 'completed';
    completionSource = 'system_verified';
  } else if (task.status === 'completed' && task.completionSource === 'system_verified') {
    status = progress.hasStarted ? 'in_progress' : 'not_started';
    completionSource = 'not_completed';
  } else if (progress.hasStarted && task.status === 'not_started') {
    status = 'in_progress';
    completionSource = 'not_completed';
  } else return tasks;
  if (status === task.status && completionSource === task.completionSource) return tasks;
  return tasks.map((item, taskIndex) => taskIndex === index
    ? { ...item, status, completionSource, updatedAt: now }
    : item);
}
