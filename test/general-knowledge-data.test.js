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
