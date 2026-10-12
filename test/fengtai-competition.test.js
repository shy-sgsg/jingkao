import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

test('Fengtai 2026 reported applicant counts link to exact positions without implying official qualification counts', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const pages = dataset.sources.filter((source) => /^fengtai-2026-fenbi-page-(?:[1-5]|10)$/.test(source.sourceId));
  const snapshots = pages.flatMap((source) => (source.positionSnapshots || []).map((snapshot) => ({
    ...snapshot,
    sourceId: source.sourceId,
  })));
  const expected = [
    ['fengtai-2026-fenbi-page-1', '526012301', 45, 12],
    ['fengtai-2026-fenbi-page-1', '526012302', 1, 1],
    ['fengtai-2026-fenbi-page-1', '625014401', 18, 6],
    ['fengtai-2026-fenbi-page-1', '625014402', 15, 4],
    ['fengtai-2026-fenbi-page-1', '625014403', 1, 2],
    ['fengtai-2026-fenbi-page-1', '120738901', 17, 1],
    ['fengtai-2026-fenbi-page-2', '820739401', 13, 1],
    ['fengtai-2026-fenbi-page-2', '820739402', 26, 2],
    ['fengtai-2026-fenbi-page-2', '220739403', 19, 2],
    ['fengtai-2026-fenbi-page-2', '820739501', 15, 2],
    ['fengtai-2026-fenbi-page-2', '820739502', 10, 2],
    ['fengtai-2026-fenbi-page-2', '820739503', 6, 1],
    ['fengtai-2026-fenbi-page-2', '820739504', 3, 1],
    ['fengtai-2026-fenbi-page-3', '820739505', 44, 2],
    ['fengtai-2026-fenbi-page-4', '220740302', 37, 4],
    ['fengtai-2026-fenbi-page-4', '220740303', 53, 4],
    ['fengtai-2026-fenbi-page-4', '220740304', 21, 2],
    ['fengtai-2026-fenbi-page-4', '220740305', 12, 2],
    ['fengtai-2026-fenbi-page-4', '220740306', 51, 2],
    ['fengtai-2026-fenbi-page-4', '220740307', 14, 2],
    ['fengtai-2026-fenbi-page-4', '230740308', 1, 1],
    ['fengtai-2026-fenbi-page-4', '230740309', 20, 2],
    ['fengtai-2026-fenbi-page-4', '230740310', 21, 2],
    ['fengtai-2026-fenbi-page-4', '230740312', 44, 1],
    ['fengtai-2026-fenbi-page-5', '820740401', 23, 2],
    ['fengtai-2026-fenbi-page-5', '220740501', 23, 1],
    ['fengtai-2026-fenbi-page-5', '820740601', 111, 2],
    ['fengtai-2026-fenbi-page-5', '820740801', 26, 2],
    ['fengtai-2026-fenbi-page-5', '820740901', 42, 2],
    ['fengtai-2026-fenbi-page-5', '820741001', 36, 2],
    ['fengtai-2026-fenbi-page-5', '820741002', 22, 2],
    ['fengtai-2026-fenbi-page-5', '820741101', 13, 1],
    ['fengtai-2026-fenbi-page-5', '220741301', 24, 1],
    ['fengtai-2026-fenbi-page-5', '230741401', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230742504', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230742801', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230743202', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230741903', 5, 1],
    ['fengtai-2026-fenbi-page-10', '230743201', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230740313', 25, 1],
  ];

  assert.equal(pages.length, 6);
  assert.equal(snapshots.length, 40);
  assert.equal(new Set(snapshots.map((row) => row.positionCode)).size, expected.length);

  for (const [sourceId, code, applicants, recruits] of expected) {
    const snapshot = snapshots.find((row) => row.sourceId === sourceId && row.positionCode === code);
    assert.equal(snapshot?.applicantsRegistered, applicants, `${code} reported applicant count`);
    assert.equal(snapshot?.recruitCount, recruits, `${code} planned recruits`);
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `position ${code} exists`);
    assert.equal(position.districtId, 'fengtai', `${code} district`);
    assert.equal(position.recruitCount, recruits, `${code} position recruit count`);
    const observation = dataset.observations.find((item) => item.year === 2026
      && item.positionCode === code && item.sourceId === sourceId);
    assert.equal(observation?.observationType, 'registration_snapshot', `${code} remains a third-party reported-count reference`);
    assert.equal(observation?.applicantsRegistered, applicants, `${code} retains the source field`);
    assert.equal(observation?.applicantsQualified, null, `${code} is not relabeled as an official qualification count`);
    assert.equal(observation?.observedAt, null, `${code} has no reported snapshot timestamp`);
    const evidence = getPositionCompetitionEvidence(position, {
      observations: dataset.observations,
      scoreRows: dataset.scoreRows,
    });
    assert.equal(evidence.registeredCompetitionRatio, applicants / recruits, `${code} reported-count ratio`);
  }
});

test('Fengtai Fenbi page 8 links ten reported applicant counts to exact position entries while preserving unknown cutoffs', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const source = dataset.sources.find((item) => item.sourceId === 'fengtai-2026-fenbi-page-8');
  assert.ok(source, 'page 8 source is registered');
  assert.equal(source.url, 'https://www.fenbi.com/page/positions/1/438923?page=8&region=166');
  assert.equal(source.positionSnapshots.length, 10);

  const expected = [
    ['230742701', '北京市丰台区方庄街道>综合办公室', '综合管理岗', 2, 16, '研究生：经济学（02）、法学（03）、工学（08）、管理学（12）', '硕士研究生及以上'],
    ['230742702', '北京市丰台区方庄街道>城市管理办公室', '综合管理岗', 2, 26, '研究生：经济学（02）、工学（08）、管理学（12）', '硕士研究生及以上'],
    ['230742703', '北京市丰台区方庄街道>综合行政执法队', '行政执法岗', 2, 69, '不限', '本科及以上'],
    ['230742901', '北京市丰台区南苑街道>城乡管理办公室', '城乡管理岗', 2, 20, '研究生：环境科学与工程（0830）、城乡规划学（0833）、城乡规划（0853）、农业资源与环境（0903）', '硕士研究生及以上'],
    ['230742902', '北京市丰台区南苑街道>综合行政执法队', '综合执法岗', 2, 7, '本科：经济学类（0201）、法学类（0301） 研究生：应用经济学（0202）、法学（0301）', '本科及以上'],
    ['230743001', '北京市丰台区和义街道>综合行政执法队', '综合执法岗', 2, 10, '本科：公安学类（0306）、机械类（0802）、电气类（0806）、电子信息类（0807）、自动化类（0808）、计算机类（0809）、土木类（0810）、建筑类（0828）、自然保护与环境生态类（0902） 研究生：公安学（0306）、机械工程（0802）、电气工程（0808）、电子科学与技术（0809）、计算机科学与技术（0812）、建筑学（0813）、土木工程（0814）、城乡规划学（0833）、城乡规划（0853）、土木水利（0859）、管理科学与工程（1201）', '本科及以上'],
    ['230743101', '北京市丰台区东高地街道>综合行政执法队', '行政执法岗', 2, 64, '本科：法学类（0301）、机械类（0802）、电子信息类（0807）、建筑类（0828）、公共管理类（1204） 研究生：法学（0301）、机械工程（0802）、建筑学（0813）、电子信息（0854）、公共管理学（1204）', '本科及以上'],
    ['230743102', '北京市丰台区东高地街道>城市管理办公室', '综合管理岗', 2, 10, '研究生：城乡规划学（0833）、城乡规划（0853）', '硕士研究生及以上'],
    ['230743301', '北京市丰台区云岗街道>综合行政执法队', '综合执法岗', 2, 13, '本科：法学类（0301）、电子信息类（0807）、计算机类（0809）、环境科学与工程类（0825）、建筑类（0828）、管理科学与工程类（1201）、公共管理类（1204） 研究生：法学（0301）、法律（0351）、计算机科学与技术（0812）、建筑学（0813）、土木工程（0814）、环境科学与工程（0830）、城乡规划学（0833）、建筑（0851）、城乡规划（0853）、管理科学与工程（1201）、公共管理学（1204）、公共管理（1252）', '本科及以上'],
    ['230743302', '北京市丰台区云岗街道>内设科室', '综合管理岗', 2, 41, '研究生：法学（0301）、社会学（0303）、法律（0351）、社会工作（0352）、文学（05）、农业资源与环境（0903）、食品与营养（0955）、公共卫生与预防医学（1004）、公共卫生（1053）、管理科学与工程（1201）、公共管理学（1204）、公共管理（1252）', '硕士研究生及以上'],
  ];

  for (const [code, unit, title, recruits, applicants, majorText, education] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `position ${code} exists`);
    assert.equal(position.unit, unit, `${code} unit`);
    assert.equal(position.title, title, `${code} title`);
    assert.equal(position.recruitCount, recruits, `${code} planned recruits`);
    assert.equal(position.education, education, `${code} education`);
    assert.equal(position.majorText, majorText, `${code} major text`);
    assert.equal(position.districtId, 'fengtai', `${code} district`);
    assert.ok(position.sources.includes(source.sourceId), `${code} links page 8 source`);

    const observation = dataset.observations.find((item) => item.year === 2026
      && item.positionCode === code && item.sourceId === source.sourceId);
    assert.equal(observation?.applicantsRegistered, applicants, `${code} reported applicant count`);
    assert.equal(observation?.applicantsQualified, null, `${code} is not misrepresented as qualified count`);
    assert.equal(observation?.observedAt, null, `${code} snapshot time is not invented`);
    assert.equal(observation?.recruitCount, recruits, `${code} observed recruitment count`);

    const evidence = getPositionCompetitionEvidence(position, {
      observations: dataset.observations,
      scoreRows: dataset.scoreRows,
    });
    assert.equal(evidence.registeredCompetitionRatio, applicants / recruits, `${code} reported applicant ratio`);
    assert.equal(evidence.cutoffScore, null, `${code} interview cutoff remains unknown without linked score evidence`);
  }
});

test('Fengtai Shiliuzhuang position combines its reported registration ratio and linked interview cutoff', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '230742504');
  const evidence = getPositionCompetitionEvidence(position, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
  });

  assert.ok(position);
  assert.equal(evidence.registeredCompetitionRatio, 2);
  assert.equal(evidence.cutoffScore, 104.5);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-street-cutoff-sample']);
});

test('Fengtai police jobs on citywide Fenbi pages link applicant, qualified, and interview-cutoff evidence separately', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    ['fengtai-2026-fenbi-police-page-6', '232502201', 300, 22],
    ['fengtai-2026-fenbi-police-page-6', '232502202', 24, 3],
    ['fengtai-2026-fenbi-police-page-7', '232502203', 30, 10],
    ['fengtai-2026-fenbi-police-page-7', '232502204', 23, 5],
  ];

  for (const [sourceId, code, applicants, recruits] of expected) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} source exists`);
    assert.match(source.url, new RegExp(`page=${sourceId.endsWith('6') ? 6 : 7}`));
    assert.equal(source.districtId, 'fengtai');
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `position ${code} exists`);
    assert.equal(position.districtId, 'fengtai');
    assert.equal(position.recruitCount, recruits);
    const observation = dataset.observations.find((item) => item.year === 2026
      && item.positionCode === code && item.sourceId === sourceId);
    assert.equal(observation?.observationType, 'registration_snapshot');
    assert.equal(observation?.applicantsRegistered, applicants);
    assert.equal(observation?.applicantsQualified, null);
    assert.equal(observation?.observedAt, null);

    const evidence = getPositionCompetitionEvidence(position, {
      observations: dataset.observations,
      scoreRows: dataset.scoreRows,
    });
    assert.equal(evidence.registeredCompetitionRatio, applicants / recruits);
    assert.ok(evidence.registrationSourceIds.includes(sourceId));
  }

  const policePosition = dataset.positions.find((item) => item.year === 2026 && item.code === '232502201');
  const policeEvidence = getPositionCompetitionEvidence(policePosition, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
  });
  assert.equal(policeEvidence.qualifiedCompetitionRatio, 199 / 22);
  assert.equal(policeEvidence.registeredCompetitionRatio, 300 / 22);
  assert.equal(policeEvidence.cutoffScore, 52.15);
  assert.ok(policeEvidence.cutoffSourceIds.includes('cgzj-2026-fengtai-cutoff-sample'));
});
