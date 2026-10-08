import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('2027 guidance distinguishes the published selection program from the regular examination', async () => {
  const sources = JSON.parse(await readFile(new URL('../data/source_registry.json', import.meta.url), 'utf8'));
  const publishedData = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const selection = sources.find((source) => source.sourceId === 'beijing-2027-selection');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.ok(selection, 'the 2027 selection notice should have a registered source');
  assert.equal(selection.level, 'official');
  assert.equal(selection.year, 2027);
  assert.match(selection.url, /beijing\.gov\.cn/);
  assert.match(selection.notes, /网上报名.*2026年9月20日9:00至2026年9月23日18:00/);
  assert.match(selection.notes, /定向选调和优培计划Ⅰ类统一笔试计划于2026年10月17日9:00至11:30/);
  assert.match(selection.notes, /成绩于2026年10月28日后查询/);
  assert.ok(publishedData.sources.some((source) => source.sourceId === 'beijing-2027-selection'));
  assert.match(app, /2027年度定向选调和“优培计划”已发布/);
  assert.match(app, /网上报名已于2026年9月23日18:00截止/);
  assert.match(app, /定向选调和优培计划Ⅰ类统一笔试计划于2026年10月17日9:00至11:30/);
  assert.match(app, /成绩于2026年10月28日后查询/);
  assert.match(app, /sourceLink\('beijing-2027-selection'/);
  assert.match(app, /examStatusAsOf = sourceFor\('beijing-index'\)\?\.accessedAt/);
  assert.match(app, /普通京考职位表截至 \$\{escapeHtml\(examStatusAsOf\)\}/);
  assert.match(app, /普通京考职位表截至[\s\S]*?尚未在官方目录检出/);
});
