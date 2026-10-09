import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('display density defaults to comfortable, persists locally, and is exposed accessibly', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(app, /document\.documentElement\.dataset\.density = storage\.settings\.density/, 'the app should restore saved density from the unlocked encrypted profile');
  assert.match(app, /function activateAccount\([\s\S]*?applyDisplaySettings\(\)/, 'saved density should be applied after the fixed access gate unlocks the profile');
  assert.match(app, /role="group" aria-label="页面密度"/, 'the two modes should be announced as a labeled control group');
  assert.match(app, /const options = \[\['comfortable', '舒适'\], \['compact', '紧凑'\]\]/, 'comfortable and compact modes should both be selectable');
  assert.match(app, /data-action="set-density" data-density="\$\{value\}"/, 'the density options should be wired to the UI action');
  assert.match(app, /document\.querySelector\(`\[data-action="set-density"\][\s\S]*?\.focus\(\{ preventScroll: true \}\)/, 'keyboard focus should remain on the active option after changing density');
  assert.match(html, /data-density="comfortable"/, 'new sessions should start in comfortable mode');
  assert.match(styles, /html\[data-density="compact"\]/, 'compact mode should have its own layout rules');

  const { readDisplayDensity, writeDisplayDensity } = await import('../src/data/displayDensity.js');
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(readDisplayDensity(() => storage), 'comfortable');
  assert.equal(writeDisplayDensity('compact', () => storage), 'compact');
  assert.equal(readDisplayDensity(() => storage), 'compact');
  assert.equal(writeDisplayDensity('unsupported', () => storage), 'comfortable');
  assert.equal(readDisplayDensity(() => storage), 'comfortable');
  assert.equal(readDisplayDensity(() => { throw new Error('storage unavailable'); }), 'comfortable');
});

test('compact density reduces spacing without reducing the readable text baseline', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const compactRules = styles.match(/html\[data-density="compact"\][\s\S]*?(?=\n\S|$)/g) || [];
  const compactCss = compactRules.join('\n');

  assert.match(compactCss, /\.page-body\s*\{[^}]*gap:/s);
  assert.match(compactCss, /\.data-table td\s*\{[^}]*padding-block:/s);
  assert.doesNotMatch(compactCss, /font-size\s*:/);
});
