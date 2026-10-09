import test from 'node:test';
import assert from 'node:assert/strict';

const aptitudePlan = await import('../src/aptitude/planTasks.js').catch(() => ({}));
const planTasks = await import('../src/science/planTasks.js').catch(() => ({}));
const { APTITUDE_MODULES } = await import('../src/aptitude/modules.js');

test('new-module task configuration normalizes supported fields and rejects invalid scope', () => {
  assert.equal(typeof aptitudePlan.normalizeAptitudeConfig, 'function');
  const exam = aptitudePlan.normalizeAptitudeConfig('verbal', {
    moduleId: 'verbal', activityType: 'exam', subjectId: 'reading', topicId: 'reading:center',
    knowledgePointIds: ['reading:main', 'reading:main'], targetQuestionCount: '8', durationSeconds: '600',
    sourceFilter: 'verified_exam', difficultyFilter: 'medium',
  });
  assert.deepEqual(exam, {
    moduleId: 'verbal', activityType: 'exam', subjectId: 'reading', topicId: 'reading:center',
    knowledgePointIds: ['reading:main'], mode: 'exam', targetQuestionCount: 8, durationSeconds: 600,
    sourceFilter: 'verified_exam', difficultyFilter: 'medium',
  });
  assert.deepEqual(aptitudePlan.normalizeAptitudeConfig('political-theory', {}), {
    moduleId: 'political-theory', activityType: 'free', subjectId: null, topicId: null,
    knowledgePointIds: [], mode: null, targetQuestionCount: null, durationSeconds: null,
    sourceFilter: 'all', difficultyFilter: 'all',
  });
  assert.throws(() => aptitudePlan.normalizeAptitudeConfig('science', {}), /新建行测模块/);
  assert.throws(() => aptitudePlan.normalizeAptitudeConfig('verbal', { moduleId: 'reasoning' }), /模块/);
  assert.throws(() => aptitudePlan.normalizeAptitudeConfig('verbal', { activityType: 'practice', targetQuestionCount: 0 }), /题量/);
  assert.throws(() => aptitudePlan.normalizeAptitudeConfig('verbal', { activityType: 'exam', targetQuestionCount: 5, durationSeconds: 59 }), /时长/);
  assert.throws(() => aptitudePlan.normalizeAptitudeConfig('verbal', { activityType: 'practice', targetQuestionCount: 5, sourceFilter: 'unverified' }), /题源/);
  assert.throws(() => aptitudePlan.normalizeAptitudeConfig('verbal', { activityType: 'practice', targetQuestionCount: 5, difficultyFilter: 'expert' }), /难度/);
  assert.throws(() => aptitudePlan.normalizeAptitudeConfig('verbal', { activityType: 'knowledge', subjectId: 'reading' }), /知识点/);
});

test('political theory and the other new modules can create and edit isolated task configuration', () => {
  assert.equal(typeof planTasks.createPlanTask, 'function');
  const created = planTasks.createPlanTask({
    taskType: 'political_theory', title: '政治理论练习', date: '2026-10-09',
    aptitudeConfig: { moduleId: 'political-theory', activityType: 'practice', targetQuestionCount: 12 },
  }, { id: 'political-task', now: '2026-10-09T00:00:00.000Z' });
  assert.equal(created.aptitudeConfig.moduleId, 'political-theory');
  assert.equal(created.aptitudeConfig.targetQuestionCount, 12);
  assert.equal(created.scienceConfig, null);
  assert.equal(created.generalKnowledgeConfig, null);

  const edited = planTasks.updatePlanTask([created], created.id, {
    taskType: 'reasoning',
    aptitudeConfig: { moduleId: 'reasoning', activityType: 'exam', targetQuestionCount: 10, durationSeconds: 900 },
  }, { now: '2026-10-09T01:00:00.000Z' })[0];
  assert.equal(edited.id, created.id);
  assert.equal(edited.createdAt, created.createdAt);
  assert.equal(edited.aptitudeConfig.moduleId, 'reasoning');
  assert.equal(edited.aptitudeConfig.durationSeconds, 900);
  for (const module of APTITUDE_MODULES.filter((item) => item.studyStore === 'aptitudeModuleStudies')) {
    const task = planTasks.createPlanTask({
      taskType: module.taskType, title: `${module.area}自由学习`, date: '2026-10-09',
    }, { id: `${module.id}-free`, now: '2026-10-09T00:00:00.000Z' });
    assert.equal(task.aptitudeConfig.moduleId, module.id);
    assert.equal(task.aptitudeConfig.activityType, 'free');
  }
  assert.throws(() => planTasks.createPlanTask({
    taskType: 'political_theory', title: '错误模块', date: '2026-10-09',
    aptitudeConfig: { moduleId: 'verbal' },
  }), /模块/);

  const previouslyCompleted = { ...created, status: 'completed', completionSource: 'system_verified' };
  const recapped = planTasks.updatePlanTask([previouslyCompleted], created.id, {
    aptitudeConfig: { moduleId: 'political-theory', activityType: 'practice', targetQuestionCount: 15 },
  }, { now: '2026-10-09T02:00:00.000Z' });
  const history = Array.from({ length: 12 }, (_, index) => ({
    id: `answer-${index}`, moduleId: 'political-theory', sessionId: 'old-practice', questionId: `q-${index}`,
  }));
  const reconciled = aptitudePlan.reconcileAptitudeModuleTaskProgress(recapped, created.id, [
    { id: 'old-practice', moduleId: 'political-theory', planTaskId: created.id, mode: 'practice', status: 'completed', filters: {} },
  ], history, { now: '2026-10-09T03:00:00.000Z' });
  assert.equal(reconciled[0].status, 'in_progress');
  assert.equal(reconciled[0].completionSource, 'not_completed');
  assert.equal(reconciled[0].createdAt, created.createdAt);
  assert.equal(history.length, 12);
});

test('module task progress filters by module, task, and configured scope then deduplicates questions', () => {
  assert.equal(typeof aptitudePlan.getAptitudeModuleTaskProgress, 'function');
  const task = {
    id: 'verbal-task', taskType: 'verbal', aptitudeConfig: {
      moduleId: 'verbal', activityType: 'practice', subjectId: 'reading', topicId: 'reading:center',
      knowledgePointIds: ['reading:main'], targetQuestionCount: 3, sourceFilter: 'verified_exam', difficultyFilter: 'medium',
    },
  };
  const matchingFilters = {
    subjectId: 'reading', topicId: 'reading:center', knowledgePointId: 'reading:main',
    sourceType: 'verified_exam', difficulty: 'medium', onlyMistakes: false,
  };
  const sessions = [
    { id: 'v-a', moduleId: 'verbal', planTaskId: task.id, mode: 'practice', status: 'completed', filters: matchingFilters },
    { id: 'v-b', moduleId: 'verbal', planTaskId: task.id, mode: 'practice', status: 'completed', filters: matchingFilters },
    { id: 'wrong-module', moduleId: 'reasoning', planTaskId: task.id, mode: 'practice', status: 'completed', filters: matchingFilters },
    { id: 'wrong-task', moduleId: 'verbal', planTaskId: 'other-task', mode: 'practice', status: 'completed', filters: matchingFilters },
    { id: 'wrong-topic', moduleId: 'verbal', planTaskId: task.id, mode: 'practice', status: 'completed', filters: { ...matchingFilters, topicId: 'reading:logic' } },
    { id: 'missing-filters', moduleId: 'verbal', planTaskId: task.id, mode: 'practice', status: 'completed', filters: {} },
  ];
  const answers = [
    { id: 'a1', moduleId: 'verbal', sessionId: 'v-a', questionId: 'q1' },
    { id: 'a2', moduleId: 'verbal', sessionId: 'v-a', questionId: 'q2' },
    { id: 'a2-again', moduleId: 'verbal', sessionId: 'v-b', questionId: 'q2' },
    { id: 'a3', moduleId: 'verbal', sessionId: 'v-b', questionId: 'q3' },
    { id: 'foreign-answer', moduleId: 'reasoning', sessionId: 'wrong-module', questionId: 'q4' },
    { id: 'wrong-topic-answer', moduleId: 'verbal', sessionId: 'wrong-topic', questionId: 'q5' },
    { id: 'wrong-filter-answer', moduleId: 'verbal', sessionId: 'missing-filters', questionId: 'q6' },
  ];
  const progress = aptitudePlan.getAptitudeModuleTaskProgress(task, sessions, answers);
  assert.equal(progress.progressCount, 3);
  assert.equal(progress.completedCount, 3);
  assert.equal(progress.isComplete, true);
  assert.deepEqual(progress.questionIds, ['q1', 'q2', 'q3']);
});

test('knowledge and active exam progress cannot be inferred from another module or an unsubmitted exam', () => {
  const examTask = {
    id: 'exam-task', taskType: 'quantitative', aptitudeConfig: {
      moduleId: 'quantitative', activityType: 'exam', targetQuestionCount: 2,
      durationSeconds: 600, sourceFilter: 'all', difficultyFilter: 'all',
    },
  };
  const activeExam = [{ id: 'exam', moduleId: 'quantitative', planTaskId: examTask.id, mode: 'exam', status: 'active',
    filters: {}, draftAnswers: { q1: { optionId: 'A' } } }];
  const draftProgress = aptitudePlan.getAptitudeModuleTaskProgress(examTask, activeExam, []);
  assert.equal(draftProgress.displayCount, 1);
  assert.equal(draftProgress.completedCount, 0);
  assert.equal(draftProgress.isComplete, false);

  const knowledgeTask = {
    id: 'political-lesson', taskType: 'political_theory', aptitudeConfig: {
      moduleId: 'political-theory', activityType: 'knowledge', subjectId: 'constitution',
      topicId: 'constitution:principles', knowledgePointIds: ['constitution:rule-of-law'],
      targetQuestionCount: null, durationSeconds: null, sourceFilter: 'all', difficultyFilter: 'all',
    },
  };
  const lessonSessions = [
    { id: 'done', moduleId: 'political-theory', planTaskId: knowledgeTask.id, mode: 'knowledge', status: 'completed',
      knowledgePointId: 'constitution:rule-of-law', filters: { subjectId: 'constitution', topicId: 'constitution:principles' } },
    { id: 'other-module', moduleId: 'verbal', planTaskId: knowledgeTask.id, mode: 'knowledge', status: 'completed',
      knowledgePointId: 'constitution:rule-of-law', filters: { subjectId: 'constitution', topicId: 'constitution:principles' } },
  ];
  const lessonProgress = aptitudePlan.getAptitudeModuleTaskProgress(knowledgeTask, lessonSessions, []);
  assert.equal(lessonProgress.completedCount, 1);
  assert.equal(lessonProgress.isComplete, true);
});
