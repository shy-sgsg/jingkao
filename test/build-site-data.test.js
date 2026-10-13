import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFiles, renderStandaloneRoute } from './helpers/standalone-site.js';
import { studyLogKey } from '../src/data/sync.js';
import { createPlanTask } from '../src/science/planTasks.js';
import { getAptitudeQuestions } from '../src/aptitude/questions.js';
import { getAptitudeModuleContent } from '../src/aptitude/content.js';
import { APTITUDE_MODULES } from '../src/aptitude/modules.js';
import { createAptitudeModuleSession } from '../src/aptitude/sessions.js';
import { normalizeAptitudeModuleStudies } from '../src/aptitude/persistence.js';
import { getScienceTree } from '../src/science/knowledge.js';
import { getGeneralKnowledgeTree } from '../src/general-knowledge/knowledge.js';
import { SCIENCE_QUESTION_BANK } from '../src/science/questionBank.js';
import { GENERAL_KNOWLEDGE_QUESTION_BANK } from '../src/general-knowledge/questionBank.js';

test('first-use onboarding names all four jobs the workspace supports', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { elements } = await renderStandaloneRoute(script, 'overview', {
    onboarding: { step: 0, hidden: false, completed: false },
  });
  for (let attempt = 0; attempt < 5 && !elements.get('#modal-root').innerHTML; attempt += 1) await new Promise(setImmediate);
  const onboarding = elements.get('#modal-root').innerHTML;

  assert.match(onboarding, /第一次使用？3 分钟完成初始化/);
  assert.match(onboarding, /专业方向预填为公共管理，请先改成自己的真实专业/);
  assert.match(onboarding, /管理 50 天复习计划/);
  assert.match(onboarding, /记录并诊断模考成绩/);
  assert.match(onboarding, /查询北京京考历年职位/);
  assert.match(onboarding, /根据个人条件辅助选岗/);
  assert.match(onboarding, /data-action="onboarding-later"/);
});
test('sources route exposes direct official position-file links without calling candidate rows verified', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root } = await renderStandaloneRoute(script, 'sources', {
    onboarding: { hidden: true, completed: true },
  });

  assert.match(root.innerHTML, /P020251010615991972827\.xls/);
  assert.match(root.innerHTML, /P020241112454583305784\.xls/);
  assert.match(root.innerHTML, /P020251110416491745191\.xlsx/);
  assert.match(root.innerHTML, /尚未完成原表导入和逐代码核对/);
});
test('assistant renders evidence-gated difficulty and fit breakdowns for real position rows', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root: assistant } = await renderStandaloneRoute(script, 'assistant');

  assert.match(assistant.innerHTML, /难度综合分/);
  assert.match(assistant.innerHTML, /适配综合分/);
  assert.match(assistant.innerHTML, /data-score-component="qualifiedCompetition"/);
  assert.match(assistant.innerHTML, /区级汇总不参与/);
  assert.match(assistant.innerHTML, /\d+ 个岗位有资格审查快照，未纳入本项评分/);
  assert.match(assistant.innerHTML, /非最终报名或实考数据，未纳入岗位竞争比分项/);
  assert.match(assistant.innerHTML, /查看评分依据/);
});
test('assistant and score scenarios honor Beijing district scope without borrowing other districts', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const haidianRows = dataset.positions.filter((position) => position.districtId === 'haidian');
  const haidian2024Rows = haidianRows.filter((position) => Number(position.year) === 2024);
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const assistant = await renderStandaloneRoute(script, 'assistant');

  await assistant.listeners.get('change')({ target: { id: 'decision-district', value: 'haidian' } });
  assert.match(assistant.root.innerHTML, new RegExp(`${haidianRows.length}<\/strong><span>当前范围职位样例`));
  assert.equal((assistant.root.innerHTML.match(/class="panel assistant-job /g) || []).length, haidianRows.length);
  assert.match(assistant.root.innerHTML, /海淀区 · 2025/);

  await assistant.listeners.get('change')({ target: { id: 'decision-year', value: '2025' } });
  assert.match(assistant.root.innerHTML, /153<\/strong><span>当前范围职位样例/);
  assert.equal((assistant.root.innerHTML.match(/class="panel assistant-job /g) || []).length, 153);

  await assistant.listeners.get('change')({ target: { id: 'decision-year', value: '2024' } });
  assert.match(assistant.root.innerHTML, new RegExp(`${haidian2024Rows.length}<\/strong><span>当前范围职位样例`));
  assert.equal((assistant.root.innerHTML.match(/class="panel assistant-job /g) || []).length, haidian2024Rows.length);

  const scenarios = await renderStandaloneRoute(script, 'scenarios');
  await scenarios.listeners.get('change')({ target: { id: 'decision-district', value: 'haidian' } });
  assert.match(scenarios.root.innerHTML, /海淀区 · 全部单位类型/);
  assert.match(scenarios.root.innerHTML, /29 条 · 29 条代码已核对/);
  assert.match(scenarios.root.innerHTML, /北京市海淀区/);
  assert.doesNotMatch(scenarios.root.innerHTML, /北京市昌平区/);
});
test('position comparison distinguishes process snapshots from final registration data', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root: comparison } = await renderStandaloneRoute(script, 'compare', {
    compared: ['821261102', '821263001'],
    onboarding: { hidden: true, completed: true },
  });

  assert.match(comparison.innerHTML, /岗位级报名 \/ 资格审查记录/);
  assert.match(comparison.innerHTML, /区县/);
  assert.match(comparison.innerHTML, /2025-11-21 09:00 · 615 人资格审查通过（招录 2 人，时点参考竞争比 1:307\.5；非最终报名或实考）/);
  assert.match(comparison.innerHTML, /2025-11-19 18:00 · 150 人资格审查通过（招录 1 人，时点参考竞争比 1:150；非最终报名或实考）/);
  assert.match(comparison.innerHTML, /不能视作最终报名、过审或实考人数/);
});
test('position comparison shows a linked qualification snapshot ratio and an exact-code cutoff when available', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root: comparison } = await renderStandaloneRoute(script, 'compare', {
    compared: ['2025:220527701', '2026:221262201', '2026:121049302'],
    onboarding: { hidden: true, completed: true },
  });

  assert.match(comparison.innerHTML, /2024-11-22 09:00/);
  assert.match(comparison.innerHTML, /256 人资格审查通过/);
  assert.match(comparison.innerHTML, /时点参考竞争比 1:256/);
  assert.match(comparison.innerHTML, /非最终报名或实考/);
  assert.match(comparison.innerHTML, /同年代码匹配的最低进面线/);
  assert.match(comparison.innerHTML, /136\.75 分/);
  assert.match(comparison.innerHTML, /136\.25 分/);
});
test('position comparison shows reported applicants separately from qualification-passed applicants', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root: comparison } = await renderStandaloneRoute(script, 'compare', {
    compared: ['2026:820526204'],
    onboarding: { hidden: true, completed: true },
  });

  assert.match(comparison.innerHTML, /岗位级报考人数 \/ 招录竞争比/);
  assert.match(comparison.innerHTML, /统计时点未注明 · 来源所列“报考人数” 15 人 \/ 招录 2 人，报考 \/ 招录参考比 1:7\.5/);
  assert.match(comparison.innerHTML, /资格审查通过人数 \/ 计划招录的资格审查比是两种不同口径/);
  assert.match(comparison.innerHTML, /fenbi\.com\/page\/positions\/1\/438923\?page=3/);
});
test('score slider updates its visible track progress and score result together', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root, elements, listeners } = await renderStandaloneRoute(script, 'scenarios');
  assert.match(root.innerHTML, /id="scenario-slider"[^>]*style="--score-progress:60%"/);

  for (const selector of ['.scenario-score-display', '.scenario-result-number', '.scenario-result strong', '#scenario-coverage', '.score-marker']) {
    elements.set(selector, {
      innerHTML: '', textContent: '', style: {},
      classList: { add() {}, remove() {}, toggle() {} },
    });
  }
  const properties = {};
  const slider = {
    id: 'scenario-slider', value: '144', min: '120', max: '150',
    style: { setProperty(name, value) { properties[name] = value; } },
  };
  listeners.get('input')({ target: slider });

  assert.equal(properties['--score-progress'], '80%');
  assert.equal(elements.get('.scenario-result-number').textContent, '144');
});
test('score scenario exposes every requested segment and labels the narrower matched-code samples', async () => {
  await import('../scripts/build.mjs');
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  const { root, listeners } = await renderStandaloneRoute(script, 'scenarios');

  assert.match(root.innerHTML, /<select id="scenario-scope"/);
  for (const [segment, sampleCount] of [['全部区县', 383], ['区直', 256], ['街道', 66], ['镇', 37], ['普通职位', 39], ['行政执法', 20], ['公共管理相关', 13]]) {
    assert.ok(root.innerHTML.includes(`${segment} · n=${sampleCount}`), `score scope selector should show ${segment}'s ${sampleCount} source-backed rows`);
  }
  assert.match(root.innerHTML, /岗位类别仅纳入代码、单位与岗位名均唯一匹配的分数记录/);

  await listeners.get('change')({ target: { id: 'scenario-scope', value: 'enforcement' } });
  assert.match(root.innerHTML, /行政执法 · n=20/);
  assert.match(root.innerHTML, /20 条 · 20 条代码已核对/);
  assert.match(root.innerHTML, /行政执法岗2/);
  assert.match(root.innerHTML, /综合行政执法岗/);
  assert.doesNotMatch(root.innerHTML, /综合统计岗/);
});
test('Pages release artifact excludes the workbook, local backups, and credential files', async () => {
  await import('../scripts/build.mjs');
  const distPath = fileURLToPath(new URL('../dist/', import.meta.url));
  const files = await listFiles(distPath);
  const normalized = files.map((file) => file.replaceAll('\\', '/'));
  const textFiles = files.filter((file) => file.replaceAll('\\', '/') !== 'public/national/positions-2027.json');
  const builtText = (await Promise.all(textFiles.map((file) => readFile(join(distPath, file), 'utf8').catch(() => '')))).join('\n');

  assert.ok(normalized.includes('index.html'));
  assert.ok(normalized.includes('public/data.json'));
  assert.ok(normalized.includes('public/national/positions-2027.json'));
  assert.ok(normalized.includes('public/national/metadata-2027.json'));
  assert.ok(normalized.every((file) => !/(?:^|\/)(?:raw|backups?)(?:\/|$)|\.(?:xlsx?|env|pem|key)$/iu.test(file)));
  assert.doesNotMatch(builtText, /PRIVATE NEW ACCOUNT|MIGRATED PRIVATE NOTE|correct horse battery staple for the test/);

  const workflow = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');
  const ignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test -- --test-concurrency=1/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4[\s\S]*?path: dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(ignore, /^\/dist\/$/m);
  assert.match(ignore, /^\/data\/raw\/study_plan\.xlsx$/m);
  assert.match(ignore, /^\.env\*$/m);
});
