// Pantalla Estudiar: resumen del día, una tarjeta cada vez con cuatro respuestas,
// fin de la sesión y ventana de ajustes. Todo texto del usuario va con textContent.
import { resolveRoute } from '../lib/router.js';
import { StorageError } from '../lib/storage.js';
import { MESSAGES, storageMessage, joined } from '../lib/messages.js';
import { RATES } from '../lib/speech.js';
import { localDate, addDays } from '../lib/dates.js';
import { ANSWERS, newCard, review, previewDays } from '../lib/scheduler.js';
import { buildQueue, countDueOn } from '../lib/queue.js';
import { playFrench } from './voice.js';

const DIRECTION_NAMES = { 'fr-es': 'Francés → español', 'es-fr': 'Español → francés' };
const ALGORITHM_NAMES = { sm2: 'SM-2 simplificado', leitner: 'Leitner' };
const ANSWER_NAMES = { again: 'Otra vez', hard: 'Difícil', good: 'Bien', easy: 'Fácil' };

const $ = (selector, root = document) => root.querySelector(selector);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// Cuándo vuelve la tarjeta: «hoy», «1 día», «8 días»
const whenText = (days) => (days === 0 ? 'hoy' : plural(days, 'día', 'días'));

export function initStudy({ wordStore, studyStore, synth, now = () => new Date() }) {
  const screen = $('#screen-study');
  const notice = $('#study-notice');
  const summary = $('#study-summary');
  const sessionBox = $('#study-session');
  const done = $('#study-done');
  const front = $('#study-front');
  const back = $('#study-back');
  const reveal = $('#study-reveal');
  const answers = $('#study-answers');
  const answerButtons = [...answers.querySelectorAll('[data-answer]')];
  const settingsDialog = $('#study-settings');
  const settingsForm = $('form', settingsDialog);
  const newPerDayInput = $('#settings-new-per-day');
  const newPerDayError = $('#settings-error-new-per-day');
  const settingsFormError = $('.form-error', settingsDialog);

  // null fuera de una sesión; si no, { answered, tally, current: { item, word } }
  let session = null;
  let saving = false;

  // --- Avisos ---
  function showNotice(title, text) {
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = ` ${text}`;
    notice.replaceChildren(strong, span);
    notice.hidden = false;
  }
  function clearNotice() {
    notice.hidden = true;
    notice.replaceChildren();
  }
  function storageProblem(error) {
    if (!(error instanceof StorageError)) throw error;
    const { title, text } = storageMessage(error);
    showNotice(title, text);
  }

  // --- Cola y vistas ---
  const today = () => localDate(now());
  function currentQueue() {
    const { cards, settings } = studyStore.getState();
    return buildQueue({ words: wordStore.getWords(), cards, settings, today: today() });
  }
  // Estado guardado de la tarjeta (o uno nuevo si nunca se estudió)
  function cardFor(item) {
    return studyStore.getState().cards[item.cardId] ?? newCard(item.wordId, item.direction);
  }
  function showPart(part) {
    summary.hidden = part !== 'summary';
    sessionBox.hidden = part !== 'session';
    done.hidden = part !== 'done';
  }

  function renderSummary() {
    session = null;
    const hasWords = wordStore.getWords().length > 0;
    const queue = currentQueue();
    const { settings } = studyStore.getState();
    $('#study-empty').hidden = hasWords;
    $('#study-today').hidden = !hasWords;
    $('#study-start').hidden = !hasWords;
    $('#study-due').textContent = String(queue.filter((item) => !item.isNew).length);
    $('#study-new').textContent = String(queue.filter((item) => item.isNew).length);
    $('#study-mode').textContent = `${DIRECTION_NAMES[settings.direction]}, con ${ALGORITHM_NAMES[settings.algorithm]}.`;
    showPart('summary');
  }
  // Cambios desde otra copia de la app: solo se redibuja si se está viendo el resumen
  function refreshSummary() {
    if (!summary.hidden) renderSummary();
  }

  // --- Sesión ---
  function startSession() {
    clearNotice();
    session = { answered: 0, tally: { again: 0, hard: 0, good: 0, easy: 0 }, current: null };
    showNext(currentQueue());
  }

  function showNext(queue) {
    if (queue.length === 0) {
      finish();
      return;
    }
    const item = queue[0];
    const word = wordStore.getWords().find((w) => w.id === item.wordId);
    session.current = { item, word };

    // «Tarjeta N de M»: las respondidas en esta sesión más las que quedan
    const total = session.answered + queue.length;
    $('#study-progress').textContent = `Tarjeta ${session.answered + 1} de ${total}`;
    $('#study-bar-fill').style.width = `${(session.answered / total) * 100}%`;

    const frenchFront = item.direction === 'fr-es';
    $('.study-lang', front).textContent = frenchFront ? 'Francés' : 'Español';
    const frontWord = $('.study-word', front);
    frontWord.textContent = frenchFront ? word.fr : word.es;
    if (frenchFront) frontWord.setAttribute('lang', 'fr');
    else frontWord.removeAttribute('lang');
    $('[data-listen]', front).hidden = !frenchFront;

    $('.study-fr', back).textContent = word.fr;
    $('.study-es', back).textContent = word.es;
    $('.study-example', back).hidden = !word.exampleFr;
    $('.study-example-fr', back).textContent = word.exampleFr || '';
    $('.study-example-es', back).textContent = word.exampleEs || '';

    front.hidden = false;
    back.hidden = true;
    reveal.hidden = false;
    answers.hidden = true;
    showPart('session');
    front.focus();
  }

  function revealAnswer() {
    if (!session?.current || !back.hidden) return;
    const days = previewDays(cardFor(session.current.item), studyStore.getState().settings.algorithm, today());
    for (const button of answerButtons) $('.answer-when', button).textContent = whenText(days[button.dataset.answer]);
    front.hidden = true;
    back.hidden = false;
    reveal.hidden = true;
    answers.hidden = false;
    back.focus();
  }

  async function answer(value) {
    if (!session?.current || back.hidden || saving) return;
    const stamp = now();
    const date = localDate(stamp);
    const at = stamp.toISOString();
    const { item } = session.current;
    const { settings } = studyStore.getState();
    const entry = {
      at, date, cardId: item.cardId, wordId: item.wordId, direction: item.direction, answer: value, algorithm: settings.algorithm,
    };
    saving = true;
    try {
      // Primero se guarda; si no se puede, la tarjeta no avanza
      await studyStore.recordReview(review(cardFor(item), value, date, at), entry);
    } catch (error) {
      storageProblem(error);
      return;
    } finally {
      saving = false;
    }
    clearNotice();
    session.answered += 1;
    session.tally[value] += 1;
    // La cola se recalcula con el «hoy» de este momento (puede haber pasado la medianoche)
    showNext(currentQueue());
  }

  function finish() {
    const { cards, settings } = studyStore.getState();
    const tomorrow = countDueOn({ words: wordStore.getWords(), cards, settings, date: addDays(today(), 1) });
    const { answered, tally } = session;
    const parts = ANSWERS.filter((value) => tally[value] > 0).map((value) => `${ANSWER_NAMES[value]}: ${tally[value]}`);
    const result = answered === 0
      ? 'Hoy no te quedaban tarjetas.'
      : `Respondiste ${plural(answered, 'tarjeta', 'tarjetas')} (${parts.join(', ')}).`;
    const next = tomorrow === 1 ? 'Mañana vence 1 tarjeta.' : `Mañana vencen ${tomorrow} tarjetas.`;
    $('#study-done-text').textContent = `${result} ${next}`;
    session = null;
    showPart('done');
    $('.study-done-title', done).focus();
  }

  function listen() {
    if (!session?.current) return;
    playFrench({ synth, text: session.current.word.fr, rate: RATES.normal, notice });
  }
  // El francés se ve en el reverso siempre y en el anverso solo si la dirección es francés → español
  const frenchVisible = () => !back.hidden || session?.current?.item.direction === 'fr-es';

  $('#study-start').addEventListener('click', startSession);
  reveal.addEventListener('click', revealAnswer);
  for (const button of answerButtons) button.addEventListener('click', () => answer(button.dataset.answer));
  for (const button of screen.querySelectorAll('[data-listen]')) button.addEventListener('click', listen);
  $('#study-back-to-summary').addEventListener('click', () => {
    renderSummary();
    $('#study-start').focus();
  });

  // --- Teclado: solo en una sesión de Estudiar, sin ventana abierta y fuera de campos de texto ---
  document.addEventListener('keydown', (event) => {
    if (screen.hidden || sessionBox.hidden || document.querySelector('dialog[open]')) return;
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : document.body;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (event.key === ' ' || event.key === 'Enter') {
      if (target.closest('button, a[href]') || !back.hidden) return; // un botón o enlace enfocado responde por sí mismo
      event.preventDefault();
      revealAnswer();
    } else if (['1', '2', '3', '4'].includes(event.key)) {
      if (back.hidden) return;
      event.preventDefault();
      answer(ANSWERS[Number(event.key) - 1]);
    } else if (event.key === 'o' || event.key === 'O') {
      if (!frenchVisible()) return;
      event.preventDefault();
      listen();
    }
  });

  // --- Ajustes ---
  function setNewPerDayError(text) {
    newPerDayError.textContent = text || '';
    newPerDayError.hidden = !text;
    if (text) newPerDayInput.setAttribute('aria-invalid', 'true');
    else newPerDayInput.removeAttribute('aria-invalid');
  }

  $('#study-settings-open').addEventListener('click', () => {
    const { settings } = studyStore.getState();
    settingsForm.elements.direction.value = settings.direction;
    settingsForm.elements.algorithm.value = settings.algorithm;
    newPerDayInput.value = String(settings.newPerDay);
    setNewPerDayError('');
    settingsFormError.hidden = true;
    settingsDialog.showModal();
  });
  settingsDialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close"]')) settingsDialog.close();
  });
  settingsDialog.addEventListener('close', () => $('#study-settings-open').focus());

  settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setNewPerDayError('');
    settingsFormError.hidden = true;
    const input = {
      direction: settingsForm.elements.direction.value,
      algorithm: settingsForm.elements.algorithm.value,
      newPerDay: newPerDayInput.value,
    };
    try {
      const result = await studyStore.saveSettings(input);
      if (!result.ok) {
        setNewPerDayError(result.errors.newPerDay);
        const other = [result.errors.direction, result.errors.algorithm].filter(Boolean);
        settingsFormError.textContent = other.join(' ');
        settingsFormError.hidden = other.length === 0;
        if (result.errors.newPerDay) newPerDayInput.focus();
        return;
      }
      settingsDialog.close();
      renderSummary();
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      settingsFormError.textContent = joined(storageMessage(error));
      settingsFormError.hidden = false;
    }
  });

  // Al entrar en Estudiar el resumen se recalcula (puede haber cambiado el día o las palabras)
  window.addEventListener('hashchange', () => {
    if (resolveRoute(location.hash) === 'study') renderSummary();
  });

  // --- Arranque ---
  async function start() {
    try {
      const { corruptBackupKey } = await studyStore.load();
      if (corruptBackupKey) {
        showNotice(MESSAGES.corruptStudy.title, MESSAGES.corruptStudy.text);
      }
    } catch (error) {
      storageProblem(error);
    }
    renderSummary();
    studyStore.watchExternalChanges(window, refreshSummary);
    wordStore.watchExternalChanges(window, refreshSummary);
  }

  return start();
}
