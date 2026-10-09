import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installAccountBrowserAPIs, memoryLocalStorage, seedUnlockedTestAccount, unlockTestAccount } from './helpers/accountTestHarness.js';

async function renderSourceApp(hash = '#/evidence') {
  const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const listeners = {};
  const root = { innerHTML: '' };
  const documentElement = { dataset: {}, classList: { toggle() {} } };
  globalThis.document = {
    title: '',
    documentElement,
    querySelector(selector) {
      return selector === '#root' ? root : { innerHTML: '', textContent: '', classList: { add() {}, remove() {} } };
    },
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
  globalThis.location = { hash };
  globalThis.localStorage = memoryLocalStorage();
  installAccountBrowserAPIs();
  const accountId = await seedUnlockedTestAccount(globalThis.localStorage);
  globalThis.fetch = async () => ({ ok: true, json: async () => dataset });
  await import(`../src/app.js?evidence-test=${Date.now()}`);
  for (let attempt = 0; attempt < 5 && !root.innerHTML; attempt += 1) await new Promise(setImmediate);
  await unlockTestAccount(listeners, accountId);
  return { root, listeners, documentElement };
}

test('the site renders source-linked annual findings and filters the year cards', async () => {
  const { root, listeners, documentElement } = await renderSourceApp();

  assert.equal(documentElement.dataset.density, 'comfortable');
  assert.match(root.innerHTML, /先看清证据/);
  assert.equal((root.innerHTML.match(/class="panel evidence-year-card/g) || []).length, 3);
  assert.match(root.innerHTML, /93–97 岗/);
  assert.match(root.innerHTML, /142–199 人/);
  assert.match(root.innerHTML, /95 岗/);
  assert.match(root.innerHTML, /class="evidence-source-notes"/);
  assert.match(root.innerHTML, /华图.*页面列出95条昌平职位\/197人/s);
  assert.match(root.innerHTML, /去除后恰为93岗\/142人/);
  assert.match(root.innerHTML, /二手年度汇总，与其他镜像冲突/);

  const selectedYearButton = {
    dataset: { action: 'filter-evidence-year', year: '2025' },
  };
  await listeners.click({
    target: { closest: (selector) => selector === '[data-action]' ? selectedYearButton : null },
  });

  assert.equal((root.innerHTML.match(/class="panel evidence-year-card/g) || []).length, 1);
  assert.match(root.innerHTML, /90–91 岗/);
  assert.match(root.innerHTML, /176–177 人/);
  assert.match(root.innerHTML, /aria-pressed="true">2025<\/button>/);
});

test('the competition matrix directs annual reconciliation to the evidence center', async () => {
  const { root } = await renderSourceApp('#/matrix');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(root.innerHTML, /<h3>垂直\/驻区<\/h3>/);
  assert.match(styles, /\.matrix-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(root.innerHTML, /class="matrix-type-section"[\s\S]*?href="#\/evidence"[^>]*>查看年度汇总与来源差异/);
  assert.match(root.innerHTML, /全市 16 区 × 3 年职位样例覆盖/);
  assert.doesNotMatch(root.innerHTML, /93–97 岗/);
});

test('the rendered position library exposes citywide counts and the vertical-unit filter', async () => {
  const { root } = await renderSourceApp('#/positions');
  const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const years = [...root.innerHTML.matchAll(/<span class="year-pill">(\d{4})<\/span>/g)].map((match) => Number(match[1]));

  assert.match(root.innerHTML, new RegExp(`当前收录 ${dataset.positions.length} 条逐岗候选`));
  assert.match(root.innerHTML, /北京市 16 区/);
  assert.match(root.innerHTML, /海淀区/);
  assert.match(root.innerHTML, /延庆区/);
  assert.match(root.innerHTML, /option value="垂直\/驻区"/);
  assert.match(root.innerHTML, /id="job-search"/);
  assert.match(root.innerHTML, new RegExp(`显示 1–25 条，共 ${dataset.positions.length} 条`));
  assert.ok(dataset.positions.some((position) => position.code === '221264501'), 'the searched role remains in the year-filterable dataset');
  assert.ok(years.every((year, index) => index === 0 || years[index - 1] >= year), 'position rows should be grouped newest year first');
});

test('the evidence page displays the remaining secondary 2026 unit gaps without overstating resolved units', async () => {
  const { root } = await renderSourceApp('#/evidence');

  assert.match(root.innerHTML, /职位明细缺口定位/);
  assert.match(root.innerHTML, /北京市昌平区天通苑北街道/);
  assert.match(root.innerHTML, /0 \/ 1 岗/);
  assert.match(root.innerHTML, /北京市昌平区延寿镇/);
  assert.match(root.innerHTML, /1 \/ 2 岗/);
  const gapTable = root.innerHTML.match(/<table[^>]*class="data-table unit-gap-table"[\s\S]*?<\/table>/)?.[0] || '';
  assert.doesNotMatch(gapTable, /人力资源和社会保障局|阳坊镇|北七家镇/);
  assert.match(root.innerHTML, /二手线索/);
  assert.match(root.innerHTML, /不补造职位记录，也不视为官方核验/);
  assert.match(root.innerHTML, /京考职位网：2026昌平职位汇总/);
  assert.match(root.innerHTML, /href="https:\/\/bj\.gwyzwb\.com\/changping\/"/);
  assert.match(root.innerHTML, /多源数值一致/);
});

test('the evidence center lists dated position-level qualification snapshots with their third-party sources', async () => {
  const { root } = await renderSourceApp('#/evidence');

  assert.match(root.innerHTML, /岗位级资格审查快照/);
  assert.match(root.innerHTML, /821261102/);
  assert.match(root.innerHTML, /821263001/);
  assert.match(root.innerHTML, /2025-11-19 18:00/);
  assert.match(root.innerHTML, /424 人/);
  assert.match(root.innerHTML, /150 人/);
  assert.match(root.innerHTML, /eoffcn\.com\/kszx\/detail\/1903982\.html/);
  assert.match(root.innerHTML, /资格审查通过人数.*不等同最终报名人数、缴费人数或实考人数/s);
  assert.match(root.innerHTML, /岗位级资格审查快照[\s\S]*?覆盖 2 个岗位/);
});

test('the overview keeps personal study summaries and shows citywide position coverage and sources', async () => {
  const { root } = await renderSourceApp('#/overview');
  const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const populatedDistricts = new Set(dataset.positions.map((position) => position.districtId).filter(Boolean)).size;
  const populatedCells = dataset.districts.reduce((sum, district) => sum + [2024, 2025, 2026].filter((year) => (
    dataset.positions.some((position) => position.districtId === district.id && Number(position.year) === year)
  )).length, 0);
  const linkedSources = new Set(dataset.positions.flatMap((position) => position.sources || [])).size;

  assert.match(root.innerHTML, /离目标分还有多远/);
  assert.match(root.innerHTML, /安排今天的学习/);
  assert.equal((root.innerHTML.match(/class="snapshot-row/g) || []).length, 0);
  assert.match(root.innerHTML, /北京全市职位数据概览/);
  assert.match(root.innerHTML, new RegExp(`${dataset.positions.length}<small>条岗位样例</small>`));
  assert.match(root.innerHTML, new RegExp(`${populatedDistricts} / 16 区有样例`));
  assert.match(root.innerHTML, new RegExp(`${populatedCells} / 48 个区县年度格`));
  assert.match(root.innerHTML, new RegExp(`${linkedSources} 个已关联来源`));
  assert.match(root.innerHTML, /href="#\/positions"[^>]*>职位库/);
  assert.match(root.innerHTML, /href="#\/matrix"[^>]*>竞争矩阵/);
  assert.match(root.innerHTML, /href="#\/sources"[^>]*>来源与口径/);
  assert.doesNotMatch(root.innerHTML, /昌平竞争观察|报道区平均竞争比|18\.24:1/);
});

test('the source page keeps the unmatched Fenbi joint-exam list out of Jingkao totals', async () => {
  const { root } = await renderSourceApp('#/sources');

  assert.match(root.innerHTML, /北京市2026年度考试录用公务员各职位报考人数查询/);
  assert.match(root.innerHTML, /粉笔.*2026.*联考\/统考/);
  assert.match(root.innerHTML, /135岗、158人/);
  assert.match(root.innerHTML, /16位.*9位/);
  assert.match(root.innerHTML, /暂不纳入京考职位或年度汇总/);
  assert.match(root.innerHTML, /成公教育：北京京考昌平进面分数页（年度待核）/);
  assert.match(root.innerHTML, /标题标为2025.*2026年北京公务员考试即将开始/);
});

test('the source page exposes evidence-based coverage without presenting mirror parity as official completeness', async () => {
  const { root } = await renderSourceApp('#/sources');

  assert.match(root.innerHTML, /当前研究完成度/);
  assert.match(root.innerHTML, /年度职位样例与第三方汇总对照/);
  assert.match(root.innerHTML, /2024[\s\S]*?95 \/ 95 条/);
  assert.match(root.innerHTML, /2025[\s\S]*?91 \/ 91 条/);
  assert.match(root.innerHTML, /2026[\s\S]*?86 \/ 88 条/);
  assert.match(root.innerHTML, /31 条具名分数记录[\s\S]*?部分样本/);
  assert.match(root.innerHTML, /年度官方职位分母未知/);
  assert.match(root.innerHTML, /条数相同不代表职位代码集合一致/);
  assert.doesNotMatch(root.innerHTML, /官方覆盖率[：:]\s*100%/);
});
