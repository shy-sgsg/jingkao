import test from 'node:test';
import assert from 'node:assert/strict';
import { renderScoreBreakdown } from '../src/ui/scoreBreakdown.js';

test('score view shows supported factors, directions, denominators and missing-weight reasons', () => {
  const html = renderScoreBreakdown('难度', {
    score: null,
    availableWeight: 45,
    totalWeight: 100,
    components: [
      { key: 'interviewCutoff', label: '历史进面线', weight: 30, score: 50, value: 120, sampleCount: 10, direction: '进面线越高，历史门槛越高', reason: null },
      { key: 'qualifiedCompetition', label: '资格审核通过竞争比', weight: 25, score: null, value: null, sampleCount: 0, direction: '竞争比越高越难', reason: '暂无岗位级数据；区级汇总不参与' },
    ],
  });

  assert.match(html, /暂不汇总 · 45\/100 权重有证据/);
  assert.match(html, /历史进面线/);
  assert.match(html, /50\.0 \/ 100 · 样本 n=10/);
  assert.match(html, /进面线越高，历史门槛越高/);
  assert.match(html, /暂无岗位级数据；区级汇总不参与/);
});

test('score view keeps partial mock safety margins visible without calling them a score', () => {
  const html = renderScoreBreakdown('适配', {
    score: null,
    availableWeight: 30,
    totalWeight: 100,
    components: [
      { key: 'safeMargin', label: '历史进面安全垫', weight: 25, score: null, value: null, rawValue: 2.5, sampleCount: 10, userSampleCount: 3, direction: '安全垫越大越有利；不足五场只显示原始差值', reason: '有效模考不足 5 场（n=3）；原始差值仍可参考' },
    ],
  });

  assert.match(html, /原始差值 \+2\.5/);
  assert.match(html, /模考 n=3/);
  assert.match(html, /暂不汇总/);
});

test('score view labels a hard-filter stop instead of presenting a zero score', () => {
  const html = renderScoreBreakdown('适配', {
    score: null,
    availableWeight: 0,
    totalWeight: 100,
    components: [],
    reason: '先完成硬性资格核验',
  });

  assert.match(html, /等待资格核验/);
  assert.match(html, /先完成硬性资格核验/);
  assert.doesNotMatch(html, /0\.0 \/ 100/);
});
