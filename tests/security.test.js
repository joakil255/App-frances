import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Formas de convertir texto en HTML: con datos del usuario permitirían inyectar código
const FORBIDDEN = ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write'];

function appScripts() {
  const files = readdirSync(join(root, 'js'), { recursive: true })
    .filter((file) => file.endsWith('.js'))
    .map((file) => join('js', file));
  return [...files, 'sw.js'];
}

test('ningún archivo de la app convierte texto en HTML', () => {
  const scripts = appScripts();
  assert.ok(scripts.length > 5, 'no se encontraron los archivos de la app');
  for (const file of scripts) {
    const source = readFileSync(join(root, file), 'utf8');
    for (const word of FORBIDDEN) {
      assert.ok(!source.includes(word), `${file} usa ${word}: usa textContent`);
    }
  }
});
