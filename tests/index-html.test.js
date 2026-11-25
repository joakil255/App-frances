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

test('la barra dice «Palabras» (antes «Vocabulario») y lleva a #/vocabulario', () => {
  const nav = html.match(/<nav aria-label="Principal"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.match(nav, /href="#\/vocabulario"><span class="line-dot" aria-hidden="true"><\/span>Palabras<\/a>/);
  assert.ok(!nav.includes('Vocabulario'));
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

test('el reverso tiene un botón para oír la frase de ejemplo, aparte del de la palabra', () => {
  const back = study.match(/id="study-back"[\s\S]*?<\/article>/)?.[0];
  assert.ok(back, 'falta #study-back');
  const example = back.match(/<div class="study-example"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? '';
  const button = example.match(/<button [^>]*data-listen-example[^>]*>/)?.[0];
  assert.ok(button, 'falta el botón data-listen-example dentro de la frase de ejemplo');
  assert.match(button, /type="button"/);
  assert.match(button, /class="listen-button"/);
  assert.match(button, /aria-label="Oír la frase de ejemplo en francés"/);
  // No debe confundirse con el botón de la palabra (atajo O) ni con las respuestas
  assert.doesNotMatch(button, /data-listen(?!-example)|data-answer|aria-keyshortcuts/);
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
  assert.match(study, /Añade palabras en Palabras para empezar\./);
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

test('Conversar tiene un enlace para saltar al mensaje, antes del registro', () => {
  const link = chat.indexOf('href="#chat-message"');
  assert.ok(link !== -1, 'falta el enlace a #chat-message');
  assert.match(chat.slice(link - 40, link + 120), /class="skip-link"[^>]*>Ir a tu mensaje<\/a>/);
  assert.ok(link < chat.indexOf('id="chat-log"'), 'el enlace debe ir antes de #chat-log');
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

// --- Mazo A1 (Etapa 6) ---
test('Vocabulario tiene el botón para añadir el mazo A1 junto a Importar y Exportar', () => {
  const actions = html.match(/<div class="vocab-actions">([\s\S]*?)<\/div>/)?.[1] ?? '';
  assert.match(actions, /<button type="button" class="button button-secondary" id="vocab-deck">Añadir 100 palabras A1<\/button>/);
});

// --- Inicio: copia de seguridad (Etapa 7) ---
const home = html.match(/<section id="screen-home"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';

test('Inicio mantiene su frase y tiene la copia de seguridad con avisos', () => {
  assert.match(home, /<span lang="fr">Bonjour\.<\/span> Aquí verás cada día lo que te toca repasar\./);
  assert.match(home, /<div id="home-notice" class="notice" role="alert" hidden><\/div>/);
  assert.match(home, /<p id="home-status" class="vocab-message" role="status"><\/p>/);
  assert.match(home, /<h2[^>]*>Copia de seguridad<\/h2>/);
  assert.ok(home.includes('Guarda en un archivo tus palabras, tu progreso y tu historial. '
    + 'Si se borran los datos del navegador, con ese archivo lo recuperas todo.'));
  assert.match(home, /<button type="button" class="button button-primary" id="backup-save">Guardar copia<\/button>/);
  assert.match(home, /<button type="button" class="button button-secondary" id="backup-restore">Restaurar copia<\/button>/);
  assert.match(home, /<input type="file" id="backup-file" accept="\.json,application\/json" hidden>/);
});

test('la ventana de confirmar la restauración tiene título, texto y los dos botones', () => {
  const dialog = html.match(/<dialog id="restore-confirm" class="dialog" aria-labelledby="restore-title">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, 'falta #restore-confirm');
  assert.match(dialog, /<h2 id="restore-title" class="dialog-title"><\/h2>/);
  assert.match(dialog, /class="restore-text"/);
  assert.match(dialog, /<button type="button" class="button button-secondary" data-action="close">Cancelar<\/button>/);
  assert.match(dialog, /<button type="button" class="button button-danger" data-action="confirm">Restaurar<\/button>/);
});

// --- Mejora A de la auditoría: teclado móvil en los campos en francés de Vocabulario ---
test('los campos en francés del formulario no ponen mayúsculas ni corrigen al español', () => {
  const fr = tagWithId(html, 'form-fr');
  const example = tagWithId(html, 'form-example-fr');
  for (const attr of ['lang="fr"', 'autocapitalize="none"', 'autocorrect="off"', 'spellcheck="false"']) {
    assert.ok(fr.includes(attr), `#form-fr sin ${attr}`);
  }
  for (const attr of ['lang="fr"', 'autocapitalize="sentences"', 'autocorrect="off"', 'spellcheck="false"']) {
    assert.ok(example.includes(attr), `#form-example-fr sin ${attr}`);
  }
});

// --- Pantalla Conversar (Etapa 8) ---
const chat = html.match(/<section id="screen-chat"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';

test('Conversar tiene aviso, registro de mensajes anunciable y mensajes restantes', () => {
  assert.match(chat, /<div id="chat-notice" class="notice" role="alert" hidden><\/div>/);
  const log = tagWithId(chat, 'chat-log');
  assert.ok(log, 'falta #chat-log');
  assert.ok(log.includes('aria-live="polite"'), '#chat-log sin aria-live="polite"');
  const remaining = tagWithId(chat, 'chat-remaining');
  assert.ok(remaining, 'falta #chat-remaining');
  assert.ok(remaining.includes('role="status"'), '#chat-remaining sin role="status"');
  assert.ok(remaining.includes('hidden'), '#chat-remaining debe empezar oculto');
});

test('Conversar tiene el campo del mensaje en francés y el botón Enviar', () => {
  const field = tagWithId(chat, 'chat-message');
  assert.ok(field, 'falta #chat-message');
  for (const attr of ['lang="fr"', 'autocapitalize="sentences"', 'autocorrect="off"', 'spellcheck="false"', 'maxlength="500"']) {
    assert.ok(field.includes(attr), `#chat-message sin ${attr}`);
  }
  assert.ok(hasLabelFor('chat-message'), 'falta label de chat-message');
  assert.match(chat, /<button type="submit" class="button button-primary[^"]*" id="chat-send">Enviar<\/button>/);
});

test('Conversar tiene el selector de nivel A1.1 y A1.2', () => {
  assert.match(chat, /<fieldset[\s\S]*?<legend>[^<]*Nivel[^<]*<\/legend>/);
  for (const [value, id] of [['A1.1', 'chat-level-a11'], ['A1.2', 'chat-level-a12']]) {
    assert.match(chat, new RegExp(`type="radio" name="level" value="${value.replace('.', '\\.')}" id="${id}"`));
    assert.ok(new RegExp(`<label for="${id}"[^>]*>${value.replace('.', '\\.')}</label>`).test(chat), `falta label de ${id}`);
  }
});

test('Conversar tiene «Conversación nueva» con su ventana de confirmación', () => {
  assert.match(chat, /<button type="button" class="button button-secondary" id="chat-new"[^>]*>Conversación nueva<\/button>/);
  const dialog = html.match(/<dialog id="chat-confirm-new" class="dialog" aria-labelledby="chat-new-title">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, 'falta #chat-confirm-new');
  assert.match(dialog, /<h2 id="chat-new-title" class="dialog-title">[^<]+<\/h2>/);
  assert.match(dialog, /<button type="button" class="button button-secondary" data-action="close">Cancelar<\/button>/);
  assert.match(dialog, /<button type="button" class="button button-danger" data-action="confirm">[^<]+<\/button>/);
});

test('la ventana del código de acceso tiene su campo con etiqueta', () => {
  const dialog = html.match(/<dialog id="chat-code" class="dialog" aria-labelledby="chat-code-title">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, 'falta #chat-code');
  assert.match(dialog, /<h2 id="chat-code-title" class="dialog-title">Código de acceso<\/h2>/);
  const input = tagWithId(dialog, 'chat-code-input');
  assert.ok(input, 'falta #chat-code-input');
  for (const attr of ['type="password"', 'autocomplete="off"']) assert.ok(input.includes(attr), `#chat-code-input sin ${attr}`);
  assert.ok(hasLabelFor('chat-code-input'), 'falta label de chat-code-input');
  assert.match(dialog, /<button type="button" class="button button-secondary" data-action="close">Cancelar<\/button>/);
  assert.match(dialog, /<button type="submit" class="button button-primary">[^<]+<\/button>/);
});

// --- Conversar: voz (Etapa 9) ---
test('Conversar tiene el interruptor «Escuchar primero» en las herramientas', () => {
  const tools = chat.match(/<div class="chat-tools">([\s\S]*?)<\/div>\s*<p id="chat-empty"/)?.[1] ?? '';
  const toggle = tagWithId(tools, 'chat-listen-first');
  assert.ok(toggle, 'falta #chat-listen-first en .chat-tools');
  assert.ok(toggle.startsWith('<input') && toggle.includes('type="checkbox"'), '#chat-listen-first debe ser una casilla');
  assert.match(tools, /<label for="chat-listen-first"[^>]*>Escuchar primero<\/label>/);
});

test('Conversar tiene el botón «Hablar», oculto hasta saber si hay reconocimiento', () => {
  const mic = chat.match(/<button [^>]*id="chat-mic"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(mic, 'falta #chat-mic');
  const openTag = mic[0].slice(0, mic[0].indexOf('>')); // solo la etiqueta de apertura
  for (const attr of ['type="button"', 'aria-pressed="false"', 'hidden']) assert.ok(openTag.includes(attr), `#chat-mic sin ${attr}`);
  assert.match(mic[1], />Hablar</);
});

test('Conversar tiene la línea del texto parcial, oculta y sin aria-live', () => {
  const interim = tagWithId(chat, 'chat-interim');
  assert.ok(interim, 'falta #chat-interim');
  assert.ok(interim.includes('hidden'), '#chat-interim sin hidden');
  assert.ok(!interim.includes('aria-live'), '#chat-interim no debe tener aria-live');
});

test('la ventana del aviso de privacidad tiene título, texto y los dos botones', () => {
  const dialog = html.match(/<dialog id="chat-voice-privacy" class="dialog" aria-labelledby="chat-voice-privacy-title">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, 'falta #chat-voice-privacy');
  assert.match(dialog, /<h2 id="chat-voice-privacy-title" class="dialog-title">Tu voz sale del dispositivo<\/h2>/);
  assert.ok(dialog.includes('<p>Para convertir tu voz en texto, el navegador envía el audio a su servicio de reconocimiento. En Chrome para Android es probablemente Google. Solo se envía mientras el micrófono está activo, y la app no guarda el audio.</p>'),
    'falta el texto exacto del aviso');
  assert.match(dialog, /<button type="button" class="button button-secondary" data-action="close">Cancelar<\/button>/);
  assert.match(dialog, /<button type="button" class="button button-primary" data-action="confirm">Usar el micrófono<\/button>/);
});

// --- Conversar: consultar palabras (Etapa 10) ---
test('la tarjeta de palabras es una ventana con título enlazado', () => {
  const dialog = html.match(/<dialog id="word-card" class="dialog word-card[^"]*" aria-labelledby="word-card-title">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, 'falta <dialog id="word-card"> con aria-labelledby="word-card-title"');
  assert.match(dialog, /<h2 id="word-card-title"[^>]*lang="fr"[^>]*><\/h2>/);
});

test('la tarjeta de palabras tiene «Buscando…» anunciable y un aviso de errores', () => {
  const dialog = dialogOf('word-card') ?? '';
  assert.match(dialog, /<p class="word-card-status" role="status">Buscando…<\/p>/);
  assert.match(dialog, /<div class="notice word-card-notice" role="alert" hidden><\/div>/);
});

test('la tarjeta de palabras tiene los botones Escuchar, Guardar y Cerrar', () => {
  const dialog = dialogOf('word-card') ?? '';
  assert.match(dialog, /<button type="button" class="button button-secondary chat-listen" data-action="listen"[^>]*><span aria-hidden="true">🔊<\/span><span>Escuchar<\/span><\/button>/);
  assert.match(dialog, /<button type="button" class="button button-primary word-card-save" data-action="save"[^>]*>Guardar<\/button>/);
  assert.match(dialog, /<button type="button" class="button button-secondary" data-action="close">Cerrar<\/button>/);
});

// --- Pantalla Leer (Etapa 11) ---
const reader = html.match(/<section id="screen-reader"[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? '';
const buttonWithText = (source, text) => new RegExp(`<button [^>]*>${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</button>`).test(source);

test('la barra tiene el enlace «Leer» a #/leer con su propia línea', () => {
  const nav = html.match(/<nav aria-label="Principal"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.match(nav, /<a class="nav-link line-reader" href="#\/leer"><span class="line-dot" aria-hidden="true"><\/span>Leer<\/a>/);
});

test('Leer es su propia sección con la línea marrón y el título enfocable', () => {
  assert.match(html, /<section id="screen-reader" class="screen line-reader" hidden>/);
  assert.match(reader, /<h1 class="plaque" tabindex="-1"><span class="line-dot" aria-hidden="true"><\/span>Leer<\/h1>/);
});

test('Leer tiene aviso, zona de estado anunciable y la biblioteca vacía', () => {
  assert.match(reader, /<div id="reader-notice" class="notice" role="alert" hidden><\/div>/);
  const status = tagWithId(reader, 'reader-status');
  assert.ok(status, 'falta #reader-status');
  assert.ok(status.includes('role="status"'), '#reader-status sin role="status"');
  assert.match(reader, /<p id="reader-empty" class="empty">Aquí verás tus lecturas\. Pide a Claude una historia a tu nivel\.<\/p>/);
  assert.ok(tagWithId(reader, 'reader-list'), 'falta la lista #reader-list');
});

test('Leer tiene los botones con su texto exacto', () => {
  for (const text of ['Nueva historia', 'Escuchar', 'Más lento', 'Marcar como leída', 'Aprobar', 'Descartar',
    'Borrar historia', '¿Lo entendiste? Responder 4 preguntas', 'Comprobar', 'Siguiente', 'Volver a intentar']) {
    assert.ok(buttonWithText(reader, text), `falta el botón «${text}»`);
  }
});

test('el lector tiene el título de la historia enfocable, el aviso de REVISAR y el texto en francés', () => {
  assert.match(reader, /<h2 id="reader-title" [^>]*lang="fr"[^>]*tabindex="-1"[^>]*><\/h2>/);
  assert.match(reader, /<span [^>]*class="tag-review"[^>]*>REVISAR<\/span>/);
  assert.match(reader, />Esta historia aún no está revisada\.</);
  assert.match(reader, /<div id="reader-text" class="reader-text" lang="fr"><\/div>/);
});

test('el cuestionario pregunta con botones de opción dentro de un fieldset con leyenda', () => {
  assert.match(reader, /<fieldset [^>]*id="reader-quiz-fieldset"[^>]*>\s*<legend id="reader-quiz-question"[^>]*><\/legend>/);
  assert.ok(tagWithId(reader, 'reader-quiz-options'), 'falta #reader-quiz-options');
});

test('la ventana «Nueva historia» tiene nivel, tema y «Preguntas en:» con Español marcado', () => {
  const dialog = html.match(/<dialog id="reader-new-dialog" class="dialog" aria-labelledby="reader-new-title">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, 'falta <dialog id="reader-new-dialog">');
  assert.match(dialog, /<h2 id="reader-new-title" class="dialog-title">Nueva historia<\/h2>/);
  assert.match(dialog, /<fieldset[^>]*>\s*<legend>Nivel<\/legend>/);
  for (const [value, id] of [['A1.1', 'reader-level-a11'], ['A1.2', 'reader-level-a12'], ['A2', 'reader-level-a2']]) {
    assert.match(dialog, new RegExp(`<input type="radio" name="story-level" value="${value.replace('.', '\\.')}" id="${id}"`));
    assert.ok(hasLabelFor(id), `falta label de ${id}`);
  }
  assert.match(dialog, /value="A1\.2" id="reader-level-a12" checked>/);
  const topic = tagWithId(dialog, 'reader-topic');
  assert.ok(topic, 'falta #reader-topic');
  assert.ok(topic.includes('maxlength="60"'), '#reader-topic sin maxlength="60"');
  assert.match(html, /<label for="reader-topic">Tema \(opcional\)<\/label>/);
  assert.match(dialog, /<fieldset[^>]*>\s*<legend>Preguntas en:<\/legend>/);
  assert.match(dialog, /<input type="radio" name="quiz-lang" value="es" id="reader-quiz-es" checked><label for="reader-quiz-es">Español<\/label>/);
  assert.match(dialog, /<input type="radio" name="quiz-lang" value="fr" id="reader-quiz-fr"><label for="reader-quiz-fr">Francés<\/label>/);
  assert.match(dialog, /<button type="button" class="button button-secondary" data-action="close">Cancelar<\/button>/);
  assert.match(dialog, /<button type="submit" class="button button-primary">Escribir historia<\/button>/);
});

test('la ventana de borrar una historia pide confirmación', () => {
  const dialog = html.match(/<dialog id="reader-confirm-delete" class="dialog" aria-labelledby="reader-delete-title">([\s\S]*?)<\/dialog>/)?.[1];
  assert.ok(dialog, 'falta <dialog id="reader-confirm-delete">');
  assert.match(dialog, /<h2 id="reader-delete-title" class="dialog-title">¿Borrar esta historia\?<\/h2>/);
  assert.match(dialog, /<p>No se puede deshacer\.<\/p>/);
  assert.match(dialog, /<button type="button" class="button button-secondary" data-action="close">Cancelar<\/button>/);
  assert.match(dialog, /<button type="button" class="button button-danger" data-action="confirm">Borrar<\/button>/);
});

test('el enlace de Construir frases va en un <li> solo para computador', () => {
  const nav = html.match(/<nav aria-label="Principal"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.match(nav, /<li class="nav-desktop-only"><a [^>]*href="#\/construir"[^>]*>/);
  assert.equal((nav.match(/<li>/g) ?? []).length, 7);
});
