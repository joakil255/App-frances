import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', root), 'utf8'));

// Lee ancho y alto de la cabecera de un PNG (bloque IHDR, bytes 16–23)
function pngSize(path) {
  const bytes = readFileSync(new URL(path, root));
  assert.equal(bytes.toString('latin1', 1, 4), 'PNG', `${path} no es un PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('el manifiesto tiene iconos 192 y 512 normales y 512 maskable', () => {
  const has = (size, purpose) =>
    manifest.icons.some((i) => i.sizes === size && i.type === 'image/png' && i.purpose === purpose);
  assert.ok(has('192x192', 'any'), 'falta icono 192 any');
  assert.ok(has('512x512', 'any'), 'falta icono 512 any');
  assert.ok(has('512x512', 'maskable'), 'falta icono 512 maskable');
});

test('cada icono del manifiesto existe y mide lo que dice', () => {
  for (const icon of manifest.icons) {
    assert.ok(existsSync(new URL(icon.src, root)), `no existe ${icon.src}`);
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(icon.src), { width: w, height: h }, icon.src);
  }
});
