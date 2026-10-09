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
  assert.equal(custom.aptitudeConfig, null);
  assert.equal(science.aptitudeConfig, null);
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

test('science task progress counts distinct answers from its own completed sessions', () => {
  const task = taskModel.createPlanTask({
    taskType: 'science_reasoning', title: '物理专项15题', date: '2026-10-09',
    scienceConfig: { activityType: 'practice', subjectId: 'physics', targetQuestionCount: 15 },
  }, { id: 'task-progress', now: '2026-10-09T00:00:00.000Z' });
  const firstQuestions = Array.from({ length: 8 }, (_, index) => `q-${index + 1}`);
  const sessions = [
    { id: 'session-a', planTaskId: task.id, mode: 'practice', status: 'completed', filters: { subjectId: 'physics' }, questionIds: firstQuestions },
    { id: 'session-b', planTaskId: task.id, mode: 'practice', status: 'completed', filters: { subjectId: 'physics' }, questionIds: ['q-1', 'q-9'] },
    { id: 'session-other', planTaskId: 'another-task', mode: 'practice', status: 'completed', filters: { subjectId: 'physics' }, questionIds: ['q-10'] },
  ];
  const answers = [
    ...firstQuestions.map((questionId) => ({ id: `a-${questionId}`, sessionId: 'session-a', questionId })),
    { id: 'a-duplicate', sessionId: 'session-b', questionId: 'q-1' },
    { id: 'a-ninth', sessionId: 'session-b', questionId: 'q-9' },
    { id: 'a-other-task', sessionId: 'session-other', questionId: 'q-10' },
  ];

  const progress = taskModel.getPlanTaskProgress(task, sessions, answers);
  assert.equal(progress.progressCount, 9);
  assert.equal(progress.targetCount, 15);
  assert.equal(progress.remainingCount, 6);
  assert.equal(progress.isComplete, false);
  assert.deepEqual(progress.questionIds, [...firstQuestions, 'q-9']);
});

test('science task progress includes saved exam choices but does not finish before a valid submission', () => {
  const task = taskModel.createPlanTask({
    taskType: 'science_reasoning', title: '限时模拟', date: '2026-10-09',
    scienceConfig: { activityType: 'exam', subjectId: 'physics', targetQuestionCount: 2, durationSeconds: 120 },
  }, { id: 'task-exam-progress', now: '2026-10-09T00:00:00.000Z' });
  const sessions = [{
    id: 'exam-a', planTaskId: task.id, mode: 'exam', status: 'active', filters: { subjectId: 'physics' },
    questionIds: ['q-1', 'q-2'], draftAnswers: { 'q-1': { optionId: 'A' } },
  }];

  const progress = taskModel.getPlanTaskProgress(task, sessions, []);
  assert.equal(progress.displayCount, 1);
  assert.equal(progress.progressCount, 0);
  assert.equal(progress.isComplete, false);
});

test('starting and changing a science task reconciles status without losing answer history', () => {
  const task = taskModel.createPlanTask({
    taskType: 'science_reasoning', title: '物理专项', date: '2026-10-09', status: 'completed', completionSource: 'system_verified',
    scienceConfig: { activityType: 'practice', subjectId: 'physics', targetQuestionCount: 8 },
  }, { id: 'task-reconcile', now: '2026-10-09T00:00:00.000Z' });
  const questions = Array.from({ length: 8 }, (_, index) => `q-${index + 1}`);
  const sessions = [{ id: 'done', planTaskId: task.id, mode: 'practice', status: 'completed', filters: { subjectId: 'physics' }, questionIds: questions }];
  const answers = questions.map((questionId, index) => ({ id: `done-${index}`, sessionId: 'done', questionId }));
  const increased = taskModel.updatePlanTask([task], task.id, {
    scienceConfig: { activityType: 'practice', subjectId: 'physics', targetQuestionCount: 15 },
  }, { now: '2026-10-09T01:00:00.000Z' });
  const reconciled = taskModel.reconcileSciencePlanTaskProgress(increased, task.id, sessions, answers, { now: '2026-10-09T02:00:00.000Z' });
  const started = taskModel.markPlanTaskInProgress(reconciled, task.id, { now: '2026-10-09T03:00:00.000Z' });

  assert.equal(reconciled[0].status, 'in_progress');
  assert.equal(reconciled[0].completionSource, 'not_completed');
  assert.equal(started[0].status, 'in_progress');
  assert.equal(taskModel.getPlanTaskProgress(started[0], sessions, answers).progressCount, 8);
  assert.equal(answers.length, 8, 'reopening does not delete the original answer history');
});
