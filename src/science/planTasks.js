import { getKnowledgePoint, getScienceTree } from './knowledge.js';

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
  const updated = createPlanTask({
    ...current,
    ...changes,
    taskType: nextType,
    scienceConfig: nextConfig,
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
