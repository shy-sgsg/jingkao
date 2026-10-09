import test from 'node:test';
import assert from 'node:assert/strict';

test('science tree uses one stable four-discipline catalog for point lookup', async () => {
  const knowledge = await import('../src/science/knowledge.js').catch(() => ({}));
  assert.equal(typeof knowledge.getScienceTree, 'function', 'the science knowledge module exposes its catalog');
  const tree = knowledge.getScienceTree();

  assert.deepEqual(tree.map((subject) => subject.id), ['physics', 'chemistry', 'biology', 'geography']);
  const pointIds = tree.flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints.map((point) => point.id)));
  assert.equal(new Set(pointIds).size, pointIds.length);
  assert.ok(pointIds.includes('physics:buoyancy'));
  assert.equal(knowledge.getKnowledgePoint('physics:buoyancy').title, '浮力与阿基米德原理');
  assert.equal(knowledge.getKnowledgePoint('unknown:point'), null);
});

test('question filters combine real subject, point, difficulty, source, and unseen constraints', async () => {
  const questions = await import('../src/science/questions.js').catch(() => ({}));
  assert.equal(typeof questions.filterQuestions, 'function', 'the question module filters by selected criteria');
  const bank = [
    { id: 'q-seen', subjectId: 'physics', knowledgePointIds: ['physics:buoyancy'], difficulty: 'medium', sourceType: 'original' },
    { id: 'q-new', subjectId: 'physics', knowledgePointIds: ['physics:buoyancy'], difficulty: 'medium', sourceType: 'original' },
    { id: 'q-other-point', subjectId: 'physics', knowledgePointIds: ['physics:levers'], difficulty: 'medium', sourceType: 'original' },
    { id: 'q-other-source', subjectId: 'physics', knowledgePointIds: ['physics:buoyancy'], difficulty: 'medium', sourceType: 'verified_exam' },
  ];

  assert.deepEqual(questions.filterQuestions(bank, {
    subjectId: 'physics',
    knowledgePointId: 'physics:buoyancy',
    difficulty: 'medium',
    sourceType: 'original',
    answeredQuestionIds: ['q-seen'],
    onlyUnanswered: true,
  }).map((question) => question.id), ['q-new']);
});

test('question validation rejects duplicate IDs and published items without an answer key', async () => {
  const questions = await import('../src/science/questions.js').catch(() => ({}));
  assert.equal(typeof questions.validateQuestionBank, 'function', 'the question module validates published items');
  const question = {
    id: 'q-1',
    subjectId: 'physics',
    topicId: 'physics:pressure',
    knowledgePointIds: ['physics:buoyancy'],
    stem: '一个物体排开液体的体积增大时，其他条件不变，浮力如何变化？',
    options: [{ id: 'A', text: '增大' }, { id: 'B', text: '减小' }, { id: 'C', text: '不变' }, { id: 'D', text: '无法判断' }],
    correctAnswer: 'A',
    explanation: '浮力等于液体密度、重力加速度与排开液体体积的乘积。',
    difficulty: 'medium',
    sourceType: 'original',
    verificationStatus: 'verified',
    copyrightStatus: 'original',
    publishStatus: 'published',
  };

  assert.deepEqual(questions.validateQuestionBank([question], { knowledgePointIds: ['physics:buoyancy'] }).issues, []);

  const invalid = questions.validateQuestionBank([
    { ...question, correctAnswer: 'E' },
    { ...question, stem: '第二条重复 ID 的题目', correctAnswer: undefined },
  ], { knowledgePointIds: ['physics:buoyancy'] });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.some((issue) => issue.code === 'duplicate_id'));
  assert.ok(invalid.issues.some((issue) => issue.code === 'invalid_answer'));
});

test('published questions distinguish the existing original bank from sourced examples and recall items', async () => {
  const bankModule = await import('../src/science/questionBank.js').catch(() => ({}));
  const { getScienceTree } = await import('../src/science/knowledge.js');
  const { validateQuestionBank, filterQuestions } = await import('../src/science/questions.js');
  const { SCIENCE_SOURCES } = await import('../src/science/sources.js');
  const originalBank = bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceType === 'original');
  assert.equal(originalBank.length, 153);
  assert.equal(bankModule.SCIENCE_QUESTION_BANK.length, 176);
  const subjectCounts = Object.fromEntries(['physics', 'chemistry', 'biology', 'geography']
    .map((subjectId) => [subjectId, originalBank.filter((question) => question.subjectId === subjectId).length]));
  assert.deepEqual(subjectCounts, { physics: 42, chemistry: 37, biology: 36, geography: 38 });

  const pointIds = getScienceTree().flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints.map((point) => point.id)));
  const validation = validateQuestionBank(bankModule.SCIENCE_QUESTION_BANK, {
    knowledgePointIds: pointIds, sourceIds: SCIENCE_SOURCES.map((source) => source.id),
  });
  assert.equal(validation.valid, true, JSON.stringify(validation.issues.slice(0, 5)));
  assert.ok(originalBank.every((question) => question.sourceType === 'original'
    && question.copyrightStatus === 'original' && question.verificationStatus === 'verified'
    && question.publishStatus === 'published' && question.region === 'general' && question.examYear === null));
  const official = filterQuestions(bankModule.SCIENCE_QUESTION_BANK, { sourceType: 'official' });
  assert.deepEqual(official.map((question) => question.sourceType), ['official_outline_example', 'official_outline_example']);
  assert.ok(bankModule.SCIENCE_QUESTION_BANK.some((question) => question.sourceType === 'recalled' && question.examYear === 2019));
  assert.ok(bankModule.SCIENCE_QUESTION_BANK.some((question) => question.sourceType === 'third_party_mock'));
  assert.ok(bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceType !== 'original')
    .every((question) => question.sourceId && question.sourceNote));
  assert.equal(bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceType === 'recalled').length, 19);
  assert.equal(bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceType === 'third_party_mock').length, 2);
});

test('published knowledge lessons cover all four disciplines with practical explanations', async () => {
  const { getScienceTree } = await import('../src/science/knowledge.js');
  const tree = getScienceTree();
  const counts = Object.fromEntries(tree.map((subject) => {
    const lessons = subject.topics.flatMap((topic) => topic.knowledgePoints).filter((point) => point.contentStatus === 'published');
    assert.ok(lessons.length >= 5, `${subject.id} has at least five published lessons`);
    assert.ok(lessons.every((point) => point.content.summary && point.content.explanation
      && point.content.everydayExample && point.content.quickMethod), `${subject.id} lessons contain actionable explanations`);
    return [subject.id, lessons.length];
  }));
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 40);
});
