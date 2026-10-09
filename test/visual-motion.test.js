import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('polish animations cover page entry, guide entry, and quick-start feedback', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.page-shell[^\{]*\{[^}]*animation:/s);
  assert.match(styles, /\.modal-card[^\{]*\{[^}]*animation:/s);
  assert.match(styles, /\.quick-start-card[^\{]*\{[^}]*transition:/s);
  assert.match(styles, /\.orbit-one\s*\{[^}]*animation:/s);
  assert.match(styles, /\.art-sun\s*\{[^}]*animation:/s);
  assert.match(styles, /\.quick-start-card:hover\s*\{[^}]*transform:/s);
  assert.match(styles, /\.button:active\s*\{/);
});

test('onboarding steps arrive with a visible cascade and honor reduced-motion settings', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const motionStart = styles.indexOf('@media (prefers-reduced-motion: no-preference)');
  const reducedStart = styles.indexOf('@media (prefers-reduced-motion: reduce)', motionStart);
  const motionRules = styles.slice(motionStart, reducedStart);
  const guideKeyframes = styles.match(/@keyframes guide-enter\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  const guideStart = guideKeyframes.match(/from\s*\{([^}]*)\}/)?.[1] || '';
  const guideTravel = Number(guideStart.match(/translateX\(([\d.]+)px\)/)?.[1] || 0);

  assert.ok(guideTravel >= 20);
  assert.match(motionRules, /\.onboarding-content \.onboarding-step-label\s*\{[^}]*animation-delay:\s*90ms/s);
  assert.match(motionRules, /\.onboarding-content \.modal-footer\s*\{[^}]*animation-delay:\s*210ms/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*\.01ms !important[^}]*animation-duration:\s*\.01ms !important/s);
});

test('onboarding capability cards have a staggered entrance that is removed for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const motionStart = styles.indexOf('@media (prefers-reduced-motion: no-preference)');
  const reducedStart = styles.indexOf('@media (prefers-reduced-motion: reduce)', motionStart);
  const motionRules = styles.slice(motionStart, reducedStart);
  const reducedRules = styles.slice(reducedStart);
  const cardKeyframes = styles.match(/@keyframes capability-pop\s*\{([\s\S]*?)\n\}/)?.[1] || '';

  assert.match(motionRules, /\.onboarding-content--initial \.onboarding-capabilities li\s*\{[^}]*animation-delay:\s*calc\(170ms \+ var\(--capability-index, 0\) \* 72ms\)/s);
  assert.match(cardKeyframes, /translateY\(18px\) scale\(\.92\)/);
  assert.match(cardKeyframes, /translateY\(-2px\) scale\(1\.015\)/);
  assert.match(reducedRules, /html:not\(\[data-motion="immersive"\]\) \.onboarding-content--initial \*\s*,[^}]*animation:\s*none !important/s);
});

test('onboarding step changes move in the direction of travel and stop for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(app, /function renderOnboarding\(direction = 'initial'\)/);
  assert.match(app, /class="onboarding-content onboarding-content--\$\{direction\}"/);
  assert.match(app, /renderOnboarding\(action === 'onboarding-back' \? 'back' : 'forward'\)/);
  assert.match(styles, /@keyframes onboarding-step-forward\s*\{[^}]*translateX\(4\dpx\)/s);
  assert.match(styles, /@keyframes onboarding-step-back\s*\{[^}]*translateX\(-4\dpx\)/s);
  assert.match(styles, /\.onboarding-content--forward \.onboarding-step-label\s*\{[^}]*animation:\s*onboarding-step-forward/s);
  assert.match(styles, /\.onboarding-content--back \.onboarding-step-label\s*\{[^}]*animation:\s*onboarding-step-back/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.onboarding-step-pane \*[\s\S]*?animation:\s*none !important/s);
});

test('overview welcome copy does not stack a second entrance on route changes', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.welcome-copy/);
  assert.match(styles, /\.page-shell\.page-enter\s*\{[^}]*animation:\s*page-enter 260ms/s);
});

test('overview ambient artwork remains animated without replaying on route changes', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.welcome-art/);
  assert.match(styles, /\.orbit-one\s*\{[^}]*animation:/s);
  assert.match(styles, /\.art-sun\s*\{[^}]*animation:/s);
});

test('target-gap cards retain interaction feedback without a route-entry pop', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const reducedRules = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.score-target-card/);
  assert.match(styles, /\.score-target-card:hover\s*\{[^}]*transform:/s);
  assert.match(reducedRules, /html:not\(\[data-motion="immersive"\]\) \.score-target-card, html:not\(\[data-motion="immersive"\]\) \.score-target-card:hover\s*\{[^}]*transition:[^}]*none !important/s);
});

test('overview ambient motion is perceptible without overwhelming the page and remains brief for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const orbitKeyframes = styles.match(/@keyframes orbit-drift\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  const sunKeyframes = styles.match(/@keyframes sun-breathe\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  const motionStart = styles.indexOf('@media (prefers-reduced-motion: no-preference)');
  const reducedStart = styles.indexOf('@media (prefers-reduced-motion: reduce)', motionStart);
  const motionRules = styles.slice(motionStart, reducedStart);
  const reducedRules = styles.slice(reducedStart);
  const reducedMotionDefaults = styles.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*([^}]*)\}/)?.[1] || '';

  assert.match(orbitKeyframes, /translate3d\(16px, 12px, 0\)/, 'decorative orbit should travel far enough to be noticed');
  assert.match(sunKeyframes, /scale\(1\.08\)/, 'hero glow should breathe visibly');
  assert.match(motionRules, /\.orbit-one\s*\{[^}]*animation:\s*orbit-drift 6s/s, 'ambient movement should finish its cycle without dragging');
  assert.match(reducedMotionDefaults, /animation-duration:\s*\.01ms !important/);
  assert.match(reducedMotionDefaults, /animation-iteration-count:\s*1 !important/, 'reduced-motion settings should collapse continuous animation');
  assert.match(reducedRules, /html:not\(\[data-motion="immersive"\]\) \.welcome-art\s*\{[^}]*animation:\s*none !important/s, 'enhanced mode should follow the system motion preference');
});

test('source coverage cards reveal with animated meters and remain still for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const reducedRules = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.source-coverage-card/);
  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.source-coverage-meter/);
  assert.match(reducedRules, /html:not\(\[data-motion="immersive"\]\) \.source-coverage-card, html:not\(\[data-motion="immersive"\]\) \.source-score-card, html:not\(\[data-motion="immersive"\]\) \.source-coverage-meter\s*>\s*span\s*\{[^}]*animation:\s*none !important/s);
  assert.match(reducedRules, /html:not\(\[data-motion="immersive"\]\) \.source-coverage-card, html:not\(\[data-motion="immersive"\]\) \.source-score-card, html:not\(\[data-motion="immersive"\]\) \.source-coverage-meter\s*>\s*span\s*\{[^}]*transform:\s*none !important/s);
});

test('motion respects both reduced-motion and keyboard focus preferences', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /:focus-visible\s*\{/);
});

test('the immersive site preference overrides system reduced motion while enhanced remains reduced', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const reducedBlocks = [...styles.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
    .map((match) => match[1]);
  const reducedMotionRules = reducedBlocks.flatMap((block) => [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((match) => ({ selectors: match[1].split(',').map((selector) => selector.trim()), declarations: match[2] }))
    .filter(({ declarations }) => /(?:scroll-behavior|transition|animation|transform|filter)\s*:/i.test(declarations)));

  assert.ok(reducedBlocks.length > 0, 'enhanced motion should retain explicit system-preference rules');
  assert.ok(reducedMotionRules.length > 0);
  for (const { selectors } of reducedMotionRules) {
    assert.ok(selectors.every((selector) => selector.startsWith('html:not([data-motion="immersive"])')),
      `system reductions must not override an explicit immersive choice: ${selectors.filter((selector) => !selector.startsWith('html:not([data-motion="immersive"])')).join(', ')}`);
  }
  assert.ok(reducedMotionRules.some(({ declarations }) => /animation-duration:\s*\.01ms !important/.test(declarations)),
    'the reduced system preference should still quickly collapse animations in enhanced mode');

  assert.match(styles, /@media \(prefers-reduced-motion: no-preference\), \(prefers-reduced-motion: reduce\)/,
    'immersive animation rules must be eligible even when the operating system requests reduced motion');
  assert.match(styles, /@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\), \(hover: hover\) and \(prefers-reduced-motion: reduce\)/,
    'immersive hover feedback must also remain available under the system reduction preference');
});

test('page transitions are reserved for navigation and do not cascade through dashboard content', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.ok(/class="page-shell \$\{pageTransition \? 'page-enter' : ''\}\$\{resultTransition \? ' results-enter' : ''\}"/.test(app), 'page shell should opt into route or result motion only when requested');
  assert.ok(/function navigate\(id, query = '', aptitudeModuleId = null\) \{[\s\S]*?pageTransition = true;[\s\S]*?runViewTransition\(document,\s*\(\)\s*=>\s*\{[\s\S]*?render\(\);[\s\S]*?scrollToTop\(\);[\s\S]*?\}, storage\.settings\.motion\);/.test(app), 'navigation should render and reset scroll within the progressive page transition update');
  assert.ok(/function render\(\) \{[\s\S]*?pageTransition = false;/.test(app), 'ordinary renders should not replay page entry motion');
  assert.ok(/window\.addEventListener\('hashchange',[\s\S]*?pageTransition = true;[\s\S]*?runViewTransition\(document,\s*\(\)\s*=>\s*\{[\s\S]*?render\(\);[\s\S]*?scrollToTop\(\);[\s\S]*?\}, storage\.settings\.motion\);/.test(app), 'browser history navigation should reset scroll within the page transition update');
  assert.match(app, /window\.scrollTo\(\{ top: 0, behavior: 'instant' \}\);/, 'route scroll should finish before page-entry motion begins');
  assert.ok(/\.page-shell\.page-enter\s*\{[^}]*animation:/s.test(styles), 'navigation page entry should animate');
  assert.doesNotMatch(styles, /\.page-shell\.page-enter\s+(?:\.page-body|\.metric-card|\.chart-line|\.mock-history-stat)/);
});

test('chart marks and primary cards get bounded motion feedback', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.ok(/\.page-shell\.results-enter \.score-ecdf-wrap \.chart-line\s*\{[^}]*animation:/s.test(styles), 'chart line should animate when refreshed results change');
  assert.ok(/\.quick-start-card:hover\s*\{[^}]*transform:/s.test(styles), 'quick-start cards should lift on hover');
  assert.ok(/\.quick-start-card:active\s*\{[^}]*transform:/s.test(styles), 'quick-start cards should respond when pressed');
  assert.ok(/@media \(prefers-reduced-motion: no-preference\)/.test(styles), 'decorative motion should require no-preference');
});

test('navigation, progress, and score trends use clear but bounded motion', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(styles, /\.nav-item\.active::before\s*\{[^}]*animation:/s, 'active navigation should animate its position marker');
  assert.match(styles, /@keyframes progress-fill[\s\S]*?transform:\s*scaleX\(0\)[\s\S]*?transform:\s*scaleX\(1\)/, 'progress bars should visibly fill');
  assert.match(styles, /@keyframes chart-draw\s*\{[^}]*stroke-dashoffset/s, 'score trend should draw along the data path');
  assert.match(app, /class="chart-line" pathLength="1"/, 'score trend should normalize path length for drawing');
  assert.match(app, /chart-point" style="--point-index:/, 'score points should arrive in a short stagger');
});

test('reduced-motion preference removes decorative card movement', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const reducedMotion = styles.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(/\.quick-start-card:hover[\s\S]*?transform:\s*none/.test(reducedMotion), 'quick-start lift should be disabled for reduced motion');
  assert.ok(/\.metric-card:hover[\s\S]*?transform:\s*none/.test(reducedMotion), 'metric lift should be disabled for reduced motion');
});

test('primary controls and compact controls remain usable at touch sizes', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /--control-height:\s*42px/);
  assert.match(styles, /\.button-small\s*\{[^}]*min-height:\s*40px/s);
  assert.match(styles, /\.mobile-menu\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/s);
});

test('interactive navigation and scoring controls have noticeable motion feedback', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(styles, /\.nav-item:hover\s*\{[^}]*transform:\s*translateX\(6px\)/s);
  assert.match(styles, /\.nav-item\.active:hover::before\s*\{[^}]*width:\s*4px/s);
  assert.match(styles, /\.score-slider:focus-visible\s*\{[^}]*box-shadow:/s);
  assert.match(styles, /\.data-table tbody tr:hover\s*>\s*td:first-child\s*\{[^}]*box-shadow:/s);
  const pageEntry = styles.match(/@keyframes page-enter\s*\{[^}]*\}/s)?.[0] || '';
  assert.match(pageEntry, /opacity:\s*0/);
  assert.doesNotMatch(pageEntry, /filter:\s*blur|translateY\(\d{2,}px\)/);
  assert.match(styles, /\.scenario-result-number\.score-pulse\s*\{[^}]*animation:\s*score-pop/s);
  assert.match(app, /resultNumber\.classList\.add\('score-pulse'\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.nav-item:hover[\s\S]*?transform:\s*none/s);
});

test('position classification badges get motion feedback only when motion is allowed', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const badgeRule = styles.indexOf('.major-match-badge {');
  const hoverMotionStart = styles.indexOf('@media (hover: hover) and (prefers-reduced-motion: no-preference)', badgeRule);
  const nextBreakpoint = styles.indexOf('@media (max-width: 700px)', hoverMotionStart);
  const hoverMotion = styles.slice(hoverMotionStart, nextBreakpoint);

  assert.ok(hoverMotionStart > badgeRule, 'badge hover motion should be gated by hover capability and motion preference');
  assert.match(hoverMotion, /\.major-match-badge\s*\{[^}]*transition:\s*transform/s);
  assert.match(hoverMotion, /tr:hover \.major-match-badge\s*\{[^}]*transform:\s*translateY\(-2px\)/s);
});

test('job search and filter controls transition smoothly into focus', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.searchbox\s*\{[^}]*transition:[^}]*border-color[^}]*box-shadow/s);
  assert.match(styles, /\.job-filterbar select\s*\{[^}]*transition:[^}]*border-color[^}]*box-shadow/s);
});

test('advanced job filters open with a clear cascade and collapse motion for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const motionStart = styles.indexOf('@media (prefers-reduced-motion: no-preference)');
  const reducedStart = styles.indexOf('@media (prefers-reduced-motion: reduce)', motionStart);
  const motionRules = styles.slice(motionStart, reducedStart);
  const reducedRules = styles.slice(reducedStart);
  const reveal = styles.match(/@keyframes filter-panel-reveal\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(reveal, /translateY\(1[02468]px\)/, 'the filter panel should travel far enough to read as an intentional reveal');
  assert.match(motionRules, /\.job-advanced-filters\[open\] \.job-advanced-grid\s*\{[^}]*animation:\s*filter-panel-reveal/s);
  assert.match(motionRules, /\.job-advanced-filters\[open\] \.job-advanced-field\s*\{[^}]*animation-delay:\s*calc\(var\(--filter-index, 0\) \* 45ms\)/s);
  assert.match(motionRules, /\.job-advanced-filters\[open\] summary::after\s*\{[^}]*transform:\s*rotate\(180deg\)/s);
  assert.match(reducedRules, /\.job-advanced-filters\[open\] \.job-advanced-grid,[^}]*animation:\s*none !important/s);
  assert.match(reducedRules, /\.job-advanced-filters summary::after\s*\{[^}]*transition:\s*none !important/s);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.job-advanced-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
});

test('job details use a layered entrance and staggered fact reveal with reduced-motion support', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.ok(/\.modal-overlay\s*\{[^}]*animation:\s*modal-overlay-enter/s.test(styles), 'the backdrop should ease into view');
  assert.ok(/@keyframes modal-enter\s*\{[^}]*filter:\s*blur\(4px\)[^}]*translateY\(26px\)[^}]*scale\(\.96\)/s.test(styles), 'the dialog should use a visible but bounded entrance');
  assert.ok(/\.job-detail-grid\s*>\s*div\s*\{[^}]*animation:\s*detail-reveal/s.test(styles), 'position facts should reveal in sequence');
  assert.ok(/animation-delay:\s*calc\(var\(--detail-index, 0\) \* 48ms\)/.test(styles), 'fact reveal delay should stay capped per item');
  assert.ok(/class="detail-grid job-detail-grid"/.test(app), 'the cascade should be scoped to job details');
  assert.ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration:\s*\.01ms !important/.test(styles), 'reduced-motion preference should suppress the cascade');
});

test('mock history statistics do not replay on navigation and remain still for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /class="mock-history-strip"/);
  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.mock-history-stat/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.mock-history-stat:hover\s*\{[^}]*transform:\s*none/s);
});

test('dashboard chrome and primary actions have a refined, tactile visual layer', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /body\s*\{[^}]*background:\s*radial-gradient\([\s\S]*?var\(--page\)/s, 'the canvas should have restrained ambient depth');
  assert.match(styles, /\.sidebar\s*\{[^}]*backdrop-filter:\s*blur\(/s, 'the navigation rail should feel distinct from the page canvas');
  assert.match(styles, /\.metric-card::before\s*\{[^}]*background:\s*linear-gradient/s, 'overview metrics should gain a subtle accent edge');
  assert.match(styles, /\.button-primary::after\s*\{[^}]*transform:[^}]*translateX/s, 'primary actions should include a controlled highlight sweep');
  assert.match(styles, /@keyframes status-breathe[\s\S]*?box-shadow:/, 'the local data state should have a quiet live indicator');
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.button-primary::after[\s\S]*?animation:[^;]*none/s, 'highlight motion should respect reduced-motion settings');
});

test('route changes use a distinct content transition and job filters animate only refreshed results', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');

  assert.match(app, /runViewTransition\(document,\s*\(\)\s*=>\s*\{/, 'route changes should use the progressive browser transition helper with the saved motion intensity');
  assert.match(app, /let resultTransition = false/);
  assert.match(app, /class="page-shell \$\{pageTransition \? 'page-enter' : ''\}\$\{resultTransition \? ' results-enter' : ''\}"/);
  assert.match(styles, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?\.page-shell\.results-enter \.job-table tbody tr[\s\S]*?animation: filter-result-enter/s);
  assert.match(app, /const rows = positions\.map\(\(position, index\) => \{/);
  assert.match(app, /classifyPublicManagementMatch\(position\)/);
  assert.match(app, /class="major-match-badge major-match-\$\{majorMatch\.status\}"/);
  assert.match(styles, /\.page-shell\.results-enter \.job-table tbody tr\s*\{[^}]*animation-delay: calc\(var\(--row-index, 0\) \* 36ms\)/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.page-shell\.results-enter \.job-table tbody tr[\s\S]*?animation: none/s);
});

test('the active navigation marker glides between pages and stops for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const activeMarker = styles.match(/\.nav-item\.active::before\s*\{([^}]*)\}/)?.[1] || '';
  const motionStart = styles.indexOf('@media (prefers-reduced-motion: no-preference)');
  const reducedStart = styles.indexOf('@media (prefers-reduced-motion: reduce)', motionStart);
  const motionRules = styles.slice(motionStart, reducedStart);
  const reducedRules = styles.slice(reducedStart);

  assert.match(activeMarker, /view-transition-name:\s*nav-active-indicator/);
  assert.match(motionRules, /::view-transition-group\(nav-active-indicator\)\s*\{[^}]*animation-duration:\s*2\d\dms/s);
  assert.match(reducedRules, /::view-transition-group\(nav-active-indicator\)\s*\{[^}]*animation:\s*none !important/s);
});

test('hash navigation leaves its single scroll reset to the transition update', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const hashChangeBranch = app.match(/if \(location\.hash !== route\) \{([\s\S]*?)\n  \}/)?.[1] || '';

  assert.match(hashChangeBranch, /location\.hash = route\.slice\(1\);/);
  assert.doesNotMatch(hashChangeBranch, /scrollToTop\(\)/, 'hashchange owns the route scroll so navigation cannot start two overlapping scrolls');
});

test('route snapshots use one short transition with a distinct immersive option', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const keyframeStart = (name) => styles.match(new RegExp(`@keyframes ${name}\\s*\\{\\s*from\\s*\\{([^}]*)`))?.[1] || '';
  const travel = (frame) => Number(frame.match(/translateY\((-?[\d.]+)px\)/)?.[1] || 0);
  const page = keyframeStart('page-enter');
  const route = keyframeStart('view-content-in');
  const immersive = keyframeStart('immersive-view-content-in');

  assert.ok(travel(page) <= 6);
  assert.ok(travel(route) <= 6);
  assert.ok(travel(immersive) >= 10 && travel(immersive) <= 14);
  assert.doesNotMatch(page, /filter:\s*blur/);
  assert.doesNotMatch(route, /filter:\s*blur/);
  assert.doesNotMatch(styles, /\.page-shell\.page-enter\s+(?:\.page-body|\.metric-card|\.chart-line|\.mock-history-stat)/);
  assert.match(styles, /::view-transition-new\(main-content\)\s*\{[^}]*animation:\s*view-content-in 260ms/s);
  assert.match(styles, /html\[data-motion="immersive"\]::view-transition-new\(main-content\)\s*\{[^}]*animation:\s*immersive-view-content-in 360ms/s);
});

test('research findings use expressive but preference-gated motion', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const researchStyles = styles.slice(styles.indexOf('.research-page'));
  const motionStart = researchStyles.indexOf('@media (prefers-reduced-motion: no-preference)');
  const reducedStart = researchStyles.indexOf('@media (prefers-reduced-motion: reduce)', motionStart);
  const motionRules = researchStyles.slice(motionStart, reducedStart);
  const reducedRules = researchStyles.slice(reducedStart);

  assert.match(motionRules, /\.research-orbit-one\s*\{[^}]*animation:/s, 'the research hero orbits only when motion is allowed');
  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.research-finding/, 'route transitions should not stagger research cards');
  assert.match(motionRules, /\.research-finding:hover\s*\{[^}]*transform:\s*translateY\(-4px\)/s, 'cards should have tactile pointer feedback');
  assert.match(reducedRules, /\.research-finding:hover\s*\{[^}]*transform:\s*none !important/s, 'reduced-motion users should not receive card travel');
});

test('assistant score evidence reveals on demand and stays still for reduced-motion users', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const motionBlocks = [...styles.matchAll(/@media \(prefers-reduced-motion: no-preference\)(?:, \(prefers-reduced-motion: reduce\))?\s*\{([\s\S]*?)\n\}/g)].map((match) => match[1]);
  const motionBlock = motionBlocks.find((block) => /\.score-breakdown\[open\] \.score-component-list[\s\S]*?animation:\s*score-breakdown-reveal/.test(block)) || '';
  const reducedBlock = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.match(motionBlock, /\.score-breakdown\[open\] \.score-component-list[\s\S]*?animation:\s*score-breakdown-reveal/);
  assert.match(motionBlock, /\.score-breakdown\[open\] \.score-component[\s\S]*?animation-delay:\s*calc\(var\(--score-index/);
  assert.match(styles, /@keyframes score-breakdown-reveal\s*\{[^}]*translateY\(18px\)/s);
  assert.match(reducedBlock, /html:not\(\[data-motion="immersive"\]\) \.score-component-list, html:not\(\[data-motion="immersive"\]\) \.score-breakdown\[open\] \.score-component\s*\{[^}]*animation:\s*none !important/s);
});

test('annual source explanations cascade open and respect reduced-motion settings', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const evidenceStart = styles.indexOf('.evidence-source-notes');
  const evidenceStyles = styles.slice(evidenceStart);
  const motionBlocks = [...evidenceStyles.matchAll(/@media \(prefers-reduced-motion: no-preference\)(?:, \(prefers-reduced-motion: reduce\))?\s*\{([\s\S]*?)\n\}/g)].map((match) => match[1]);
  const motionBlock = motionBlocks.find((block) => /\.evidence-source-notes\[open\] \.evidence-source-note[\s\S]*?animation:\s*evidence-note-enter/.test(block)) || '';
  const reducedBlock = evidenceStyles.slice(evidenceStyles.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.match(motionBlock, /\.evidence-source-notes\[open\] \.evidence-source-note[\s\S]*?animation:\s*evidence-note-enter/);
  assert.match(styles, /@keyframes evidence-note-enter\s*\{[^}]*translateX\(18px\)[^}]*scale\(\.98\)/s);
  assert.match(reducedBlock, /\.evidence-source-notes \.evidence-source-note\s*\{[^}]*animation:\s*none !important/s);
});

test('score scenario scrubbing has a tactile thumb and a pronounced value pop', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const reducedMotion = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.match(styles, /\.score-slider::-webkit-slider-thumb\s*\{[^}]*width:\s*20px/s);
  assert.match(styles, /\.score-slider:active::-(?:webkit-slider-thumb|moz-range-thumb)[^{]*\{[^}]*transform:\s*scale\(1\.16\)/s);
  assert.match(styles, /@keyframes score-pop\s*\{[\s\S]*?transform:\s*translateY\(8px\) scale\(\.72\)[\s\S]*?transform:\s*translateY\(-2px\) scale\(1\.14\)/);
  assert.match(reducedMotion, /\.score-slider:active::-(?:webkit-slider-thumb|moz-range-thumb)\s*\{[^}]*transform:\s*none !important/s);
});

test('changing score segments cascades updated results and honors reduced motion', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const reducedMotion = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.match(app, /event\.target\.id === 'scenario-year' \|\| event\.target\.id === 'scenario-scope'[\s\S]*?resultTransition = true[\s\S]*?render\(\)/);
  assert.match(styles, /\.page-shell\.results-enter \.scenario-result\s*\{[^}]*animation:/s);
  assert.match(styles, /\.page-shell\.results-enter \.scenario-list \.scenario-row\s*\{[^}]*animation-delay: calc\(var\(--scenario-index/);
  assert.match(styles, /\.page-shell\.results-enter \.scenario-table tbody tr\s*\{[^}]*animation:/s);
  assert.match(styles, /\.page-shell\.results-enter \.score-ecdf-wrap \.chart-line\s*\{[^}]*animation:/s);
  assert.match(reducedMotion, /\.page-shell\.results-enter \.scenario-result[\s\S]*?\.page-shell\.results-enter \.score-ecdf-wrap \.chart-point[^}]*animation: none !important/s);
});

test('registration snapshot rows cascade into view and use restrained hover motion', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const reducedMotion = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.doesNotMatch(styles, /\.page-shell\.page-enter \.snapshot-list \.snapshot-row/);
  assert.match(styles, /\.snapshot-list \.snapshot-row:hover\s*\{[^}]*transform:\s*translateX\(4px\)/s);
  assert.match(reducedMotion, /\.snapshot-list \.snapshot-row\s*\{[^}]*animation:\s*none !important/s);
  assert.match(reducedMotion, /\.snapshot-list \.snapshot-row:hover\s*\{[^}]*transform:\s*none !important/s);
});

test('route scroll reset runs inside both navigation transition updates', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const routeUpdates = [...app.matchAll(/runViewTransition\(document,\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*storage\.settings\.motion\)/g)]
    .map(([, update]) => update);

  assert.equal(routeUpdates.length, 2, 'direct navigation and browser history should use the same atomic route update');
  for (const update of routeUpdates) assert.match(update, /render\(\);\s*scrollToTop\(\);/);
});

test('immersive route fallback keeps a visible entrance when view transitions are unavailable', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const from = styles.match(/@keyframes immersive-page-enter\s*\{\s*from\s*\{([^}]*)/)?.[1] || '';
  const travel = Number(from.match(/translateY\(([\d.]+)px\)/)?.[1] || 0);
  const reducedRules = styles.slice(styles.indexOf('@media (prefers-reduced-motion: reduce)'));

  assert.ok(travel >= 10, 'immersive fallback should move the page as much as the browser transition');
  assert.match(reducedRules, /html:not\(\[data-motion="immersive"\]\) \.page-shell\.page-enter\s*\{[^}]*animation:\s*none !important/s);
});
