import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('the visible Cmd/Ctrl+K affordance opens and focuses the position search', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /document\.addEventListener\('keydown',[\s\S]*?(?:event\.metaKey|event\.ctrlKey)[\s\S]*?event\.key\.toLowerCase\(\)\s*===\s*'k'[\s\S]*?event\.preventDefault\(\)[\s\S]*?navigate\('positions'\)[\s\S]*?document\.querySelector\('#job-search'\)\?\.focus/s);
});

test('Escape closes an open dialog without changing the page', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /document\.addEventListener\('keydown',[\s\S]*?event\.key\s*===\s*'Escape'[\s\S]*?modalRoot\.firstElementChild[\s\S]*?closeOnboarding\(\)/s);
});
