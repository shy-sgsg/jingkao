import { getGeneralKnowledgePoint, getGeneralKnowledgeTree } from './knowledge.js';

const VALID_GENERAL_KNOWLEDGE_ACTIVITY_TYPES = new Set(['knowledge', 'practice', 'exam', 'mistakes', 'free']);

export function normalizeGeneralKnowledgeConfig(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('常识判断任务配置格式无效。');
  const activityType = config.activityType || 'free';
  if (!VALID_GENERAL_KNOWLEDGE_ACTIVITY_TYPES.has(activityType)) throw new Error('请选择有效的常识判断任务类型。');
  const all = { activityType, subjectId: null, topicId: null, knowledgePointIds: [], targetQuestionCount: null,
    durationSeconds: null, sourceFilter: 'all', difficultyFilter: 'all' };
  if (activityType === 'free') return all;
  const subjectId = config.subjectId || null;
  const subject = getGeneralKnowledgeTree().find((item) => item.id === subjectId) || null;
  if (subjectId && !subject) throw new Error('所选常识判断学科不可用。');
  const topicId = config.topicId || null;
  if (topicId && (!subject || !subject.topics.some((topic) => topic.id === topicId))) throw new Error('所选常识判断专题与学科不匹配。');
  const knowledgePointIds = Array.isArray(config.knowledgePointIds) ? [...new Set(config.knowledgePointIds)] : [];
  for (const pointId of knowledgePointIds) {
    const point = getGeneralKnowledgePoint(pointId);
    if (!point?.enabled || (subjectId && point.subjectId !== subjectId) || (topicId && point.topicId !== topicId)) {
      throw new Error(`知识点 ${pointId} 不可用或与当前筛选不匹配。`);
    }
  }
  if (activityType === 'knowledge' && (!subjectId || knowledgePointIds.length === 0)) throw new Error('知识点学习需要选择学科和至少一个知识点。');
  const needsQuestionCount = ['practice', 'exam', 'mistakes'].includes(activityType);
  const targetQuestionCount = config.targetQuestionCount ?? (activityType === 'exam' ? 10 : activityType === 'mistakes' ? 10 : null);
  if (needsQuestionCount && (!Number.isInteger(Number(targetQuestionCount)) || Number(targetQuestionCount) < 1)) throw new Error('目标题量必须是大于 0 的整数。');
  const durationSeconds = activityType === 'exam' ? Number(config.durationSeconds ?? 600) : null;
  if (activityType === 'exam' && (!Number.isFinite(durationSeconds) || durationSeconds < 60)) throw new Error('限时模拟时长至少为 1 分钟。');
  return {
    activityType, subjectId, topicId, knowledgePointIds,
    targetQuestionCount: needsQuestionCount ? Number(targetQuestionCount) : null,
    durationSeconds,
    sourceFilter: ['all', 'official', 'official_outline_example', 'verified_exam', 'recalled', 'third_party_mock', 'original'].includes(config.sourceFilter) ? (config.sourceFilter || 'all') : 'all',
    difficultyFilter: ['all', 'easy', 'medium', 'hard'].includes(config.difficultyFilter) ? (config.difficultyFilter || 'all') : 'all',
  };
}
