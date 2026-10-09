import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const build = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');

test('general knowledge has its own learner page backed by its own question bank and saved study state', () => {
  assert.match(app, /function renderGeneralKnowledge\(\)\s*\{/);
  assert.match(app, /GENERAL_KNOWLEDGE_QUESTION_BANK/);
  assert.match(app, /generalKnowledgeStudy/);
  assert.match(app, /"generalKnowledge": renderGeneralKnowledge|generalKnowledge: renderGeneralKnowledge/);
  assert.match(app, /generalKnowledge: \['常识判断'/);
  assert.match(app, /start-general-knowledge|answer-general-knowledge|toggle-general-knowledge/);
});

test('general-knowledge navigation supports lessons, practice, exam, mistakes, flashcards, sources, and plan links', () => {
  for (const action of ['open-general-knowledge-practice', 'answer-general-knowledge-question', 'select-general-knowledge-answer', 'toggle-general-knowledge-favorite', 'review-general-knowledge-flashcard']) {
    assert.ok(app.includes(action), `missing ${action} action`);
  }
  assert.ok(app.includes('reviewFlashcard(storage.generalKnowledgeStudy'));
  assert.ok(app.includes('generalKnowledgeConfig'));
  assert.ok(app.includes('reconcileGeneralKnowledgePlanTaskProgress'));
  assert.ok(app.includes('href="#/aptitude/general-knowledge?task='));
});

test('standalone build includes every general-knowledge runtime module', () => {
  for (const module of ['general-knowledge/persistence.js', 'general-knowledge/lessonContent.js', 'general-knowledge/knowledge.js', 'general-knowledge/planConfig.js', 'general-knowledge/planTasks.js', 'general-knowledge/questions.js', 'general-knowledge/sources.js', 'general-knowledge/questionBank.js', 'general-knowledge/sessions.js', 'general-knowledge/analytics.js']) {
    assert.ok(build.includes(module), `build omits ${module}`);
  }
});

test('standalone build removes multiline named imports before inlining modules', () => {
  assert.ok(build.includes('.replace(/^import\\s*\\{\\s*[\\s\\S]*?\\}\\s*from'));
});
