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

// --- Pantalla Estudiar (Etapa 3) ---
const study = html.match(/<section id="screen-study"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
// Contenido de un elemento con ese id (hasta su etiqueta de cierre del mismo tipo, sin anidar el mismo tipo)
const elementById = (source, tag, id) => source.match(new RegExp(`<${tag} [^>]*id="${id}"[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];

test('Estudiar tiene el resumen del día con sus botones', () => {
  assert.match(study, /id="study-due"/);
  assert.match(study, /id="study-new"/);
  assert.match(study, /<button type="button"[^>]*id="study-start"[^>]*>Empezar<\/button>/);
  assert.match(study, /<button type="button"[^>]*id="study-settings-open"[^>]*>Ajustes del estudio<\/button>/);
});

test('Estudiar tiene la tarjeta con anverso, reverso y botón de altavoz', () => {
  const card = study.match(/<article [^>]*id="study-card"[^>]*>([\s\S]*?)<\/article>/)?.[1];
  assert.ok(card, 'falta <article id="study-card">');
  assert.match(card, /id="study-front"/);
  assert.match(card, /id="study-back"/);
  assert.match(card, /<button type="button" class="listen-button"[^>]*aria-label="Oír en francés"/);
});

test('Estudiar tiene «Mostrar respuesta» y los cuatro botones de respuesta', () => {
  assert.match(study, /<button type="button"[^>]*id="study-reveal"[^>]*>\s*Mostrar respuesta/);
  const names = { again: 'Otra vez', hard: 'Difícil', good: 'Bien', easy: 'Fácil' };
  for (const [answer, name] of Object.entries(names)) {
    assert.match(study, new RegExp(`<button type="button"[^>]*data-answer="${answer}"[^>]*>[\\s\\S]*?${name}`), `falta ${answer}`);
  }
  assert.match(study, /<button type="button" class="button button-primary study-answer" data-answer="good"/);
});

test('Estudiar tiene el fin de sesión y un aviso anunciable', () => {
  assert.match(study, /id="study-done"/);
  assert.match(study, /Terminaste por hoy/);
  assert.match(study, /id="study-notice"[^>]*role="alert"/);
  assert.match(study, /Añade palabras en Vocabulario para empezar\./);
});

test('la ventana de ajustes del estudio tiene dirección, algoritmo y nuevas por día', () => {
  const dialog = dialogOf('study-settings');
  assert.ok(dialog !== undefined, 'falta <dialog id="study-settings">');
  assert.match(dialog, /<fieldset[\s\S]*?<legend>Dirección<\/legend>/);
  assert.match(dialog, /<fieldset[\s\S]*?<legend>Algoritmo<\/legend>/);
  for (const value of ['fr-es', 'es-fr']) assert.match(dialog, new RegExp(`type="radio" name="direction" value="${value}"`));
  for (const value of ['sm2', 'leitner']) assert.match(dialog, new RegExp(`type="radio" name="algorithm" value="${value}"`));
  assert.match(dialog, /<input type="number" id="settings-new-per-day"[^>]*min="0" max="100"/);
  assert.ok(hasLabelFor('settings-new-per-day'), 'falta label de settings-new-per-day');
  for (const id of ['settings-direction-fr-es', 'settings-direction-es-fr', 'settings-algorithm-sm2', 'settings-algorithm-leitner']) {
    assert.ok(hasLabelFor(id), `falta label de ${id}`);
  }
  assert.ok(elementById(html, 'p', 'settings-error-new-per-day') !== undefined, 'falta el error de nuevas por día');
});

// --- Pantalla Quiz (Etapa 4) ---
const quiz = html.match(/<section id="screen-quiz"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
const tagWithId = (source, id) => source.match(new RegExp(`<[a-z][a-z0-9]* [^>]*id="${id}"[^>]*>`))?.[0];

test('Quiz tiene un aviso anunciable y el inicio con los tres modos', () => {
  assert.match(quiz, /id="quiz-notice"[^>]*role="alert"/);
  assert.match(quiz, /id="quiz-start"/);
  const names = { choice: 'Opción múltiple', write: 'Escribir en francés', dictation: 'Dictado' };
  for (const [mode, name] of Object.entries(names)) {
    const button = quiz.match(new RegExp(`<button type="button"[^>]*data-mode="${mode}"[^>]*>[\\s\\S]*?</button>`))?.[0];
    assert.ok(button, `falta el botón ${mode}`);
    assert.ok(button.includes(name), `falta el nombre ${name}`);
    const reasonId = button.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(reasonId, `${mode} sin aria-describedby`);
    assert.ok(tagWithId(quiz, reasonId), `falta el motivo ${reasonId}`);
  }
  assert.match(quiz, /<input type="checkbox" id="quiz-require-accents"/);
  assert.ok(hasLabelFor('quiz-require-accents'), 'falta label de quiz-require-accents');
});

test('Quiz tiene la pregunta con progreso, tarjeta, opciones y campo de respuesta', () => {
  for (const id of ['quiz-question', 'quiz-progress', 'quiz-card', 'quiz-options', 'quiz-answer-form']) {
    assert.ok(tagWithId(quiz, id), `falta #${id}`);
  }
  const card = quiz.match(/<article [^>]*id="quiz-card"[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? '';
  assert.match(card, /<button type="button" class="listen-button"[^>]*aria-label="Oír en francés"/);
  assert.match(card, />Oír<\/button>/);
  assert.match(card, />Oír lento<\/button>/);
  const input = tagWithId(quiz, 'quiz-answer');
  assert.ok(input, 'falta #quiz-answer');
  for (const attr of ['type="text"', 'lang="fr"', 'autocapitalize="none"', 'autocorrect="off"', 'spellcheck="false"',
    'autocomplete="off"', 'enterkeyhint="done"']) {
    assert.ok(input.includes(attr), `#quiz-answer sin ${attr}`);
  }
  assert.ok(hasLabelFor('quiz-answer'), 'falta label de quiz-answer');
  assert.match(quiz, /<button type="submit" class="button button-primary"[^>]*>Comprobar<\/button>/);
  assert.match(quiz, /<button type="button"[^>]*id="quiz-skip"[^>]*>No lo sé<\/button>/);
});

test('Quiz tiene la respuesta inmediata y el resumen', () => {
  assert.ok(tagWithId(quiz, 'quiz-feedback'), 'falta #quiz-feedback');
  assert.match(tagWithId(quiz, 'quiz-feedback-title') ?? '', /tabindex="-1"/);
  assert.match(quiz, /<button type="button"[^>]*id="quiz-next"[^>]*>Siguiente<\/button>/);
  assert.ok(tagWithId(quiz, 'quiz-summary'), 'falta #quiz-summary');
  assert.match(tagWithId(quiz, 'quiz-summary-title') ?? '', /tabindex="-1"/);
  assert.match(quiz, /<ul [^>]*id="quiz-failed"/);
  assert.match(quiz, /<button type="button"[^>]*id="quiz-again"[^>]*>Otro quiz<\/button>/);
});

// --- Pantalla Progreso (Etapa 5) ---
const progress = html.match(/<section id="screen-progress"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';

test('Progreso tiene aviso, estado vacío y ya no el texto de relleno', () => {
  assert.match(progress, /<div id="progress-notice" class="notice" role="alert" hidden><\/div>/);
  assert.match(progress, new RegExp('<p id="progress-empty"[^>]*hidden>Aquí verás tu racha y tus respuestas de cada día '
    + 'cuando respondas tu primera tarjeta en Estudiar o en el Quiz\\.</p>'));
  assert.ok(!progress.includes('Aquí verás cuánto has avanzado.'));
});

test('Progreso tiene la racha y el gráfico con su tabla de datos', () => {
  for (const id of ['progress-activity', 'progress-streak', 'progress-streak-number', 'progress-streak-label',
    'progress-today', 'progress-chart', 'progress-table-body', 'progress-accuracy']) {
    assert.ok(tagWithId(progress, id), `falta #${id}`);
  }
  assert.match(progress, /<h2[^>]*>Respuestas de los últimos 14 días<\/h2>/);
  const details = progress.match(/<details class="progress-details">\s*<summary>Ver los datos día por día<\/summary>([\s\S]*?)<\/details>/);
  assert.ok(details, 'falta el desplegable de datos');
  assert.match(details[1], /<th scope="col">Día<\/th>/);
  assert.match(details[1], /<th scope="col">Respuestas<\/th>/);
});

test('Progreso tiene el acierto de Estudiar y Quiz', () => {
  assert.match(progress, /<h2[^>]*>Acierto en los últimos 30 días<\/h2>/);
  for (const kind of ['study', 'quiz']) {
    assert.ok(tagWithId(progress, `progress-${kind}-percent`), `falta #progress-${kind}-percent`);
    assert.ok(tagWithId(progress, `progress-${kind}-detail`), `falta #progress-${kind}-detail`);
  }
  assert.match(progress, /<dt[^>]*>Estudiar<\/dt>/);
  assert.match(progress, /<dt[^>]*>Quiz<\/dt>/);
});

test('Progreso tiene «Tus palabras» con los tres estados y la lista de dominadas', () => {
  assert.match(progress, /<h2[^>]*>Tus palabras<\/h2>/);
  for (const id of ['progress-words', 'progress-words-empty', 'progress-new', 'progress-learning', 'progress-mastered-count',
    'progress-mastered', 'progress-mastered-summary', 'progress-mastered-list', 'progress-mastered-none']) {
    assert.ok(tagWithId(progress, id), `falta #${id}`);
  }
  assert.match(progress, /<details id="progress-mastered" class="progress-details"/);
  assert.match(progress, /<div class="progress-states-bar" aria-hidden="true">/);
});
