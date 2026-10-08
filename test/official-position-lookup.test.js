import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('2026 position details expose the official code lookup without promoting mirror evidence', async () => {
  const registry = JSON.parse(await readFile(new URL('../data/source_registry.json', import.meta.url), 'utf8'));
  const publicData = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const lookup = registry.find((source) => source.sourceId === 'beijing-2026-position-lookup');
  const publishedLookup = publicData.sources.find((source) => source.sourceId === 'beijing-2026-position-lookup');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.ok(lookup, 'the official lookup page should be traceable in the source registry');
  assert.equal(lookup.level, 'official');
  assert.equal(lookup.evidenceType, 'official_position_lookup');
  assert.equal(lookup.url, 'https://fuwu.rsj.beijing.gov.cn/gwyquery/publicQueryH5/gzwbkrssscx');
  assert.equal(publishedLookup.level, 'official', 'the rebuilt website data should include the new verification entry');
  assert.match(app, /position\.year === 2026[\s\S]*?beijing-2026-position-lookup/s);
  assert.match(app, /官方复核工具[\s\S]*?不会自动将本条职位标记为官方核验/s);
  assert.match(app, /official-position-lookup/);
});
