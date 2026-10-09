import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
const sourceHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const appModules = [
  '../src/aptitude/modules.js',
  '../src/aptitude/mock.js',
  '../src/aptitude/launch.js',
  '../src/aptitude/persistence.js',
  '../src/aptitude/analytics.js',
  '../src/aptitude/planTasks.js',
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
  '../src/general-knowledge/persistence.js',
  '../src/science/persistence.js',
  '../src/aptitude/knowledge.js',
  '../src/science/lessonContent.js',
  '../src/science/knowledge.js',
  '../src/science/planTasks.js',
  '../src/science/questions.js',
  '../src/science/sources.js',
  '../src/science/questionBank.js',
  '../src/science/sessions.js',
  '../src/aptitude/sessions.js',
  '../src/aptitude/questionBank.js',
  '../src/general-knowledge/lessonContent.js',
  '../src/general-knowledge/knowledge.js',
  '../src/aptitude/content.js',
  '../src/general-knowledge/planConfig.js',
  '../src/general-knowledge/planTasks.js',
  '../src/general-knowledge/questions.js',
  '../src/general-knowledge/sources.js',
  '../src/general-knowledge/questionBank.js',
  '../src/aptitude/questions.js',
  '../src/general-knowledge/sessions.js',
  '../src/general-knowledge/analytics.js',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')
  .replace(/^export\s+/gm, '')
  .replace("import { getPublicManagementMajorTypes, summarizePublicManagementPositions } from './positions.js';\n", '')
  .replace("import { getKnowledgePoint, getScienceTree } from './knowledge.js';\n", '')
  .replace("import { SCIENCE_LESSONS } from './lessonContent.js';\n", '')
  .replace("import { filterQuestions } from './questions.js';\n", '')
  .replace("import { SCIENCE_SOURCES } from './sources.js';\n", '')
  .replace("import { GENERAL_KNOWLEDGE_LESSONS } from './lessonContent.js';\n", '')
  .replace("import { getGeneralKnowledgePoint, getGeneralKnowledgeTree } from './knowledge.js';\n", '')
  .replace("import { normalizeGeneralKnowledgeConfig } from './planConfig.js';\n", '')
  .replace("import { updatePlanTask } from '../science/planTasks.js';\n", '')
  .replace("import { advanceExamQuestion, answerScienceQuestion, continueScienceSession, createScienceSession, expireScienceSession, finishExamSession, getScienceStats, goToExamQuestion, selectExamAnswer } from '../science/sessions.js';\n", '')
  .replace("import { normalizeGeneralKnowledgeStudy, toggleGeneralKnowledgeFavorite } from './persistence.js';\n", '')
  .replace("import { normalizeGeneralKnowledgeStudy } from './persistence.js';\n", '')
  .replace("import { getScienceStats } from '../science/sessions.js';\n", '')
  .replace(/^import\s*\{\s*[\s\S]*?\}\s*from\s*['"][^'"]+['"];\r?\n/gm, '')
  .replace(/^import .*;\r?\n/gm, ''));
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
