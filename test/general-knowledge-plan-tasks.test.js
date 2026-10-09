import test from 'node:test';
import assert from 'node:assert/strict';

const plan = await import('../src/general-knowledge/planConfig.js').catch(() => ({}));
const progressTools = await import('../src/general-knowledge/planTasks.js').catch(() => ({}));

test('general-knowledge tasks validate module-specific filters and retain a stable configuration', async () => {
  const common = await import('../src/science/planTasks.js');
  assert.equal(typeof plan.normalizeGeneralKnowledgeConfig, 'function');
  const config = plan.normalizeGeneralKnowledgeConfig({
    activityType: 'practice', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-penalty'], targetQuestionCount: 15,
    sourceFilter: 'verified_exam', difficultyFilter: 'medium',
  });
  assert.equal(config.targetQuestionCount, 15);
  assert.equal(config.activityType, 'practice');
  assert.throws(() => plan.normalizeGeneralKnowledgeConfig({
    activityType: 'knowledge', subjectId: 'law', knowledgePointIds: ['science:buoyancy'],
  }), /知识点/);
  const task = common.createPlanTask({
    taskType: 'general_knowledge', title: '常识法律练习', date: '2026-10-09', generalKnowledgeConfig: config,
  }, { id: 'gk-task', now: '2026-10-09T00:00:00.000Z' });
  assert.equal(task.generalKnowledgeConfig.targetQuestionCount, 15);
  assert.equal(task.scienceConfig, null);
});

test('task progress uses only its own module-linked distinct submitted question records', () => {
  assert.equal(typeof progressTools.getGeneralKnowledgeTaskProgress, 'function');
  const task = { id: 'gk-task', taskType: 'general_knowledge', generalKnowledgeConfig: { activityType: 'practice', targetQuestionCount: 3 } };
  const sessions = [
    { id: 'gk-a', moduleId: 'general_knowledge', planTaskId: task.id, mode: 'practice', status: 'completed', questionIds: ['q1', 'q2'] },
    { id: 'gk-b', moduleId: 'general_knowledge', planTaskId: task.id, mode: 'practice', status: 'completed', questionIds: ['q2', 'q3'] },
    { id: 'science', moduleId: 'science_reasoning', planTaskId: task.id, mode: 'practice', status: 'completed', questionIds: ['q4'] },
  ];
  const answers = [
    { id: 'a1', moduleId: 'general_knowledge', sessionId: 'gk-a', questionId: 'q1' },
    { id: 'a2', moduleId: 'general_knowledge', sessionId: 'gk-a', questionId: 'q2' },
    { id: 'a2-repeat', moduleId: 'general_knowledge', sessionId: 'gk-b', questionId: 'q2' },
    { id: 'a3', moduleId: 'general_knowledge', sessionId: 'gk-b', questionId: 'q3' },
    { id: 'a4', moduleId: 'science_reasoning', sessionId: 'science', questionId: 'q4' },
  ];
  const progress = progressTools.getGeneralKnowledgeTaskProgress(task, sessions, answers);
  assert.equal(progress.progressCount, 3);
  assert.equal(progress.remainingCount, 0);
  assert.equal(progress.isComplete, true);
  assert.deepEqual(progress.questionIds, ['q1', 'q2', 'q3']);
});

test('knowledge learning progress only counts completed knowledge sessions assigned to its task', () => {
  const task = { id: 'law-plan', taskType: 'general_knowledge', generalKnowledgeConfig: {
    activityType: 'knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-penalty'],
  } };
  const sessions = [
    { id: 'gk-lesson', moduleId: 'general_knowledge', planTaskId: 'law-plan', mode: 'knowledge', status: 'completed', knowledgePointId: 'law:administrative-penalty', filters: { subjectId: 'law', topicId: 'law:administrative-law' } },
    { id: 'other-task', moduleId: 'general_knowledge', planTaskId: 'different-task', mode: 'knowledge', status: 'completed', knowledgePointId: 'law:administrative-penalty', filters: { subjectId: 'law', topicId: 'law:administrative-law' } },
  ];
  const progress = progressTools.getGeneralKnowledgeTaskProgress(task, sessions, []);
  assert.equal(progress.completedCount, 1);
  assert.equal(progress.isComplete, true);
});
