import test from 'node:test';
import assert from 'node:assert/strict';

test('general-knowledge tree covers the required domains with stable point IDs', async () => {
  const knowledge = await import('../src/general-knowledge/knowledge.js').catch(() => ({}));
  assert.equal(typeof knowledge.getGeneralKnowledgeTree, 'function');
  const tree = knowledge.getGeneralKnowledgeTree();
  assert.deepEqual(tree.map((subject) => subject.id), [
    'law', 'economy', 'history', 'humanities', 'technology', 'geography',
    'ecology', 'governance', 'beijing', 'current-affairs', 'philosophy',
  ]);
  const points = tree.flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints));
  const pointIds = points.map((point) => point.id);
  assert.ok(points.length >= 100, 'the catalog covers the breadth of the supplied outline');
  assert.equal(new Set(pointIds).size, pointIds.length);
  assert.ok(knowledge.getGeneralKnowledgePoint('law:civil-code-basics'));
  assert.ok(knowledge.getGeneralKnowledgePoint('beijing:12345-response'));
  assert.equal(knowledge.getGeneralKnowledgePoint('unknown:point'), null);
});

test('general-knowledge question filters apply module, topic, point, source, and answered constraints', async () => {
  const questions = await import('../src/general-knowledge/questions.js').catch(() => ({}));
  assert.equal(typeof questions.filterGeneralKnowledgeQuestions, 'function');
  const bank = [
    { id: 'seen', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law', knowledgePointIds: ['law:administrative-penalty'], sourceType: 'verified_exam', publishStatus: 'published' },
    { id: 'new', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law', knowledgePointIds: ['law:administrative-penalty'], sourceType: 'official_outline_example', publishStatus: 'published' },
    { id: 'other-point', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:civil-law', knowledgePointIds: ['law:civil-code-basics'], sourceType: 'official_outline_example', publishStatus: 'published' },
    { id: 'unpublished', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law', knowledgePointIds: ['law:administrative-penalty'], sourceType: 'official_outline_example', publishStatus: 'review' },
    { id: 'science', moduleId: 'science_reasoning', subjectId: 'law', topicId: 'law:administrative-law', knowledgePointIds: ['law:administrative-penalty'], sourceType: 'official_outline_example', publishStatus: 'published' },
  ];
  assert.deepEqual(questions.filterGeneralKnowledgeQuestions(bank, {
    subjectId: 'law', topicId: 'law:administrative-law', knowledgePointId: 'law:administrative-penalty',
    sourceType: 'official_outline_example', onlyUnanswered: true, answeredQuestionIds: ['seen'],
  }).map((question) => question.id), ['new']);
});

test('question validation rejects duplicate IDs and unsupported published content', async () => {
  const questions = await import('../src/general-knowledge/questions.js').catch(() => ({}));
  assert.equal(typeof questions.validateGeneralKnowledgeQuestionBank, 'function');
  const valid = {
    id: 'gk-law-1', moduleId: 'general_knowledge', subjectId: 'law', topicId: 'law:administrative-law',
    knowledgePointIds: ['law:administrative-penalty'], stem: '依照题目所列的现行规则，以下哪项表述正确？',
    options: [{ id: 'A', text: '选项甲' }, { id: 'B', text: '选项乙' }, { id: 'C', text: '选项丙' }, { id: 'D', text: '选项丁' }],
    correctAnswer: 'A', explanation: '解析需说明适用规则及判断步骤。', difficulty: 'medium',
    sourceType: 'original', sourceId: 'gk-original-1', sourceNote: '依据现行公开法规自编，非历年真题。',
    verificationStatus: 'verified', copyrightStatus: 'original', publishStatus: 'published',
  };
  assert.deepEqual(questions.validateGeneralKnowledgeQuestionBank([valid], {
    knowledgePointIds: ['law:administrative-penalty'], sourceIds: ['gk-original-1'],
  }).issues, []);
  const invalid = questions.validateGeneralKnowledgeQuestionBank([
    { ...valid, correctAnswer: 'E' }, { ...valid, stem: '重复编号' },
  ], { knowledgePointIds: ['law:administrative-penalty'], sourceIds: ['gk-original-1'] });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.issues.some((issue) => issue.code === 'duplicate_id'));
  assert.ok(invalid.issues.some((issue) => issue.code === 'invalid_answer'));
});

test('sourced questions rank ahead of original supplements and retain source transparency', async () => {
  const bank = await import('../src/general-knowledge/questionBank.js').catch(() => ({}));
  const sources = await import('../src/general-knowledge/sources.js').catch(() => ({}));
  assert.ok(Array.isArray(bank.GENERAL_KNOWLEDGE_QUESTION_BANK));
  assert.ok(Array.isArray(sources.GENERAL_KNOWLEDGE_SOURCES));
  const questions = bank.GENERAL_KNOWLEDGE_QUESTION_BANK;
  assert.ok(questions.length >= 3);
  assert.ok(questions.some((question) => question.sourceType === 'official_outline_example' && question.publishStatus === 'published'));
  assert.ok(sources.GENERAL_KNOWLEDGE_SOURCES.some((source) => source.sourceType === 'third_party_mock' && source.publishStatus === 'reference_only'));
  assert.ok(questions.filter((question) => question.publishStatus === 'published')
    .every((question) => question.moduleId === 'general_knowledge' && question.sourceId && question.sourceNote));
});

test('every imported Jiangxi mock question links to a registered source', async () => {
  const [imported, sources] = await Promise.all([
    import('../src/aptitude/importedQuestionData.js'),
    import('../src/general-knowledge/sources.js'),
  ]);
  const sourceIds = new Set(sources.GENERAL_KNOWLEDGE_SOURCES.map(({ id }) => id));
  const importedSourceIds = [...new Set(imported.IMPORTED_SOURCE_QUESTIONS
    .filter((question) => question.moduleId === 'general-knowledge' && question.region === 'jiangxi')
    .map((question) => question.sourceId))].sort();

  assert.deepEqual(importedSourceIds, ['zhanhong-jiangxi-2025-mock-1', 'zhanhong-jiangxi-2025-mock-3']);
  assert.deepEqual(importedSourceIds.filter((id) => !sourceIds.has(id)), [], 'published question sources must exist in the source registry');
});

test('administrative penalty and reconsideration practice is traceable to current official law texts', async () => {
  const [bank, sources, knowledge, lessonContent, questionRules] = await Promise.all([
    import('../src/general-knowledge/questionBank.js'),
    import('../src/general-knowledge/sources.js'),
    import('../src/general-knowledge/knowledge.js'),
    import('../src/general-knowledge/lessonContent.js'),
    import('../src/general-knowledge/questions.js'),
  ]);
  const expectedIds = [
    'gk-original-admin-minor-correction',
    'gk-original-admin-first-violation',
    'gk-original-admin-hearing-rights',
    'gk-original-review-deadline',
    'gk-original-review-prerequisite',
    'gk-original-review-oral-application',
  ];
  const questions = bank.GENERAL_KNOWLEDGE_QUESTION_BANK.filter(({ id }) => expectedIds.includes(id));
  const sourceIds = sources.GENERAL_KNOWLEDGE_SOURCES.map(({ id }) => id);
  const sourceById = new Map(sources.GENERAL_KNOWLEDGE_SOURCES.map((source) => [source.id, source]));

  assert.deepEqual(questions.map(({ id }) => id).sort(), [...expectedIds].sort());
  assert.equal(lessonContent.GENERAL_KNOWLEDGE_LESSONS['law:administrative-remedies']?.contentAsOf, '2026-10-09');
  assert.ok(lessonContent.GENERAL_KNOWLEDGE_LESSONS['law:administrative-penalty']?.sourceIds.includes('admin-penalty-law-2021'));
  assert.equal(sourceById.get('admin-penalty-law-2021')?.verificationStatus, 'verified');
  assert.equal(sourceById.get('admin-reconsideration-law-2023')?.verificationStatus, 'verified');
  assert.deepEqual(questionRules.validateGeneralKnowledgeQuestionBank(questions, {
    knowledgePointIds: knowledge.getGeneralKnowledgePointIds(), sourceIds,
  }).issues, []);
});

test('collected science and technology question themes have reviewed lessons and source-backed practice', async () => {
  const [bank, sources, knowledge, lessons, questionRules] = await Promise.all([
    import('../src/general-knowledge/questionBank.js'),
    import('../src/general-knowledge/sources.js'),
    import('../src/general-knowledge/knowledge.js'),
    import('../src/general-knowledge/lessonContent.js'),
    import('../src/general-knowledge/questions.js'),
  ]);
  const expected = [
    ['gk-original-ballastless-track', 'technology:railway-track', 'railway-high-speed-design'],
    ['gk-original-lunar-eclipse', 'geography:eclipse', 'lunar-eclipse-science'],
    ['gk-original-thermal-printing', 'technology:thermal-printing', 'thermal-printing-science'],
  ];
  const sourceIds = sources.GENERAL_KNOWLEDGE_SOURCES.map(({ id }) => id);
  const questionById = new Map(bank.GENERAL_KNOWLEDGE_QUESTION_BANK.map((question) => [question.id, question]));
  for (const [id, pointId, sourceId] of expected) {
    const question = questionById.get(id);
    assert.equal(question?.knowledgePointIds[0], pointId);
    assert.equal(question?.sourceId, sourceId);
    assert.equal(question?.publishStatus, 'published');
    assert.equal(question?.sourceType, 'original');
    assert.ok(lessons.GENERAL_KNOWLEDGE_LESSONS[pointId]?.explanation);
    assert.ok(lessons.GENERAL_KNOWLEDGE_LESSONS[pointId]?.examAngle);
    assert.ok(question.sourceNote);
  }
  assert.deepEqual(questionRules.validateGeneralKnowledgeQuestionBank(bank.GENERAL_KNOWLEDGE_QUESTION_BANK, {
    knowledgePointIds: knowledge.getGeneralKnowledgePointIds(), sourceIds,
  }).issues, []);
});
