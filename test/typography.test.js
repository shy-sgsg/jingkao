import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the site uses a readable dashboard type scale and has no text styles below 13px', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const root = styles.match(/:root\s*\{([^}]*)\}/)?.[1] || '';
  const undersized = [...styles.matchAll(/font-size:\s*([\d.]+)px/g)]
    .map((match) => Number(match[1]))
    .filter((size) => size < 13);

  assert.match(root, /--font-xs:\s*14px/);
  assert.match(root, /--font-sm:\s*15px/);
  assert.match(root, /--font-base:\s*16px/);
  assert.match(styles, /--text-body:\s*16px/);
  assert.match(styles, /--text-secondary:\s*14px/);
  assert.match(styles, /--control-height:\s*42px/);
  assert.match(styles, /body\s*\{[^}]*font-size:\s*var\(--font-base\)[^}]*line-height:\s*1\.65/s);
  assert.match(styles, /\.button\s*\{\s*min-height:\s*var\(--control-height\);\s*\}/s);
  assert.match(styles, /\.nav-item\s*\{\s*min-height:\s*44px;\s*\}/s);
  assert.match(styles, /\.data-table td\s*\{[^}]*font-size:\s*var\(--font-xs\)/s);
  assert.deepEqual(undersized, [], `text styles below 13px remain: ${undersized.join(', ')}`);
});
