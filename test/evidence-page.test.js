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

test('position search explains untimed reported-applicant references generically', async () => {
  const positions = await renderSourceApp('#/positions');
  assert.match(positions.root.innerHTML, /部分第三方列表未注明统计时点或字段定义/);
  assert.doesNotMatch(positions.root.innerHTML, /朝阳粉笔样本未注明统计时点/);
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
  assert.match(root.innerHTML, /资格审查竞争比/);
  assert.match(root.innerHTML, /2025-11-19 18:00[\s\S]*?232501603[\s\S]*?714 人[\s\S]*?55 人[\s\S]*?1:12\.98[\s\S]*?eoffcn\.com\/kszx\/detail\/1903982\.html/);
  assert.match(root.innerHTML, /2025-11-20 18:00[\s\S]*?41477 人[\s\S]*?3694 人[\s\S]*?1:11\.23[\s\S]*?sohu\.com\/a\/956654507_121124036/);
  assert.match(root.innerHTML, /资格审查通过人数.*不等同最终报名人数、缴费人数或实考人数/s);
  assert.match(root.innerHTML, /岗位级竞争观察[\s\S]*?资格审查 221 条 · 第三方报考人数 746 条/);
  assert.match(root.innerHTML, /岗位级第三方报考人数/);
  const applicationSection = root.innerHTML.match(/<section class="evidence-section application-snapshot-section">([\s\S]*?)<\/section>/)?.[1] || '';
  assert.match(applicationSection, /242503201[\s\S]*?324 人[\s\S]*?17 人[\s\S]*?1:19\.06[\s\S]*?fenbi\.com\/page\/positions\/1\/438923\?page=9/);
  assert.match(applicationSection, /部分地区的第三方职位列表/);
  assert.match(root.innerHTML, /未注明[\s\S]*?820526204[\s\S]*?15 人[\s\S]*?2 人[\s\S]*?1:7\.5[\s\S]*?fenbi\.com\/page\/positions\/1\/438923\?page=3/);
});

test('the evidence center separates citywide weighted competition snapshots from job-level ratios', async () => {
  const { root } = await renderSourceApp('#/evidence');

  assert.match(root.innerHTML, /全市资格审查加权快照/);
  assert.match(root.innerHTML, /2025-11-20 09:00[\s\S]*?23194 人[\s\S]*?3694 人[\s\S]*?1:6\.28/);
  assert.match(root.innerHTML, /2025-11-21 09:00[\s\S]*?48026 人[\s\S]*?3694 人[\s\S]*?1:13/);
  assert.match(root.innerHTML, /按计划数加权的总比，不是各岗位竞争比的简单平均/);
  assert.match(root.innerHTML, /CITYWIDE WEIGHTED SNAPSHOTS · 2025–2026/);
  assert.match(root.innerHTML, /sohu\.com\/a\/957051740_121124036/);
});

test('the evidence center lists the complete 2025 district qualified snapshot with its own ratio grain', async () => {
  const { root } = await renderSourceApp('#/evidence');
  const table = root.innerHTML.match(/<table[^>]*class="data-table district-competition-table"[\s\S]*?<\/table>/)?.[0] || '';
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] || '';
  const districts = ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'];

  assert.match(root.innerHTML, /2025 各区资格审查竞争快照/);
  assert.equal((body.match(/<tr>/g) || []).length, 16);
  for (const district of districts) assert.match(table, new RegExp(district));
  assert.match(table, /通州区[\s\S]*?2728 人[\s\S]*?212 人[\s\S]*?1:12\.87/);
  assert.match(table, /石景山区[\s\S]*?1000 人[\s\S]*?125 人[\s\S]*?1:8/);
  assert.match(root.innerHTML, /区级快照仅用于同一时点区级比较，不分摊到岗位/);
  assert.match(root.innerHTML, /岗位级资格审查快照/);
  assert.match(root.innerHTML, /资格审查通过人数与来源所列报考人数分别展示/);
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
  assert.match(root.innerHTML, /365 条具名分数记录[\s\S]*?部分样本/);
  assert.match(root.innerHTML, /年度官方职位分母未知/);
  assert.match(root.innerHTML, /条数相同不代表职位代码集合一致/);
  assert.doesNotMatch(root.innerHTML, /官方覆盖率[：:]\s*100%/);
});
