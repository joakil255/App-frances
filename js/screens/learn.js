// Aprende: el repaso de hoy (acción principal y línea del día) y las lecciones en carrusel.
// Todo se pinta con textContent. refresh() recalcula desde now(); refreshIfNewDay() solo si
// cambió el día desde el último dibujo (al volver a la app pasada la medianoche).
import { todayPlan } from '../lib/today.js';
import { buildQueue } from '../lib/queue.js';
import { countDueToday } from '../lib/build-review.js';
import { nextLesson, lessonNumber, routeRows } from '../lib/lesson-route.js';
import { localDate } from '../lib/dates.js';
import { MESSAGES } from '../lib/messages.js';

const $ = (selector, root = document) => root.querySelector(selector);
const LEVELS = ['A1', 'A2'];

function el(tag, { text, className, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}
const space = () => document.createTextNode(' '); // separa las partes del nombre accesible

// Baldosa de una lección: enlace si se puede abrir; si no (planificada o sin cargar), texto
function lessonTile(row) {
  const children = [
    el('span', { className: 'lesson-top' }, [
      el('span', { className: `build-station build-station-${row.kind}`, text: row.kind === 'done' ? '✓' : '', attrs: { 'aria-hidden': 'true' } }),
      el('span', { className: 'lesson-number', text: `Lección ${row.number}` }),
    ]),
    space(), el('span', { className: 'lesson-title', text: row.title }),
    space(), el('span', { className: 'lesson-state', text: row.stateText }),
  ];
  if (row.hasReview) {
    children.push(space(), el('span', { className: 'lesson-review' }, [document.createTextNode('Tiene partes '), el('span', { className: 'tag-review', text: 'REVISAR' })]));
  }
  if (!row.href) {
    return el('li', {}, [el('p', { className: `lesson-tile tile${row.kind === 'planned' ? ' planned' : ''}` }, children)]);
  }
  const attrs = { href: row.href };
  if (row.current) attrs['aria-current'] = 'step';
  return el('li', {}, [el('a', { className: 'lesson-tile tile', attrs }, children)]);
}

// Lleva el carrusel a la lección de ahora sin animación y sin mover la página
function scrollToCurrent(list) {
  const current = $('[aria-current="step"]', list);
  list.scrollLeft = current ? current.parentElement.offsetLeft - parseFloat(getComputedStyle(list).paddingLeft) : 0;
}

// getLessons(): las lecciones, o null si no se pudieron cargar (Aprende se crea cuando ya se sabe)
export function initLearn({ wordStore, studyStore, buildStore, getLessons, now = () => new Date() }) {
  const tile = $('#screen-learn .today');
  const notice = $('#learn-notice');
  const main = $('#today-main');
  const action = $('#today-action');
  const followUp = $('#today-next');
  const more = $('#today-more');
  const stations = [...document.querySelectorAll('#screen-learn [data-station]')];
  const lessonsTitle = $('#screen-learn .learn-title');
  let renderedDay = null; // día del último dibujo

  function renderToday(lessons, today) {
    const words = wordStore.getWords();
    const { cards, settings } = studyStore.getState();
    const build = buildStore.getState();
    const entries = lessons ?? [];
    const next = nextLesson(entries, build.progress);
    const plan = todayPlan({
      hasWords: words.length > 0,
      wordsDue: buildQueue({ words, cards, settings, today }).length,
      // Sin lecciones todavía solo se cuentan las frases propias
      sentencesDue: countDueToday({ cards: build.cards, lessons: entries, algorithm: settings.algorithm, today }),
      lesson: next ? { id: next.id, number: lessonNumber(entries, next.id), title: next.lesson.title } : null,
      lessonsReady: lessons !== null,
    });
    main.textContent = plan.title;
    plan.stations.forEach((station, i) => {
      const item = stations[i];
      item.dataset.state = station.state;
      if (station.state === 'current') item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      $('.stop-text', item).textContent = station.text;
    });
    action.hidden = plan.action === null;
    if (plan.action) {
      action.textContent = plan.action.text;
      action.href = plan.action.href;
    }
    followUp.textContent = plan.followUp;
    more.hidden = !plan.showMore;
    tile.hidden = false; // llega oculto hasta el primer dibujo
  }

  // El aviso de siempre cuando el índice de lecciones no se pudo leer
  function renderNotice(lessons) {
    notice.hidden = lessons !== null;
    if (lessons !== null) {
      notice.replaceChildren();
      return;
    }
    const { title, text } = MESSAGES.lessonsUnavailable;
    notice.replaceChildren(el('strong', { text: title }), el('span', { text: ` ${text}` }));
  }

  function renderLessons(lessons) {
    const rows = routeRows(lessons ?? [], buildStore.getState().progress);
    // Táctil: deslizar; ratón o teclado: flechas o barra
    const touch = window.matchMedia('(pointer: coarse)').matches;
    for (const level of LEVELS) {
      const id = level.toLowerCase();
      const tiles = rows.filter((row) => row.level === level).map(lessonTile);
      const list = $(`#learn-route-${id}`);
      const hint = $(`#learn-hint-${id}`);
      list.replaceChildren(...tiles);
      // Un nivel sin lecciones no se muestra; con una sola no hay nada que deslizar
      for (const node of [$(`#learn-level-${id}`), list]) node.hidden = tiles.length === 0;
      hint.hidden = tiles.length < 2;
      const count = `las ${tiles.length} lecciones de ${level}`;
      const text = touch ? `Desliza para ver ${count}.` : `Usa las flechas o la barra para ver ${count}.`;
      hint.textContent = tiles.length < 2 ? '' : text;
      if (tiles.length > 0) scrollToCurrent(list);
    }
    lessonsTitle.hidden = rows.length === 0;
  }

  function refresh() {
    const lessons = getLessons();
    renderedDay = localDate(now());
    renderToday(lessons, renderedDay);
    renderNotice(lessons);
    renderLessons(lessons);
  }

  // Un cambio rápido de app no redibuja (el carrusel conserva el foco y su posición)
  function refreshIfNewDay() {
    if (localDate(now()) !== renderedDay) refresh();
  }

  return { refresh, refreshIfNewDay };
}
