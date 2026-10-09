import { getKnowledgePoint, getScienceTree } from './knowledge.js';
import { normalizeGeneralKnowledgeConfig } from '../general-knowledge/planConfig.js';

const VALID_TASK_TYPES = new Set([
  'verbal', 'data_analysis', 'reasoning', 'quantitative', 'general_knowledge',
  'essay', 'science_reasoning', 'comprehensive', 'review', 'custom',
]);
const VALID_ACTIVITY_TYPES = new Set(['knowledge', 'practice', 'exam', 'mistakes', 'free']);
const VALID_STATUSES = new Set(['not_started', 'in_progress', 'completed']);
const VALID_COMPLETION_SOURCES = new Set(['not_completed', 'manual', 'system_verified']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createTaskId() {
  if (globalThis.crypto?.randomUUID) return `task_${globalThis.crypto.randomUUID()}`;
  return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function isValidPlanDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

function findTopic(subjectId, topicId) {
  const subject = getScienceTree().find((item) => item.id === subjectId);
  return subject?.topics.find((topic) => topic.id === topicId) || null;
}

function normalizeScienceConfig(config = {}) {
  if (!isRecord(config)) throw new Error('科学推理任务配置格式无效。');
  const activityType = config.activityType || 'free';
  if (!VALID_ACTIVITY_TYPES.has(activityType)) throw new Error('请选择有效的科学推理任务类型。');

  if (activityType === 'free') {
    return {
      activityType,
      subjectId: null,
      topicId: null,
      knowledgePointIds: [],
      mode: null,
      targetQuestionCount: null,
      durationSeconds: null,
      sourceFilter: 'all',
      difficultyFilter: 'all',
    };
  }

  const subjectId = config.subjectId || null;
  const topicId = config.topicId || null;
  const pointIds = Array.isArray(config.knowledgePointIds)
    ? [...new Set(config.knowledgePointIds)]
    : [];

  if (subjectId && !getScienceTree().some((subject) => subject.id === subjectId)) {
    throw new Error('所选科学推理学科不可用。');
  }
  if (topicId && (!subjectId || !findTopic(subjectId, topicId))) {
    throw new Error('所选科学推理专题与学科不匹配。');
  }
  for (const pointId of pointIds) {
    const point = getKnowledgePoint(pointId);
    if (!point?.enabled || (subjectId && point.subjectId !== subjectId) || (topicId && point.topicId !== topicId)) {
      throw new Error(`知识点 ${pointId} 不可用或与当前筛选不匹配。`);
    }
  }
  if (activityType === 'knowledge' && (!subjectId || pointIds.length === 0)) {
    throw new Error('知识点学习需要选择学科和至少一个可用知识点。');
  }

  const needsQuestionCount = ['practice', 'exam', 'mistakes'].includes(activityType);
  const defaultCount = activityType === 'exam' ? 10 : activityType === 'mistakes' ? 10 : null;
  const targetQuestionCount = config.targetQuestionCount ?? defaultCount;
  if (needsQuestionCount && targetQuestionCount !== null
    && (!Number.isInteger(Number(targetQuestionCount)) || Number(targetQuestionCount) < 1)) {
    throw new Error('目标题量必须是大于 0 的整数。');
  }
  if (needsQuestionCount && targetQuestionCount === null) {
    throw new Error('请填写目标题量。');
  }

  const durationSeconds = activityType === 'exam'
    ? Number(config.durationSeconds ?? 600)
    : null;
  if (activityType === 'exam' && (!Number.isFinite(durationSeconds) || durationSeconds < 60)) {
    throw new Error('正式模拟时长至少为 1 分钟。');
  }

  return {
    activityType,
    subjectId,
    topicId,
    knowledgePointIds: pointIds,
    mode: activityType === 'exam' ? 'exam' : ['practice', 'mistakes'].includes(activityType) ? 'practice' : null,
    targetQuestionCount: targetQuestionCount === null ? null : Number(targetQuestionCount),
    durationSeconds,
    sourceFilter: typeof config.sourceFilter === 'string' && config.sourceFilter ? config.sourceFilter : 'all',
    difficultyFilter: typeof config.difficultyFilter === 'string' && config.difficultyFilter ? config.difficultyFilter : 'all',
  };
}

export function createPlanTask(input, { id = createTaskId(), now = new Date().toISOString() } = {}) {
  if (!isRecord(input)) throw new Error('学习任务内容无效。');
  if (!VALID_TASK_TYPES.has(input.taskType)) throw new Error('请选择有效的任务类型。');
  if (!isValidPlanDate(input.date)) throw new Error('请选择有效的学习日期。');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) throw new Error('请填写任务名称。');

  const status = VALID_STATUSES.has(input.status) ? input.status : 'not_started';
  let completionSource = input.completionSource;
  if (!VALID_COMPLETION_SOURCES.has(completionSource)) {
    completionSource = status === 'completed' ? 'manual' : 'not_completed';
  }
  if (status !== 'completed') completionSource = 'not_completed';

  const estimatedMinutes = input.estimatedMinutes === '' || input.estimatedMinutes === undefined
    ? null
    : input.estimatedMinutes === null ? null : Number(input.estimatedMinutes);
  if (estimatedMinutes !== null && (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 0)) {
    throw new Error('预计时长必须为 0 或更大的数字。');
  }
  const priority = ['low', 'normal', 'high'].includes(input.priority) ? input.priority : 'normal';
  const scienceConfig = input.taskType === 'science_reasoning'
    ? normalizeScienceConfig(input.scienceConfig || { activityType: 'free' })
    : null;
  const generalKnowledgeConfig = input.taskType === 'general_knowledge'
    ? normalizeGeneralKnowledgeConfig(input.generalKnowledgeConfig || { activityType: 'free' })
    : null;

  return {
    id,
    date: input.date,
    taskType: input.taskType,
    customTypeName: input.taskType === 'custom' && typeof input.customTypeName === 'string' ? input.customTypeName.trim() : null,
    title,
    description: typeof input.description === 'string' ? input.description : '',
    estimatedMinutes,
    priority,
    status,
    completionSource,
    scienceConfig,
    generalKnowledgeConfig,
    createdAt: input.createdAt || now,
    updatedAt: now,
    archivedAt: input.archivedAt || null,
  };
}

export function updatePlanTask(tasks, id, changes, { now = new Date().toISOString() } = {}) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) throw new Error('找不到要修改的学习任务。');
  const current = tasks[index];
  const nextType = changes.taskType ?? current.taskType;
  const nextConfig = changes.scienceConfig !== undefined
    ? changes.scienceConfig
    : nextType === 'science_reasoning' && current.taskType === 'science_reasoning'
      ? current.scienceConfig
      : nextType === 'science_reasoning' ? { activityType: 'free' } : null;
  const nextGeneralKnowledgeConfig = changes.generalKnowledgeConfig !== undefined
    ? changes.generalKnowledgeConfig
    : nextType === 'general_knowledge' && current.taskType === 'general_knowledge'
      ? current.generalKnowledgeConfig
      : nextType === 'general_knowledge' ? { activityType: 'free' } : null;
  const updated = createPlanTask({
    ...current,
    ...changes,
    taskType: nextType,
    scienceConfig: nextConfig,
    generalKnowledgeConfig: nextGeneralKnowledgeConfig,
    id: current.id,
    createdAt: current.createdAt,
    archivedAt: current.archivedAt,
  }, { id: current.id, now });
  return tasks.map((task, taskIndex) => taskIndex === index ? updated : task);
}

export function archivePlanTask(tasks, id, { now = new Date().toISOString() } = {}) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) throw new Error('找不到要删除的学习任务。');
  return tasks.map((task, taskIndex) => taskIndex === index
    ? { ...task, archivedAt: task.archivedAt || now, updatedAt: now }
    : task);
}

export function getTasksForDate(tasks, date) {
  return tasks.filter((task) => task.date === date && !task.archivedAt);
}

function sessionMatchesTaskConfig(session, config) {
  const activityType = config?.activityType || 'free';
  const expectedMode = activityType === 'knowledge' ? 'knowledge' : activityType === 'exam' ? 'exam' : 'practice';
  if (session.mode !== expectedMode) return false;
  const filters = session.filters || {};
  if (config.subjectId && filters.subjectId && filters.subjectId !== config.subjectId) return false;
  if (config.topicId && filters.topicId && filters.topicId !== config.topicId) return false;
  const knowledgePointIds = Array.isArray(config.knowledgePointIds) ? config.knowledgePointIds : [];
  if (activityType === 'knowledge' && knowledgePointIds.length && !knowledgePointIds.includes(session.knowledgePointId)) return false;
  if (activityType !== 'knowledge' && knowledgePointIds.length && filters.knowledgePointId
    && !knowledgePointIds.includes(filters.knowledgePointId)) return false;
  if (config.sourceFilter && config.sourceFilter !== 'all' && filters.sourceType && filters.sourceType !== config.sourceFilter) return false;
  if (config.difficultyFilter && config.difficultyFilter !== 'all' && filters.difficulty && filters.difficulty !== config.difficultyFilter) return false;
  if (activityType === 'mistakes' && filters.onlyMistakes === false) return false;
  if (activityType === 'practice' && filters.onlyMistakes === true) return false;
  return true;
}

export function getPlanTaskProgress(task, sessions = [], answers = []) {
  const config = task?.scienceConfig || {};
  const activityType = config.activityType || 'free';
  const eligibleSessions = task?.taskType === 'science_reasoning'
    ? sessions.filter((session) => session.planTaskId === task.id && sessionMatchesTaskConfig(session, config))
    : [];
  const hasStarted = eligibleSessions.length > 0;

  if (activityType === 'free') {
    return { activityType, progressCount: 0, completedCount: 0, displayCount: 0, targetCount: null, remainingCount: null, isComplete: false, hasStarted, questionIds: [] };
  }

  if (activityType === 'knowledge') {
    const targetCount = new Set(config.knowledgePointIds || []).size;
    const completedPointIds = new Set(eligibleSessions
      .filter((session) => session.status === 'completed' && session.knowledgePointId)
      .map((session) => session.knowledgePointId));
    const completedCount = completedPointIds.size;
    return {
      activityType,
      progressCount: completedCount,
      completedCount,
      displayCount: completedCount,
      targetCount,
      remainingCount: Math.max(0, targetCount - completedCount),
      isComplete: targetCount > 0 && completedCount >= targetCount,
      hasStarted,
      questionIds: [],
    };
  }

  const targetCount = config.targetQuestionCount !== null && config.targetQuestionCount !== undefined
    && Number.isInteger(Number(config.targetQuestionCount))
    ? Number(config.targetQuestionCount)
    : null;
  const eligibleSessionIds = new Set(eligibleSessions.map((session) => session.id));
  const answeredQuestionIds = new Set(answers
    .filter((answer) => eligibleSessionIds.has(answer.sessionId) && typeof answer.questionId === 'string')
    .map((answer) => answer.questionId));
  const completedSessionIds = new Set(eligibleSessions
    .filter((session) => activityType === 'exam'
      ? ['completed', 'timed_out'].includes(session.status)
      : session.status === 'completed')
    .map((session) => session.id));
  const completedQuestionIds = new Set(answers
    .filter((answer) => completedSessionIds.has(answer.sessionId) && typeof answer.questionId === 'string')
    .map((answer) => answer.questionId));
  const draftQuestionIds = new Set(eligibleSessions
    .filter((session) => activityType === 'exam' && session.status === 'active')
    .flatMap((session) => Object.keys(session.draftAnswers || {})));
  const displayQuestionIds = new Set([...answeredQuestionIds, ...draftQuestionIds]);
  const completedCount = completedQuestionIds.size;
  const progressCount = answeredQuestionIds.size;
  return {
    activityType,
    progressCount,
    completedCount,
    displayCount: targetCount === null ? displayQuestionIds.size : Math.min(targetCount, displayQuestionIds.size),
    targetCount,
    remainingCount: targetCount === null ? null : Math.max(0, targetCount - progressCount),
    isComplete: targetCount !== null && targetCount > 0 && completedCount >= targetCount,
    hasStarted,
    questionIds: [...new Set([...answeredQuestionIds, ...draftQuestionIds])],
  };
}

export function markPlanTaskInProgress(tasks, id, { now = new Date().toISOString() } = {}) {
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new Error('找不到要开始的学习任务。');
  if (task.status === 'completed') return tasks;
  return updatePlanTask(tasks, id, { status: 'in_progress', completionSource: 'not_completed' }, { now });
}

export function reconcileSciencePlanTaskProgress(tasks, id, sessions, answers, { now = new Date().toISOString() } = {}) {
  const task = tasks.find((item) => item.id === id);
  if (!task || task.taskType !== 'science_reasoning') return tasks;
  if (task.status === 'completed' && task.completionSource === 'manual') return tasks;

  const progress = getPlanTaskProgress(task, sessions, answers);
  if (progress.isComplete) {
    if (task.status === 'completed' && task.completionSource === 'system_verified') return tasks;
    return updatePlanTask(tasks, id, { status: 'completed', completionSource: 'system_verified' }, { now });
  }

  if (task.status === 'completed' && task.completionSource === 'system_verified') {
    return updatePlanTask(tasks, id, {
      status: progress.hasStarted ? 'in_progress' : 'not_started',
      completionSource: 'not_completed',
    }, { now });
  }
  if (progress.hasStarted && task.status === 'not_started') {
    return updatePlanTask(tasks, id, { status: 'in_progress' }, { now });
  }
  return tasks;
}
