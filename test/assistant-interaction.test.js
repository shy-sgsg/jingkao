import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the job assistant exposes four evidence-based status filters with counts', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  for (const status of ['明确可报', '大概率可报但有条件待核', '信息不足', '明确不可报']) {
    assert.ok(app.includes(status), `assistant should display ${status}`);
  }
  assert.match(app, /data-action="filter-assistant"[\s\S]*?aria-pressed=/);
  assert.match(app, /results\.filter\(\(\{ eligibility \}\) => assistantFilter === 'all' \|\| eligibility\.status === assistantFilter\)/);
  assert.match(app, /学历条件核验/);
  assert.match(app, /educationEligibilityText\(position, storage\.profile, eligibility\)/);
  assert.match(app, /action === 'filter-assistant'/);
  assert.match(styles, /\.assistant-filter[\s\S]*?\.active\s*\{/);
  assert.match(styles, /\.assistant-job\.filter-enter\s*\{[^}]*animation:\s*filter-result-enter/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?html:not\(\[data-motion="immersive"\]\) \.assistant-job\.filter-enter\s*\{[^}]*animation:\s*none/s);
});
