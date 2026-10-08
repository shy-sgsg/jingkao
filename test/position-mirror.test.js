import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateEligibility } from '../src/data/decision.js';
import { classifyPublicManagementMatch } from '../src/data/positions.js';

const projectRoot = new URL('../', import.meta.url);

test('2026 mirror job rows keep their published codes, names, recruitment counts, and source pages', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const dataset = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const expected = [
    ['823106301', '北京市规划和自然资源委员会昌平分局', '不动产登记岗', 3, 'huatu-2026-org-2'],
    ['223106302', '北京市规划和自然资源委员会昌平分局', '执法巡查岗', 1, 'huatu-2026-org-2'],
    ['223106303', '北京市规划和自然资源委员会昌平分局', '综合执法岗', 1, 'huatu-2026-org-2'],
    ['829908601', '北京市交通委员会昌平公路分局', '工程管理岗', 2, 'huatu-2026-org-3'],
    ['829908602', '北京市交通委员会昌平公路分局', '综合管理岗', 1, 'huatu-2026-org-3'],
    ['526012901', '北京市昌平区人民法院', '法官助理岗', 4, 'huatu-2026-org-5'],
    ['526012902', '北京市昌平区人民法院', '司法行政岗', 1, 'huatu-2026-org-5'],
    ['526012903', '北京市昌平区人民法院', '司法警察岗', 1, 'huatu-2026-org-5'],
    ['625015001', '北京市昌平区人民检察院', '司法警察岗', 1, 'huatu-2026-org-6'],
    ['625015002', '北京市昌平区人民检察院', '检察业务岗1', 4, 'huatu-2026-org-6'],
    ['625015003', '北京市昌平区人民检察院', '检察业务岗2', 1, 'huatu-2026-org-6'],
    ['625015004', '北京市昌平区人民检察院', '检察综合岗', 2, 'huatu-2026-org-6'],
    ['121260801', '中共北京市昌平区委统战部', '综合管理岗', 1, 'huatu-2026-org-8'],
    ['821261102', '北京市昌平区档案馆', '综合管理岗', 2, 'huatu-2026-org-11'],
    ['821261101', '北京市昌平区档案馆', '综合管理岗', 1, 'huatu-2026-org-11'],
    ['221261201', '北京市昌平区发展和改革委员会', '经济管理岗', 2, 'huatu-2026-org-12'],
    ['221261701', '北京市昌平区住房和城乡建设委员会', '房屋安全管理岗', 1, 'huatu-2026-org-17'],
    ['821261703', '北京市昌平区住房和城乡建设委员会', '安全质量监督岗', 2, 'huatu-2026-org-17'],
    ['221261702', '北京市昌平区住房和城乡建设委员会', '综合行政执法岗', 1, 'huatu-2026-org-17'],
    ['221261901', '北京市昌平区交通局', '综合管理岗', 1, 'huatu-2026-org-19'],
    ['221261902', '北京市昌平区交通局', '行政执法岗', 2, 'huatu-2026-org-19'],
    ['821262001', '北京市昌平区水务局', '综合管理岗', 2, 'huatu-2026-org-20'],
    ['221261803', '北京市昌平区城市管理委员会', '行政执法岗2', 2, 'huatu-2026-job-221261803'],
    ['221262801', '中关村科技园区昌平园管理委员会', '服务体系建设岗', 1, 'huatu-2026-org-28'],
    ['231263501', '北京市昌平区霍营街道', '综合管理岗', 1, 'huatu-2026-org-34'],
    ['231264501', '北京市昌平区兴寿镇', '综合管理岗', 1, 'huatu-2026-job-231264501'],
  ];

  for (const [code, unit, title, recruitCount, sourceId] of expected) {
    const position = positions.find((row) => row.code === code);
    assert.ok(position, `missing mirror row ${code}`);
    assert.equal(position.year, 2026, `${code} year`);
    assert.equal(position.unit, unit, `${code} unit`);
    assert.equal(position.title, title, `${code} title`);
    assert.equal(position.recruitCount, recruitCount, `${code} recruit count`);
    assert.ok(position.sources.includes(sourceId), `${code} must link to its detail page`);
    assert.equal(sourceById.get(sourceId)?.level, 'secondary', `${code} must remain classified as secondary`);
  }

  const latestSourceDate = sources.map((source) => source.accessedAt).filter(Boolean).sort().at(-1);
  assert.ok(dataset.dataAsOf >= latestSourceDate, 'dataset date must include the latest reviewed source access date');

  const waterRole = positions.find((row) => row.code === '821262001');
  assert.deepEqual(waterRole.majorCriteria, { graduate: ['1204', '1252'] });
  const eligibility = evaluateEligibility(waterRole, { degree: '硕士研究生', majorCode: '1204', graduationStatus: '应届毕业生' });
  assert.equal(eligibility.majorCheck.status, 'match');
  assert.equal(eligibility.status, '大概率可报但有条件待核', 'a major match must not imply confirmed full eligibility');

  const townRole = positions.find((row) => row.code === '231264501');
  assert.ok(dataset.positions.some((row) => row.code === '231264501'), 'rebuilt website data must include the town role');
  assert.equal(townRole.orgType, '镇');
  assert.deepEqual(townRole.requirements, { politicalStatus: '中共党员' });
  assert.match(townRole.eligibilityText, /面向乡村振兴协理员等服务基层项目人员/);
  assert.equal(evaluateEligibility(townRole, { degree: '本科', majorCode: '1202', politicalStatus: '中共党员' }).status, '大概率可报但有条件待核');
});

test('the public-administration water role flags a non-official new-graduate mismatch for review', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const waterRole = positions.find((row) => row.code === '821262001');

  assert.deepEqual(waterRole.requirements, { graduationStatus: '应届毕业生' });
  const graduateProfile = { degree: '硕士研究生', majorCode: '1204', graduationStatus: '应届毕业生' };
  assert.equal(evaluateEligibility(waterRole, graduateProfile).majorCheck.status, 'match');
  assert.equal(evaluateEligibility(waterRole, graduateProfile).status, '大概率可报但有条件待核');
  assert.equal(evaluateEligibility(waterRole, { ...graduateProfile, graduationStatus: '' }).status, '信息不足');
  assert.equal(evaluateEligibility(waterRole, { ...graduateProfile, graduationStatus: '非应届 / 社会人员' }).status, '信息不足');
  assert.deepEqual(evaluateEligibility(waterRole, { ...graduateProfile, graduationStatus: '非应届 / 社会人员' }).failed, ['graduationStatus']);

  const physicalTestRole = positions.find((row) => row.code === '221261803');
  assert.equal(physicalTestRole.physicalTest, true);
  assert.equal(physicalTestRole.professionalTest, true);
  assert.equal(physicalTestRole.interviewRatio, '3:1');
});

test('the service-project position hard-filters against a profile field the user can actually record', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const appSource = await readFile(new URL('src/app.js', projectRoot), 'utf8');
  const position = positions.find((row) => row.code === '241264201');

  assert.ok(position, 'the targeted service-project role should be available');
  assert.deepEqual(position.requirements, { grassrootsProjectStatus: '是' });
  assert.match(appSource, /field\('grassrootsProjectStatus', '服务基层项目人员资格'/);
  assert.equal(evaluateEligibility(position, { degree: '本科', majorCode: '0301' }).status, '信息不足');
  assert.equal(evaluateEligibility(position, { degree: '本科', majorCode: '0301', grassrootsProjectStatus: '否' }).status, '信息不足');
  assert.deepEqual(evaluateEligibility(position, { degree: '本科', majorCode: '0301', grassrootsProjectStatus: '否' }).failed, ['grassrootsProjectStatus']);
  assert.equal(evaluateEligibility(position, { degree: '本科', majorCode: '0301', grassrootsProjectStatus: '是' }).status, '大概率可报但有条件待核');
});

test('the 2025 Tiantongyuan South street role preserves its real eligibility and workload wording', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const dataset = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const role = positions.find((row) => row.code === '231266001');
  const source = sources.find((row) => row.sourceId === 'huatu-2025-job-231266001');

  assert.ok(role, 'the 2025 street role should be in the candidate position library');
  assert.ok(dataset.positions.some((row) => row.code === '231266001'), 'rebuilt website data should include the street role');
  assert.equal(role.year, 2025);
  assert.equal(role.unit, '北京市昌平区天通苑南街道办事处');
  assert.equal(role.orgType, '街道');
  assert.equal(role.recruitCount, 1);
  assert.equal(role.majorText, '不限');
  assert.deepEqual(role.requirements, { graduationStatus: '应届毕业生' });
  assert.equal(role.eligibilityComplete, false);
  assert.match(role.eligibilityText, /就读最高学历期间不得.*劳动.*不得缴纳社会保险/);
  assert.match(role.eligibilityText, /适合男性报考/);
  assert.equal(role.genderRequirement, undefined, 'a suitability note must not become a hard gender filter');
  assert.equal(source?.level, 'secondary');
  assert.equal(source?.url, 'https://ah.huatu.com/zw/bjgwy/2025/1393.html');
  assert.equal(evaluateEligibility(role, { graduationStatus: '非应届 / 社会人员' }).status, '信息不足');
  assert.equal(evaluateEligibility(role, { degree: '本科', graduationStatus: '应届毕业生' }).status, '大概率可报但有条件待核');
});

test('the 2024 street-and-town sample keeps the visible source-list rows and categories', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const dataset = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const expected = [
    ['231258501', '北京市昌平区城北街道', '城市规划岗', '街道', 2],
    ['231258502', '北京市昌平区城北街道', '综合行政执法岗', '街道', 1],
    ['231258503', '北京市昌平区城北街道', '综合行政执法岗', '街道', 1],
    ['231258601', '北京市昌平区城南街道', '综合管理岗', '街道', 1],
    ['231258602', '北京市昌平区城南街道', '党建工作岗', '街道', 1],
    ['231258603', '北京市昌平区城南街道', '城市建设岗', '街道', 1],
    ['231258604', '北京市昌平区城南街道', '社区治理岗', '街道', 1],
    ['231258701', '北京市昌平区天通苑南街道', '综合行政执法岗', '街道', 1],
    ['231258801', '北京市昌平区霍营街道', '综合行政执法岗', '街道', 1],
    ['231258901', '北京市昌平区回龙观街道', '综合行政执法岗', '街道', 1],
    ['231259001', '北京市昌平区史各庄街道', '政法专项岗', '街道', 1],
    ['231259002', '北京市昌平区史各庄街道', '综合行政执法岗', '街道', 1],
    ['231259101', '北京市昌平区龙泽园街道', '综合行政执法岗二', '街道', 2],
    ['231259102', '北京市昌平区龙泽园街道综合行政执法队', '综合行政执法岗一', '街道', 2],
    ['231259201', '北京市昌平区东小口镇', '城乡规划岗', '镇', 1],
    ['231259202', '北京市昌平区东小口镇', '综合行政执法岗', '镇', 1],
    ['231259301', '北京市昌平区南口镇', '综合文秘岗', '镇', 1],
    ['231259302', '北京市昌平区南口镇', '政法专项岗', '镇', 1],
    ['231259303', '北京市昌平区南口镇', '综合行政执法岗', '镇', 1],
    ['231259401', '北京市昌平区十三陵镇', '政法专项岗', '镇', 1],
    ['231259402', '北京市昌平区十三陵镇', '城乡规划岗', '镇', 2],
    ['231259403', '北京市昌平区十三陵镇', '综合行政执法岗', '镇', 1],
    ['231259501', '北京市昌平区马池口镇', '政法专项岗', '镇', 1],
    ['231259502', '北京市昌平区马池口镇', '统计专项岗一', '镇', 1],
    ['231259503', '北京市昌平区马池口镇', '统计专项岗二', '镇', 1],
    ['231259601', '北京市昌平区北七家镇', '规划建设岗', '镇', 1],
    ['231259602', '北京市昌平区北七家镇', '综合行政执法岗', '镇', 1],
    ['231259701', '北京市昌平区兴寿镇', '综合管理岗', '镇', 1],
    ['231259801', '北京市昌平区百善镇', '综合管理岗', '镇', 1],
    ['231259901', '北京市昌平区流村镇', '财源建设岗', '镇', 2],
    ['231259902', '北京市昌平区流村镇', '综合管理岗', '镇', 2],
    ['231260001', '北京市昌平区崔村镇', '综合管理岗', '镇', 1],
    ['231260002', '北京市昌平区崔村镇', '政法专项岗', '镇', 1],
    ['231260003', '北京市昌平区崔村镇', '城乡建设岗', '镇', 1],
    ['231260004', '北京市昌平区崔村镇', '综合行政执法岗', '镇', 1],
    ['231260101', '北京市昌平区小汤山镇', '综合统计岗', '镇', 1],
    ['231260201', '北京市昌平区南邵镇', '综合管理岗', '镇', 1],
    ['231260202', '北京市昌平区南邵镇', '综合管理岗', '镇', 1],
    ['231260203', '北京市昌平区南邵镇', '综合行政执法岗', '镇', 1],
    ['231260301', '北京市昌平区延寿镇', '综合管理岗', '镇', 1],
  ];
  const source = sources.find((row) => row.sourceId === 'huatu-2024-list');

  assert.equal(source?.url, 'https://ah.huatu.com/zw/bjgwy/changpingzw/2024.html');
  assert.equal(source?.accessedAt, '2026-10-08');
  for (const [code, unit, title, orgType, recruitCount] of expected) {
    const position = positions.find((row) => row.code === code);
    assert.ok(position, `missing 2024 mirror row ${code}`);
    assert.equal(position.year, 2024, `${code} year`);
    assert.equal(position.unit, unit, `${code} unit`);
    assert.equal(position.title, title, `${code} title`);
    assert.equal(position.orgType, orgType, `${code} category`);
    assert.equal(position.recruitCount, recruitCount, `${code} recruit count`);
    assert.ok(position.majorText, `${code} should retain the source-list major condition`);
    assert.ok(position.sources.includes('huatu-2024-list'), `${code} must link to its listing source`);
  }
  const candidateCodes = new Set(expected.map(([code]) => code));
  const longzeyuanRole = positions.find((row) => row.code === '231259102');
  assert.match(longzeyuanRole.eligibilityText, /华图列表单位名.*粉笔详细页标为/);
  assert.deepEqual(longzeyuanRole.majorCriteria, { undergraduate: ['0302', '0303', '1204'], graduate: ['0302', '0303', '0305', '0352', '1204'] });
  assert.equal(evaluateEligibility(longzeyuanRole, { degree: '硕士研究生', majorCode: '0302' }).majorCheck.status, 'match');
  assert.equal(candidateCodes.size, 40, 'the visible source list should map to 40 distinct rows');
  assert.ok(candidateCodes.has('231259102'), 'existing row 231259102 remains covered by the list mapping');
  assert.equal(dataset.positions.filter((row) => row.year === 2024 && candidateCodes.has(row.code)).length, 40);
});

test('the 2025 water bureau role exposes its full mirrored detail without claiming verified eligibility', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const dataset = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const app = await readFile(new URL('src/app.js', projectRoot), 'utf8');
  const position = positions.find((row) => row.code === '221264701');
  const source = sources.find((row) => row.sourceId === 'gwyzwb-2025-example');

  assert.equal(position.recruitCount, 2);
  assert.equal(position.education, '硕士研究生及以上');
  assert.equal(position.department, '办公室');
  assert.equal(position.positionDescription, '负责文电、会务、机要、档案、文稿等工作。');
  assert.equal(position.degreeRequirement, '与最高学历相对应的学位');
  assert.deepEqual(position.majorCriteria, {
    graduate: ['0101', '0301', '0302', '0303', '0305', '0351', '0352', '0501', '0503', '0552', '1201', '1204', '1205', '1252', '1255', '1256'],
  });
  assert.deepEqual(position.requirements, {
    politicalStatus: '中共党员',
    graduationStatus: '应届毕业生',
    graduationYear: ['2025'],
  });
  assert.equal(position.professionalTest, false);
  assert.equal(position.physicalTest, undefined, 'no physical-test fact should be inferred from a negative professional-test field');
  assert.equal(position.interviewRatio, '3:1');
  assert.equal(position.eligibilityComplete, false);
  assert.equal(position.sourceLevel, 'secondary');
  assert.match(position.otherConditions, /最高学历对应的专业/);
  assert.match(position.otherConditions, /不得缴纳社会保险/);

  const matchingProfile = {
    degree: '硕士研究生',
    majorCode: '1204',
    politicalStatus: '中共党员',
    graduationStatus: '应届毕业生',
    graduationYear: '2025',
  };
  assert.equal(evaluateEligibility(position, matchingProfile).majorCheck.status, 'match');
  assert.equal(evaluateEligibility(position, matchingProfile).status, '大概率可报但有条件待核');
  assert.equal(evaluateEligibility(position, { ...matchingProfile, graduationYear: '2026' }).status, '信息不足');
  assert.equal(evaluateEligibility(position, { ...matchingProfile, politicalStatus: '共青团员' }).status, '信息不足');
  assert.ok(dataset.positions.some((row) => row.code === '221264701' && row.positionDescription === position.positionDescription));

  assert.equal(source?.level, 'secondary');
  assert.equal(source?.accessedAt, '2026-10-08');
  assert.match(source?.notes, /未与官方职位表逐代码交叉核验/);
  for (const label of ['岗位职责', '用人部门', '学位要求', '政治面貌', '专业能力测试', '面试比例', '其他条件', '岗位备注']) {
    assert.ok(app.includes(label), `the position detail dialog should display ${label}`);
  }
  for (const field of ['positionDescription', 'department', 'degreeRequirement', 'professionalTest', 'interviewRatio', 'otherConditions', 'remarks']) {
    assert.ok(app.includes(`position.${field}`), `the position detail dialog should render ${field}`);
  }
});

test('the 2026 Yanshou statistics role exposes its verified mirror details without inventing a physical test or eligibility match', async () => {
  const positions = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const dataset = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const app = await readFile(new URL('src/app.js', projectRoot), 'utf8');
  const role = positions.find((row) => row.code === '241264902');
  const source = sources.find((row) => row.sourceId === 'gwyzwb-2026-job-241264902');

  assert.equal(role.department, '农业农村和经济发展办公室（统计所）');
  assert.equal(role.positionDescription, '负责统计数据的收集、整理、分析等工作。');
  assert.equal(role.degreeRequirement, '与最高学历相对应的学位');
  assert.deepEqual(role.requirements, { politicalStatus: '不限' });
  assert.equal(role.professionalTest, false);
  assert.equal(role.physicalTest, undefined, 'a negative professional-test field does not establish a physical-test fact');
  assert.equal(role.otherConditions, '本科及研究生阶段均有学历和学位；应届高校毕业生就读最高学历期间不得与任何单位存在劳动（录用、聘用）关系，不得缴纳社会保险。');
  assert.equal(role.remarks, '基层一线，工作条件艰苦，山区需要值夜班。');
  assert.equal(role.eligibilityComplete, false);
  assert.equal(classifyPublicManagementMatch(role).status, 'manual-review', 'the broad management category must not count as explicit public-administration code coverage');
  assert.equal(role.requirements.graduationStatus, undefined, 'a condition about graduates must not be promoted to a formal graduate-only requirement');
  assert.equal(source?.level, 'secondary');
  assert.ok(dataset.positions.some((row) => row.code === '241264902' && row.remarks === role.remarks));
  assert.match(app, /const politicalStatus = position\.requirements\?\.politicalStatus \?\? position\.politicalStatus/);
  assert.match(app, /label: '政治面貌', value: politicalStatus/);
});
