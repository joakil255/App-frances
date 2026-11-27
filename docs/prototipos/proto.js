// Comportamiento mínimo de los prototipos (no es código de la app):
// cambiar de pantalla, cambiar la situación de ejemplo y el tema.
/* exported LESSONS, el */ // los usa el script de cada prototipo

const SCREENS = ['aprende', 'practica', 'progreso'];
const TITLES = { aprende: 'Aprende', practica: 'Practica', progreso: 'Progreso' };

// Situaciones del repaso de hoy, en el orden acordado: palabras, frases, lección
const SITUATIONS = {
  palabras: {
    main: '12 palabras te esperan',
    action: 'Repasar 12 palabras',
    next: 'Después: 3 frases y la lección 7, «Los adjetivos».',
    steps: ['current', 'todo', 'todo'],
    stepText: ['12 pendientes', '3 pendientes', 'Lección 7'],
    goal: 'Te quedan 12 palabras y 3 frases por repasar.', goalDone: 'Llevas 18 respuestas hoy.', pct: 40,
    study: '12 para repasar y 5 nuevas',
  },
  frases: {
    main: '3 frases te esperan',
    action: 'Repasar 3 frases',
    next: 'Tus palabras ya están al día. Después: la lección 7, «Los adjetivos».',
    steps: ['done', 'current', 'todo'],
    stepText: ['Al día', '3 pendientes', 'Lección 7'],
    goal: 'Te quedan 3 frases por repasar.', goalDone: 'Llevas 30 respuestas hoy.', pct: 85,
    study: 'Al día y 5 nuevas',
  },
  leccion: {
    main: 'Tu repaso de hoy está completo',
    action: 'Continuar: Lección 7 · Los adjetivos',
    next: 'Tus palabras y tus frases están al día.',
    steps: ['done', 'done', 'current'],
    stepText: ['Al día', 'Al día', 'Lección 7'],
    goal: 'Repaso de hoy completado. No te queda nada pendiente.', goalDone: 'Llevas 33 respuestas hoy.', pct: 100,
    study: 'Al día y 5 nuevas',
  },
  fin: {
    main: 'Tu repaso de hoy está completo',
    action: null,
    next: 'Completaste todas las lecciones disponibles. Mañana tendrás más repaso.',
    steps: ['done', 'done', 'done'],
    stepText: ['Al día', 'Al día', 'Terminadas'],
    goal: 'Repaso de hoy completado. No te queda nada pendiente.', goalDone: 'Llevas 33 respuestas hoy.', pct: 100,
    study: 'Al día y 5 nuevas',
  },
};

// Lecciones reales de data/lessons/fr/index.json; el avance es de ejemplo
const LESSON_TITLES = {
  A1: ['La frase básica', 'Être, avoir, c\'est, il y a', 'Los artículos', 'Verbos en -er en presente', 'La negación',
    'Preguntas simples', 'Los adjetivos', 'Aller, faire y el futuro próximo', 'Querer, poder y deber',
    'Posesivos y demostrativos', 'Verbos pronominales', 'El imperativo', 'Venir de / il faut + infinitivo',
    'Preposiciones de lugar y de tiempo', 'Conectores: et, ou, mais, parce que, pour'],
  A2: ['Passé composé con avoir', 'Passé composé con être', 'Pronombres de complemento directo (le, la, les)',
    'Los pronombres y / en', 'El imperfecto (iniciación)', 'El futuro simple', 'Comparativo y superlativo',
    'Qui, que, où para unir frases', 'Ortografía avanzada'],
};
const LESSONS = Object.entries(LESSON_TITLES).flatMap(([level, titles]) => titles.map((title, i) => {
  const n = i + 1;
  let state = 'todo';
  if (level === 'A1' && n <= 6) state = 'done';
  else if (level === 'A1' && n === 7) state = 'current';
  else if ((level === 'A1' && n >= 11) || (level === 'A2' && n >= 5)) state = 'planned';
  const text = { done: `Completada · ${n + 17}/11/2026`, current: 'En curso: 4 de 10', todo: 'Sin empezar', planned: 'Próximamente' }[state];
  return { level, n, title, state, text };
}));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function show(id, moveFocus) {
  for (const s of SCREENS) $(`#${s}`).hidden = s !== id;
  for (const tab of $$('.tab')) {
    if (tab.getAttribute('href') === `#${id}`) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  document.title = `${TITLES[id]} · prototipo`;
  // El foco va al título para que el lector de pantalla anuncie dónde estás
  if (moveFocus) $(`#${id} h1`).focus();
  window.scrollTo(0, 0);
}
function route(moveFocus) {
  const id = location.hash.slice(1);
  show(SCREENS.includes(id) ? id : 'aprende', moveFocus);
}
window.addEventListener('hashchange', () => route(true));
route(false);

function setSituation(key) {
  const s = SITUATIONS[key];
  $('[data-today-main]').textContent = s.main;
  $('[data-today-next]').textContent = s.next;
  const action = $('[data-today-action]');
  action.hidden = !s.action;
  if (s.action) action.textContent = s.action;
  const more = $('[data-today-more]');
  if (more) more.hidden = Boolean(s.action);
  $$('[data-step]').forEach((step, i) => {
    step.dataset.state = s.steps[i];
    // Solo la estación de ahora lleva «Ahora:»; el ✓ y el texto dicen lo hecho
    $('[data-step-text]', step).textContent = s.steps[i] === 'current' ? `Ahora: ${s.stepText[i]}` : s.stepText[i];
    if (s.steps[i] === 'current') step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  });
  $('[data-goal]').textContent = s.goal;
  $('[data-goal-done]').textContent = s.goalDone;
  $('[data-goal-bar]').style.width = `${s.pct}%`;
  $('[data-study-count]').textContent = s.study;
}
$('#situation').addEventListener('change', (e) => setSituation(e.target.value));
setSituation($('#situation').value);

$('#theme').addEventListener('change', (e) => {
  if (e.target.value === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = e.target.value;
});

// En el prototipo los botones no llevan a ningún sitio: lo dicen en vez de no hacer nada
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-demo]');
  if (!target) return;
  e.preventDefault();
  $('#demo-status').textContent = `En la app, esto abriría: ${target.dataset.demo}.`;
});
