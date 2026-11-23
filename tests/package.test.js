import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('npm start solo es accesible desde este computador', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  // Sin --bind, el servidor comparte la carpeta (incluido .git) con toda la red wifi
  assert.match(pkg.scripts.start, /--bind 127\.0\.0\.1/);
});
