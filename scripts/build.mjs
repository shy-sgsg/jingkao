import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
const sourceHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const appModules = [
  '../src/data/normalize.js',
  '../src/data/decision.js',
  '../src/data/onboarding.js',
  '../src/data/pageHelp.js',
  '../src/data/backup.js',
  '../src/data/coverage.js',
  '../src/data/positions.js',
  '../src/data/findings.js',
  '../src/data/displayDensity.js',
  '../src/data/encryptedStore.js',
  '../src/ui/eligibility.js',
  '../src/ui/scoreBreakdown.js',
  '../src/ui/viewTransition.js',
  '../src/ui/scrollReveal.js',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')
  .replace(/^export\s+/gm, '')
  .replace("import { getPublicManagementMajorTypes, summarizePublicManagementPositions } from './positions.js';\n", ''));
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '');
const embedded = `<style>\n${css}\n</style>`;
const bundledScript = `<script>\n${appModules.join('\n')}\n${app}\n</script>`;
const html = sourceHtml
  .replace(/\s*<link rel="stylesheet" href="\/src\/styles\.css" \/>/, `\n    ${embedded}`)
  .replace(/\s*<script type="module" src="\/src\/app\.js"><\/script>/, `\n    ${bundledScript}`);
writeFileSync(new URL('index.html', dist), html);
cpSync(new URL('../src/', import.meta.url), new URL('src/', dist), { recursive: true });
cpSync(new URL('../public/', import.meta.url), new URL('public/', dist), { recursive: true });
console.log('Standalone site built to dist/index.html (no external runtime dependencies).');
