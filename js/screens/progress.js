// Pantalla Progreso: racha, respuestas por día, acierto y palabras por estado.
// Solo lee: todo se calcula con stats.js (y today.js para el objetivo) cada vez que se muestra.
// Todo texto va con textContent.
import { resolveRoute } from '../lib/router.js';
import { StorageError } from '../lib/storage.js';
import { storageMessage } from '../lib/messages.js';
import { localDate } from '../lib/dates.js';
import { buildQueue } from '../lib/queue.js';
import { buildReviewQueue } from '../lib/build-review.js';
import { dailyGoal } from '../lib/today.js';
import { studiedDates, streak, dailyCounts, accuracy, dayLabel, chartSummary, wordStates } from '../lib/stats.js';

const $ = (selector, root = document) => root.querySelector(selector);
const SVG_NS = 'http://www.w3.org/2000/svg';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const tableDate = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

// Medidas del gráfico en unidades del viewBox (escala al ancho disponible)
const COLUMN = 22;
const BAR_WIDTH = 14;
const BAR_TOP = 22;
const BASELINE = 100;
const TRACK_Y = 112;
const LABEL_Y = 138;
const HEIGHT = 146;

const EMPTY_RATE = {
  study: 'Todavía no estudiaste en los últimos 30 días.',
  quiz: 'Todavía no hiciste ningún quiz en los últimos 30 días.',
};
const RATE_DETAIL = {
  study: 'de acierto en Estudiar (30 días)',
  quiz: 'de acierto en los últimos 30 días.',
};

function svgEl(tag, attributes, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

// Barras sobre una «línea de metro»: estación llena si ese día estudiaste, hueca si no
function buildChart(days, today) {
  const width = days.length * COLUMN;
  const max = Math.max(0, ...days.map((d) => d.count));
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${HEIGHT}`, role: 'img', 'aria-label': chartSummary(days) });
  svg.append(svgEl('line', { class: 'chart-track', x1: 0, y1: TRACK_Y, x2: width, y2: TRACK_Y }));
  days.forEach(({ date, count }, i) => {
    const center = i * COLUMN + COLUMN / 2;
    if (count > 0) {
      const height = Math.max(2, Math.round(((BASELINE - BAR_TOP) * count) / max));
      svg.append(svgEl('rect', { class: 'chart-bar', x: center - BAR_WIDTH / 2, y: BASELINE - height, width: BAR_WIDTH, height }));
      svg.append(svgEl('text', { class: 'chart-count', x: center, y: BASELINE - height - 5 }, String(count)));
    }
    svg.append(svgEl('circle', { class: `chart-station${count > 0 ? ' chart-station-studied' : ''}`, cx: center, cy: TRACK_Y, r: count > 0 ? 7 : 6 }));
    const isToday = date === today;
    svg.append(svgEl('text', { class: `chart-day${isToday ? ' chart-day-today' : ''}`, x: center, y: LABEL_Y }, dayLabel(date, today)));
  });
  return svg;
}

function tableRow(date, count, today) {
  const [year, month, day] = date.split('-').map(Number);
  const label = tableDate.format(new Date(Date.UTC(year, month - 1, day)));
  const row = document.createElement('tr');
  const cells = [date === today ? `Hoy, ${label}` : label, String(count)];
  for (const text of cells) {
    const cell = document.createElement('td');
    cell.textContent = text;
    row.append(cell);
  }
  return row;
}

function masteredItem(word) {
  const item = document.createElement('li');
  const fr = document.createElement('span');
  fr.className = 'progress-mastered-fr';
  fr.lang = 'fr';
  fr.textContent = word.fr;
  const es = document.createElement('span');
  es.className = 'progress-mastered-es';
  es.textContent = word.es;
  item.append(fr, es);
  return item;
}

// getLessons(): las lecciones, o null si no se pudieron cargar (igual que en Aprende)
export async function initProgress({ wordStore, studyStore, buildStore, getLessons, now = () => new Date() }) {
  const notice = $('#progress-notice');

  function showNotice(title, text) {
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = ` ${text}`;
    notice.replaceChildren(strong, span);
    notice.hidden = false;
  }
  function storageProblem(error) {
    if (!(error instanceof StorageError)) throw error;
    const { title, text } = storageMessage(error);
    showNotice(title, text);
  }

  function renderStreak(history, today) {
    const { days, studiedToday } = streak(history, today);
    $('#progress-streak-number').textContent = days === 0 ? 'Sin racha' : String(days);
    $('#progress-streak-label').textContent = days === 0
      ? 'Estudia hoy para empezar una nueva.'
      : (days === 1 ? 'día seguido' : 'días seguidos');
    const todayBox = $('#progress-today');
    if (studiedToday) {
      const check = document.createElement('span');
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      todayBox.replaceChildren(check, 'Hoy ya estudiaste');
    } else {
      todayBox.replaceChildren('Hoy todavía no estudiaste');
    }
  }

  function renderDays(history, today) {
    const days = dailyCounts(history, today);
    $('#progress-chart').replaceChildren(buildChart(days, today));
    $('#progress-table-body').replaceChildren(...days.map(({ date, count }) => tableRow(date, count, today)));
  }

  function renderAccuracy(history, today) {
    const rates = accuracy(history, today);
    for (const kind of ['study', 'quiz']) {
      const { percent } = rates[kind];
      $(`#progress-${kind}-percent`).textContent = percent === null ? '—' : `${percent}\u00A0%`;
      $(`#progress-${kind}-detail`).textContent = percent === null ? EMPTY_RATE[kind] : RATE_DETAIL[kind];
    }
    // Sin quiz, la frase es solo «Todavía no hiciste…»: sin «En el Quiz, —»
    $('#progress-quiz-lead').hidden = rates.quiz.percent === null;
    $('#progress-quiz-percent').hidden = rates.quiz.percent === null;
  }

  function renderWords(words, cards, algorithm) {
    $('#progress-words-empty').hidden = words.length > 0;
    $('#progress-words-go-row').hidden = words.length > 0;
    $('#progress-words').hidden = words.length === 0;
    if (words.length === 0) return;
    const states = wordStates({ words, cards, algorithm });
    const parts = { new: states.new, learning: states.learning, mastered: states.mastered };
    for (const [name, count] of Object.entries(parts)) {
      const segment = $(`.progress-states-bar .progress-state-${name}`);
      segment.style.flexBasis = `${(count * 100) / words.length}%`;
      segment.hidden = count === 0;
    }
    $('#progress-new').textContent = plural(states.new, 'nueva', 'nuevas');
    $('#progress-learning').textContent = `${states.learning} en aprendizaje`;
    $('#progress-mastered-count').textContent = plural(states.mastered, 'dominada', 'dominadas');
    const count = states.mastered;
    $('#progress-mastered').hidden = count === 0;
    $('#progress-mastered-none').hidden = count > 0;
    $('#progress-mastered-summary').textContent = count === 1 ? 'Ver la palabra dominada' : `Ver las ${count} palabras dominadas`;
    $('#progress-mastered-list').replaceChildren(...states.masteredWords.map(masteredItem));
  }

  // Las mismas colas que Aprende (mismos almacenes y mismo día), para que ambas pantallas coincidan
  function renderGoal(words, today) {
    const { history, cards, settings } = studyStore.getState();
    const build = buildStore.getState();
    const goal = dailyGoal({
      wordQueue: buildQueue({ words, cards, settings, today }),
      sentenceQueue: buildReviewQueue({ cards: build.cards, lessons: getLessons() ?? [], algorithm: settings.algorithm, today }),
      history,
      sentenceCards: build.cards,
      today,
    });
    $('#goal-text').textContent = goal.text;
    $('#goal-answers').textContent = goal.answersText;
    $('#goal-fill').style.width = `${goal.ratio * 100}%`;
  }

  // «Hoy» se calcula en cada llamada: si pasó la medianoche, entra el nuevo día
  function render() {
    const today = localDate(now());
    const { history, cards, settings } = studyStore.getState();
    const hasHistory = studiedDates(history).length > 0;
    $('#progress-empty').hidden = hasHistory;
    $('#progress-activity').hidden = !hasHistory;
    if (hasHistory) {
      renderStreak(history, today);
      renderDays(history, today);
      renderAccuracy(history, today);
    }
    const words = wordStore.getWords();
    renderGoal(words, today);
    renderWords(words, cards, settings.algorithm);
  }

  // Al entrar en Progreso se recalcula (puede haber respuestas nuevas o haber cambiado el día)
  window.addEventListener('hashchange', () => {
    if (resolveRoute(location.hash) === 'progress') render();
  });

  try {
    await studyStore.load();
  } catch (error) {
    storageProblem(error);
  }
  render();
  studyStore.watchExternalChanges(window, render);
  wordStore.watchExternalChanges(window, render);
  // app.js la llama al volver a la app y cuando cambian las frases
  return { refresh: render };
}
