import test from 'node:test';
import assert from 'node:assert/strict';

const taskModel = await import('../src/science/planTasks.js').catch(() => ({}));

test('custom task text never creates science linkage and science tasks default to free learning', () => {
  assert.equal(typeof taskModel.createPlanTask, 'function');
  const custom = taskModel.createPlanTask({
    taskType: 'custom', title: '科学推理', date: '2026-10-09', scienceConfig: { activityType: 'exam' },
  }, { id: 'custom-1', now: '2026-10-09T00:00:00.000Z' });
  const science = taskModel.createPlanTask({
    taskType: 'science_reasoning', title: '自由学习', date: '2026-10-09',
  }, { id: 'science-1', now: '2026-10-09T00:00:00.000Z' });

  assert.equal(custom.scienceConfig, null);
  assert.equal(science.scienceConfig.activityType, 'free');
  assert.equal(custom.completionSource, 'not_completed');
});

test('science task configuration validates topic and knowledge IDs against the shared knowledge tree', () => {
  assert.equal(typeof taskModel.createPlanTask, 'function');
  const task = taskModel.createPlanTask({
    taskType: 'science_reasoning',
    title: '浮力专项练习15题',
    date: '2026-10-09',
    scienceConfig: {
      activityType: 'practice', subjectId: 'physics', topicId: 'physics:pressure',
      knowledgePointIds: ['physics:buoyancy'], mode: 'practice', targetQuestionCount: 15,
    },
  }, { id: 'practice-1', now: '2026-10-09T00:00:00.000Z' });
  assert.equal(task.scienceConfig.targetQuestionCount, 15);

  assert.throws(() => taskModel.createPlanTask({
    taskType: 'science_reasoning', title: '无效知识点', date: '2026-10-09',
    scienceConfig: { activityType: 'knowledge', subjectId: 'physics', knowledgePointIds: ['physics:not-real'] },
  }, { id: 'invalid-1', now: '2026-10-09T00:00:00.000Z' }), /知识点/);
});

test('task updates preserve IDs and creation time while archival retains history links', () => {
  assert.equal(typeof taskModel.updatePlanTask, 'function');
  const created = taskModel.createPlanTask({ taskType: 'science_reasoning', title: '浮力练习', date: '2026-10-09' }, {
    id: 'task-1', now: '2026-10-09T00:00:00.000Z',
  });
  const updated = taskModel.updatePlanTask([created], 'task-1', {
    date: '2026-10-10', title: '浮力练习20题', scienceConfig: { activityType: 'practice', targetQuestionCount: 20 },
  }, { now: '2026-10-09T01:00:00.000Z' });
  const archived = taskModel.archivePlanTask(updated, 'task-1', { now: '2026-10-09T02:00:00.000Z' });

  assert.equal(updated[0].id, 'task-1');
  assert.equal(updated[0].createdAt, '2026-10-09T00:00:00.000Z');
  assert.equal(updated[0].updatedAt, '2026-10-09T01:00:00.000Z');
  assert.equal(updated[0].scienceConfig.targetQuestionCount, 20);
  assert.equal(archived[0].id, 'task-1');
  assert.equal(archived[0].archivedAt, '2026-10-09T02:00:00.000Z');
  assert.deepEqual(taskModel.getTasksForDate(archived, '2026-10-10'), []);
});
