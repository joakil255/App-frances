import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Lee un archivo de la raíz del proyecto como texto
function readRootFile(name) {
  return readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
}

test('manifest es JSON válido con los campos de una PWA', () => {
  const manifest = JSON.parse(readRootFile('manifest.webmanifest'));

  for (const field of ['name', 'short_name']) {
    assert.equal(typeof manifest[field], 'string', `${field} debe ser texto`);
    assert.ok(manifest[field].trim().length > 0, `${field} no puede estar vacío`);
  }
  // Ruta relativa: la app debe funcionar también dentro de una subcarpeta
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'es');
});

test('index.html enlaza el manifiesto con ruta relativa', () => {
  const html = readRootFile('index.html');
  assert.ok(html.includes('<link rel="manifest" href="manifest.webmanifest">'));
});

test('index.html declara idioma, codificación y viewport', () => {
  const html = readRootFile('index.html');
  assert.ok(html.includes('<html lang="es">'), 'falta <html lang="es">');
  // Sin utf-8 los acentos (é, ç, à) se verían mal
  assert.ok(html.includes('<meta charset="utf-8">'), 'falta <meta charset="utf-8">');
  assert.ok(html.includes('<meta name="viewport"'), 'falta <meta name="viewport">');
});
