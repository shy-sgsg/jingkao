import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('start script serves the built website over localhost HTTP', async () => {
  const start = await readFile(new URL('../start.sh', import.meta.url), 'utf8');
  assert.ok(/npm run build/.test(start), 'start script should refresh the standalone build');
  const advertisedPort = start.match(/网站服务地址：http:\/\/127\.0\.0\.1:(\d+)/)?.[1];
  const servedPort = start.match(/python3 -m http\.server\s+(\d+)\s+--bind\s+127\.0\.0\.1\s+--directory\s+dist/)?.[1];
  assert.ok(servedPort, 'start script should serve dist over loopback HTTP');
  assert.equal(advertisedPort, servedPort, 'start script should print the same port it serves');
  assert.ok(!/xdg-open\s+.*index\.html/.test(start), 'start script should not launch the app as a file URL');
});
