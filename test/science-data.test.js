import test from 'node:test';
import assert from 'node:assert/strict';

test('science tree uses one stable four-discipline catalog for point lookup', async () => {
  const knowledge = await import('../src/science/knowledge.js').catch(() => ({}));
  assert.equal(typeof knowledge.getScienceTree, 'function', 'the science knowledge module exposes its catalog');
  const tree = knowledge.getScienceTree();

  assert.deepEqual(tree.map((subject) => subject.id), ['physics', 'chemistry', 'biology', 'geography']);
  const pointIds = tree.flatMap((subject) => subject.topics.flatMap((topic) => topic.knowledgePoints.map((point) => point.id)));
  assert.equal(new Set(pointIds).size, pointIds.length);
  assert.equal(pointIds.length, 125);
  assert.ok(pointIds.includes('physics:buoyancy'));
  assert.ok(pointIds.includes('physics:centripetal-force'));
  assert.ok(pointIds.includes('geography:plate-tectonics'));
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
  assert.equal(bankModule.SCIENCE_QUESTION_BANK.length, 230);
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
  assert.equal(official.length, 6);
  assert.ok(official.some((question) => question.sourceId === 'sh-2026-official-outline'));
  assert.ok(official.some((question) => question.sourceId === 'gd-2021-official-outline'));
  assert.ok(official.some((question) => question.sourceId === 'gd-2026-official-outline'));
  for (const id of [
    'gd-2024-soot-ink', 'gd-2024-insulin-glucose', 'gd-2025-outline-grain-storage', 'gd-2025-recall-bacteria',
    'zj-2024-c-knuckle-evidence', 'zj-2024-c-animal-aging', 'zj-2024-c-cholera-transmission', 'zj-2024-c-breath-biometrics',
    'zj-2025-c-stork-migration',
    'zj-2026-c-corn-rows', 'zj-2026-c-hair-follicle-stem-cells',
    'sh-2026-bci-decoding', 'sh-2026-bladeless-fan-airflow', 'sh-2026-capacitive-touchscreen',
    'sh-2026-fast-charging-battery', 'sh-2026-mask-layers', 'sh-2026-click-chemistry',
    'sh-2026-infrared-thermal-imaging', 'sh-2026-bowl-water-resonance', 'sh-2026-vr-force-feedback',
    'gd-2026-outline-slope-forces', 'mock-zhonggong-2027-red-object-color',
    'gd-2026-recall-front-rain',
    'mock-zhanhong-water-mechanical-energy', 'mock-zhanhong-seashore-specific-heat',
    'mock-zhanhong-blind-path-pressure', 'mock-zhanhong-gas-identification',
    'sh-2014-a-wetting-adhesion',
    'gd-2021-outline-ladder-climber',
    'sh-2022-b-microgravity-filtering', 'sh-2022-b-ship-buoyancy', 'sh-2022-b-washer-resonance',
    'sh-2022-b-powerbank-capacity', 'gd-2021-county-curving-car', 'gd-2021-county-foam-extinguisher',
    'gd-2021-county-plate-boundary', 'mock-sh-2022-v5-camera-distance',
    'mock-sh-2022-v5-galileo-thermometer', 'mock-sh-2022-v5-static-friction',
    'zj-2025-mock-mars-microbes', 'mock-huatu-buoyancy-load',
  ]) {
    assert.ok(bankModule.SCIENCE_QUESTION_BANK.some((question) => question.id === id), `${id} is published`);
  }
  assert.ok(bankModule.SCIENCE_QUESTION_BANK.some((question) => question.sourceType === 'recalled' && question.examYear === 2019));
  assert.ok(bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceId === 'sh-2025-b-recall').length >= 3);
  assert.ok(bankModule.SCIENCE_QUESTION_BANK.some((question) => question.sourceType === 'third_party_mock'));
  assert.ok(bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceType !== 'original')
    .every((question) => question.sourceId && question.sourceNote));
  assert.equal(bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceType === 'recalled').length, 58);
  assert.equal(bankModule.SCIENCE_QUESTION_BANK.filter((question) => question.sourceType === 'third_party_mock').length, 13);
  assert.equal(SCIENCE_SOURCES.length, 33);
});

test('2018 Shanghai B recall questions are attributed and connect to complete lens knowledge', async () => {
  const { SCIENCE_QUESTION_BANK } = await import('../src/science/questionBank.js');
  const { getKnowledgePoint } = await import('../src/science/knowledge.js');
  const questions = SCIENCE_QUESTION_BANK.filter((question) => question.sourceId === 'sh-2018-b-recall');

  assert.equal(questions.length, 3);
  assert.ok(questions.every((question) => question.sourceType === 'recalled' && question.examYear === 2018));
  assert.equal(questions.find((question) => question.id === 'sh-2018-b-camera-lens')?.knowledgePointIds.includes('physics:lens-imaging'), true);
  assert.equal(getKnowledgePoint('physics:lens-imaging')?.contentStatus, 'published');
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
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 74);
  assert.equal(counts.geography, 13);
  for (const pointId of [
    'physics:elastic-force', 'physics:optical-phenomena', 'physics:gravity', 'physics:magnetic-field', 'physics:lens-imaging',
    'biology:hormonal-regulation', 'biology:microorganisms', 'biology:musculoskeletal-system',
    'biology:reproduction-inheritance', 'biology:stem-cell-regeneration',
    'biology:organisms-environment', 'biology:respiratory-circulatory-systems',
    'biology:nervous-regulation', 'physics:fluid-flow', 'physics:electrostatics',
    'physics:thermal-radiation', 'physics:pitch-loudness', 'physics:motors-generators',
    'chemistry:electrochemical-cells', 'chemistry:polymer-materials', 'chemistry:common-reactions',
    'physics:specific-heat', 'physics:atmospheric-pressure', 'physics:electric-work',
    'physics:centripetal-force', 'geography:plate-tectonics',
    'physics:wetting-adhesion',
    'chemistry:experiments', 'biology:digestion', 'geography:terrain-reading',
    'geography:fronts-precipitation', 'geography:volcanoes',
  ]) {
    const point = tree.flatMap((subject) => subject.topics).flatMap((topic) => topic.knowledgePoints).find((item) => item.id === pointId);
    assert.equal(point.contentStatus, 'published', `${pointId} has a lesson for the newly collected Shanghai questions`);
  }
});
