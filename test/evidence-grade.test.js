import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPositionEvidenceGrade } from '../src/data/positions.js';

const sources = [
  { sourceId: 'official', level: 'official', publisher: '北京市人社局' },
  { sourceId: 'mirror-a', level: 'secondary', publisher: '华图' },
  { sourceId: 'mirror-a-detail', level: 'secondary', publisher: '华图' },
  { sourceId: 'mirror-b', level: 'secondary', publisher: '相对面' },
];

test('position evidence grade distinguishes official, multiple publishers, one publisher, and unknown', () => {
  assert.equal(getPositionEvidenceGrade({ sources: ['official'] }, sources), 'A');
  assert.equal(getPositionEvidenceGrade({ sources: ['mirror-a', 'mirror-b'] }, sources), 'B');
  assert.equal(getPositionEvidenceGrade({ sources: ['mirror-a', 'mirror-a-detail'] }, sources), 'C');
  assert.equal(getPositionEvidenceGrade({ sources: ['mirror-a'] }, sources), 'C');
  assert.equal(getPositionEvidenceGrade({ sources: ['missing-source'] }, sources), 'D');
  assert.equal(getPositionEvidenceGrade({}, sources), 'D');
});

test('job library and detail expose evidence grades while keeping verification wording separate', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /positionEvidenceMarkup\(position\)/);
  assert.match(app, /A · 官方[\s\S]*B · 多家第三方[\s\S]*C · 单一第三方[\s\S]*D · 未核实/s);
  assert.match(app, /核验状态/);
  assert.match(app, /至少两家不同来源发布方/s);
});
