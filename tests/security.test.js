import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Formas de convertir texto en HTML: con datos del usuario permitirían inyectar código
const FORBIDDEN = ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'setHTMLUnsafe', 'createContextualFragment'];

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

test('ningún archivo de la app pone atributos on… como texto', () => {
  for (const file of appScripts()) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(source, /setAttribute\(\s*['"]on/i, `${file} pone un atributo on… con setAttribute`);
  }
});

test('ningún archivo del repositorio contiene una clave de API', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.ok(files.length > 5, 'git ls-files no devolvió archivos');
  for (const file of files) {
    // Solo texto: se saltan las imágenes y las fuentes
    if (/\.(png|jpe?g|webp|ico|woff2?)$/i.test(file)) continue;
    let source;
    try {
      source = readFileSync(join(root, file), 'utf8');
    } catch {
      continue; // archivo borrado aún sin confirmar en git
    }
    assert.doesNotMatch(source, /sk-ant-[A-Za-z0-9_-]{10,}/, `${file} parece contener una clave de API`);
  }
});
