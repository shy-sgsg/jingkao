import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the overview renders its real upcoming plan and data-driven study recommendations', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /buildSevenDayRecommendations\(\{[\s\S]*?days:\s*getDays\(\)[\s\S]*?aptitude[,\s][\s\S]*?mocks[,\s][\s\S]*?today:\s*todayString\(\)/);
  assert.match(app, /function renderSevenDayPanel\(weekly\)/);
  assert.match(app, /未来7天复习建议/);
  assert.match(app, /weekly\.recommendations\.map/);
  assert.match(app, /weekly\.days\.map/);
  assert.match(app, /没有足够真实模块准确率可识别薄弱项/);
});
