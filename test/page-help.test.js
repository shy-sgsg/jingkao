import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPageHelp, PAGE_HELP } from '../src/data/pageHelp.js';

test('every existing route has short, task-specific in-page guidance', () => {
  const routeIds = ['overview', 'guide', 'plan', 'aptitude', 'aptitudeModule', 'science', 'generalKnowledge', 'essay', 'mocks', 'positions', 'compare', 'assistant', 'scenarios', 'matrix', 'profile', 'research', 'evidence', 'sources', 'settings'];
  assert.deepEqual(Object.keys(PAGE_HELP).sort(), [...routeIds].sort());
  for (const route of routeIds) {
    const help = getPageHelp(route);
    assert.ok(help.text.length >= 20, `${route} should explain how to use the page`);
  }
  assert.equal(PAGE_HELP.evidence.actionPage, 'sources');
  assert.equal(PAGE_HELP.research.actionPage, 'evidence');
});

test('unknown routes fall back to overview guidance', () => {
  assert.equal(getPageHelp('unknown').text, PAGE_HELP.overview.text);
});

test('new aptitude module guidance explains merged stats and empty-bank behavior', () => {
  assert.match(PAGE_HELP.aptitudeModule.text, /站内作答与手动记录合并/);
  assert.match(PAGE_HELP.aptitudeModule.text, /空题库不会启动训练/);
});

test('overview guidance matches its score-gap panel and task-first actions', () => {
  assert.match(PAGE_HELP.overview.text, /真实模考/);
  assert.match(PAGE_HELP.overview.text, /历史职位/);
  assert.match(PAGE_HELP.overview.text, /真实记录/);
  assert.equal(PAGE_HELP.overview.actionPage, 'plan');
});

test('evidence guidance distinguishes the new timed position snapshots from district aggregates', () => {
  assert.match(PAGE_HELP.evidence.text, /岗位级资格审查快照/);
  assert.match(PAGE_HELP.evidence.text, /区级汇总/);
  assert.match(PAGE_HELP.evidence.text, /最终报名、缴费或实考/);
});

test('the guide map turns every workspace route into a named question and a valid destination', async () => {
  const help = await import('../src/data/pageHelp.js');
  assert.equal(typeof help.buildGuideGroups, 'function', 'the guide page needs a reusable route-to-guide mapping');
  if (typeof help.buildGuideGroups !== 'function') return;

  const groups = help.buildGuideGroups(
    [{ label: '备考', items: [['overview', '备考总览'], ['mocks', '模考记录']] }],
    {
      overview: ['备考总览', '看整体状态。'],
      mocks: ['模考复盘', '记录真实成绩。'],
    },
  );

  assert.deepEqual(groups, [{
    label: '备考',
    pages: [
      { id: 'overview', label: '备考总览', title: '备考总览', subtitle: '看整体状态。', question: '我今天先学什么，离目标分还有多远？', href: '#/overview' },
      { id: 'mocks', label: '模考记录', title: '模考复盘', subtitle: '记录真实成绩。', question: '最近成绩有没有提升？主要丢分在哪里？', href: '#/mocks' },
    ],
  }]);
});

test('the guide is reachable in the app and its expressive motion honors reduced-motion preferences', async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(app, /href="#\/guide"/, 'the top bar should expose a direct guide entry');
  assert.match(app, /guide:\s*renderGuide/, 'the SPA router should render the guide route');
  assert.match(styles, /@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\), \(hover: hover\) and \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.guide-flow-card:hover/, 'guide hover motion should be available in immersive mode with a reduced-motion system preference');
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?html:not\(\[data-motion="immersive"\]\) \.guide-flow-card:hover\s*\{\s*transform:\s*none\s*!important;/, 'enhanced mode should honor the system reduced-motion preference');
});
