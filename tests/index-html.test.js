import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCREENS } from '../js/lib/router.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('tiene enlace para saltar al contenido', () => {
  assert.match(html, /<a [^>]*href="#main"[^>]*>Saltar al contenido<\/a>/);
  assert.match(html, /<main [^>]*id="main"/);
});

test('la navegación principal tiene un enlace por pantalla', () => {
  const nav = html.match(/<nav aria-label="Principal"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(nav, 'falta <nav aria-label="Principal">');
  for (const screen of SCREENS) {
    const href = `#/${screen.path}`;
    assert.ok(nav[1].includes(`href="${href}"`), `falta enlace a ${href}`);
    assert.ok(nav[1].includes(`>${screen.title}<`), `falta texto ${screen.title}`);
  }
});

test('cada pantalla tiene su sección con título enfocable', () => {
  for (const screen of SCREENS) {
    const section = html.match(new RegExp(`<section id="screen-${screen.id}"[^>]*>([\\s\\S]*?)</section>`));
    assert.ok(section, `falta section screen-${screen.id}`);
    assert.match(section[1], new RegExp(`<h1 [^>]*tabindex="-1"[^>]*>[\\s\\S]*${screen.title}[\\s\\S]*</h1>`));
  }
});

test('carga la app como módulo y enlaza el icono', () => {
  assert.ok(html.includes('<script type="module" src="js/app.js"></script>'));
  assert.ok(html.includes('<link rel="icon" href="icons/icon.svg" type="image/svg+xml">'));
});

test('tiene el aviso de versión nueva, oculto y anunciable', () => {
  const region = html.match(/<div class="update" role="status">([\s\S]*?)<\/div>\s*<\/div>/);
  assert.ok(region, 'falta <div class="update" role="status">');
  assert.match(region[1], /<div class="update-banner" hidden>/);
  assert.match(region[1], /Hay una versión nueva de la app\./);
  assert.match(region[1], /<button type="button" class="update-button">Actualizar<\/button>/);
});

test('declara theme-color para tema claro y oscuro', () => {
  assert.ok(html.includes('<meta name="theme-color" content="#233A7A" media="(prefers-color-scheme: light)">'));
  assert.ok(html.includes('<meta name="theme-color" content="#1A2B5C" media="(prefers-color-scheme: dark)">'));
});

// --- Pantalla Vocabulario (Etapa 2) ---
const vocab = html.match(/<section id="screen-vocabulary"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
const dialogOf = (id) => html.match(new RegExp(`<dialog id="${id}"[^>]*>([\\s\\S]*?)</dialog>`))?.[1];
const hasLabelFor = (id) => new RegExp(`<label for="${id}"[^>]*>[^<]+</label>`).test(html);

test('Vocabulario tiene buscador y filtros con etiqueta', () => {
  assert.match(vocab, /<input type="search" id="vocab-search"/);
  for (const id of ['vocab-search', 'vocab-category', 'vocab-gender']) assert.ok(hasLabelFor(id), `falta label de ${id}`);
  assert.match(vocab, /<select id="vocab-category"/);
  assert.match(vocab, /<select id="vocab-gender"[\s\S]*value="m"[\s\S]*value="f"[\s\S]*value="none"/);
});

test('Vocabulario tiene los botones de añadir, importar y exportar', () => {
  assert.match(vocab, /<button type="button"[^>]*id="vocab-add"[^>]*>Añadir palabra<\/button>/);
  assert.match(vocab, /<button type="button"[^>]*id="vocab-import"[^>]*>Importar<\/button>/);
  assert.match(vocab, /<button type="button"[^>]*id="vocab-export"[^>]*>Exportar<\/button>/);
  assert.match(vocab, /<input type="file" id="vocab-file" accept="\.json,\.csv"/);
});

test('Vocabulario anuncia el contador y tiene la lista', () => {
  assert.match(vocab, /<p id="vocab-count"[^>]*role="status"/);
  assert.match(vocab, /<ul id="vocab-list"/);
  assert.match(vocab, /id="vocab-notice"[^>]*role="alert"/);
});

test('existen las ventanas de la pantalla Vocabulario', () => {
  for (const id of ['word-detail', 'word-form', 'confirm-delete', 'import-summary', 'confirm-replace', 'export-choice']) {
    assert.ok(dialogOf(id) !== undefined, `falta <dialog id="${id}">`);
  }
});

test('el formulario tiene campos con etiqueta y el género como tres opciones', () => {
  const form = dialogOf('word-form');
  for (const id of ['form-fr', 'form-es', 'form-category', 'form-example-fr', 'form-example-es']) {
    assert.match(form, new RegExp(`id="${id}"`), `falta ${id}`);
    assert.ok(hasLabelFor(id), `falta label de ${id}`);
  }
  assert.match(form, /<fieldset[\s\S]*<legend>Género<\/legend>/);
  for (const value of ['m', 'f', '']) assert.match(form, new RegExp(`type="radio" name="gender" value="${value}"`));
  assert.match(form, /<datalist id="category-options">/);
});
