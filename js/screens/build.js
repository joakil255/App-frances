// Pantalla «Construir frases»: lista de lecciones, lección y práctica de ejercicios cerrados.
// Todo el texto de las lecciones se pinta con textContent.
import { checkExercise, createTileBoard } from '../lib/sentence-check.js';
import { insertAt } from '../lib/exercise-ui.js';
import { lessonStatus } from '../lib/build-review.js';
import { localDate } from '../lib/dates.js';
import { RATES, speak, loadVoices, pickFrenchVoice } from '../lib/speech.js';
import { MESSAGES, storageMessage } from '../lib/messages.js';
import { StorageError } from '../lib/storage.js';

const $ = (selector, root = document) => root.querySelector(selector);

const AREA_NAMES = { grammar: 'Gramática', syntax: 'Sintaxis', spelling: 'Ortografía' };
const DIFF_NAMES = { changed: 'cambia', missing: 'falta', extra: 'sobra' };
const REVIEW_PARTS = ['idea', 'think', 'examples', 'pitfalls', 'exercises', 'situations'];
const BLANK = '…'; // hueco del ejercicio gap y palabra que falta en la diferencia

function el(tag, { text, className, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}
const fr = (tag, text, className) => el(tag, { text, className, attrs: { lang: 'fr' } });

// Enfoca y deja a la vista (el margen de CSS evita que la barra de abajo lo tape)
function focusOn(node) {
  node.focus({ preventScroll: true });
  node.scrollIntoView({ block: 'nearest' });
}

const hasReview = (lesson) => REVIEW_PARTS.some((part) => lesson[part].some((item) => item.review));
const stateText = ({ state, correct, total }) => ({ new: 'Nueva', started: `En curso: ${correct}/${total}`, done: 'Terminada' })[state];

// «REVISAR» escrito (no solo color) y su nota
function reviewNote(item) {
  if (!item.review) return [];
  return [el('p', { className: 'hint build-note' }, [
    el('span', { className: 'tag-review', text: 'REVISAR' }), document.createTextNode(` ${item.reviewNote}`),
  ])];
}

export function initBuild({ buildStore, studyStore, lessons, synth, now = () => new Date() }) {
  const heading = $('#screen-build h1');
  const notice = $('#build-notice');
  const list = $('#build-list');
  const lessonEl = $('#build-lesson');
  const titleEl = $('#build-title');
  const startButton = $('#build-start');
  const doneEl = $('#build-done');
  const card = $('#build-exercise');
  const countEl = $('#build-count');
  const exReview = $('#build-ex-review');
  const exReviewNote = $('#build-ex-review-note');
  const prompt = $('#build-prompt');
  const orderEl = $('#build-order');
  const placedList = $('#build-placed');
  const tilesList = $('#build-tiles');
  const clearButton = $('#build-clear');
  const live = $('#build-order-live');
  const writeEl = $('#build-write');
  const sentenceEl = $('#build-sentence');
  const answer = $('#build-answer');
  const accents = [...document.querySelectorAll('#screen-build .build-accent')];
  const checkButton = $('#build-check');
  const feedback = $('#build-feedback');
  const verdict = $('#build-verdict');
  const explanation = $('#build-explanation');
  const expectedEl = $('#build-expected');
  const typedEl = $('#build-typed');
  const status = $('#build-status');
  const nextButton = $('#build-next');

  let lesson = null; // la lección abierta
  let practice = null; // { queue, index, requeued, board, expected, checked }
  let utterance = null; // se guarda hasta que termine (Chrome pierde onend si se recoge)

  // --- Avisos ---
  function showNotice({ title, text }) {
    notice.replaceChildren(el('strong', { text: title }), ...(text ? [el('span', { text: ` ${text}` })] : []));
    notice.hidden = false;
  }
  function clearNotice() {
    notice.hidden = true;
    notice.replaceChildren();
  }

  // --- Voz ---
  async function say(text) {
    if (!synth) {
      showNotice(MESSAGES.noSpeech);
      return;
    }
    const choice = pickFrenchVoice(await loadVoices(synth));
    if (!choice) {
      showNotice(MESSAGES.noFrenchVoice);
      return;
    }
    utterance = speak(synth, choice.voice, text, RATES.normal, {
      onEnd: () => { utterance = null; },
      onError: (code) => {
        utterance = null;
        showNotice({ title: MESSAGES.voiceFailed.title, text: `${MESSAGES.voiceFailed.text} (Error: ${code}.)` });
      },
    });
  }
  function stopVoice() {
    if (utterance) synth.cancel();
    utterance = null;
  }

  // --- Lista de lecciones ---
  function itemNode(entry, number) {
    const label = el('span', { className: 'build-number', text: `Lección ${number}` });
    if (!entry.lesson) {
      return el('li', { className: 'build-item' }, [el('p', { className: 'build-item-text build-item-broken' }, [
        label, el('span', { text: 'Esta lección no se pudo cargar' }),
      ])]);
    }
    const meta = el('span', { className: 'reader-item-meta' }, [
      ...entry.lesson.areas.map((area) => el('span', { text: AREA_NAMES[area] })),
      el('span', { text: stateText(lessonStatus(entry.lesson, buildStore.getState().progress[entry.id])) }),
    ]);
    if (hasReview(entry.lesson)) {
      meta.append(el('span', {}, [document.createTextNode('Tiene partes '), el('span', { className: 'tag-review', text: 'REVISAR' })]));
    }
    return el('li', { className: 'build-item' }, [el('a', { attrs: { href: `#/construir/${entry.id}` } }, [
      el('span', { className: 'build-item-text' }, [label, el('span', { className: 'reader-item-title', text: entry.lesson.title }), meta]),
      el('span', { className: 'word-chevron', text: '›', attrs: { 'aria-hidden': 'true' } }),
    ])]);
  }
  function renderList() {
    list.replaceChildren(...(lessons ?? []).map((entry, i) => itemNode(entry, i + 1)));
  }

  // --- Lección ---
  function listenButton(text, describedBy) {
    const button = el('button', { className: 'button button-secondary', text: 'Escuchar', attrs: { type: 'button', 'aria-describedby': describedBy } });
    button.addEventListener('click', () => say(text));
    return button;
  }
  function sourceNode(source) {
    const isWeb = typeof source.url === 'string' && /^https?:\/\//.test(source.url);
    const title = isWeb ? el('a', { text: source.title, attrs: { href: source.url } }) : el('span', { text: source.title });
    const details = [source.publisher, source.year, source.pages && (/^\d/.test(source.pages) ? `páginas ${source.pages}` : source.pages)].filter(Boolean).join(', ');
    return el('li', {}, [title, document.createTextNode(details ? `. ${details}.` : '.')]);
  }
  function renderLesson(number) {
    $('#build-number').textContent = `Lección ${number}`;
    titleEl.textContent = lesson.title;
    $('#build-meta').replaceChildren(el('span', { text: lesson.level }), ...lesson.areas.map((area) => el('span', { text: AREA_NAMES[area] })));
    $('#build-idea').replaceChildren(...lesson.idea.flatMap((item) => [el('p', { text: item.text }), ...reviewNote(item)]));
    $('#build-pattern').replaceChildren(...lesson.pattern.map((block) => el('li', { className: 'build-block' }, [
      el('p', { className: 'build-block-label', text: block.label }),
      el('ul', { className: 'build-options', attrs: { lang: 'fr' } }, block.options.map((option) => el('li', { text: option }))),
    ])));
    $('#build-think').replaceChildren(...lesson.think.map((item) => el('li', { className: 'build-row' }, [
      el('p', { className: 'build-think-source', text: item.source }),
      fr('p', item.target, 'build-fr'),
      el('p', { className: 'hint', text: item.note }),
      ...reviewNote(item),
    ])));
    $('#build-examples').replaceChildren(...lesson.examples.map((item) => {
      const id = `build-example-${item.id}`;
      const text = el('p', { className: 'build-fr', text: item.text, attrs: { lang: 'fr', id } });
      return el('li', { className: 'build-row build-example' }, [
        el('div', { className: 'build-example-text' }, [text, el('p', { className: 'build-translation', text: item.translation }), ...reviewNote(item)]),
        listenButton(item.text, id),
      ]);
    }));
    $('#build-pitfalls').replaceChildren(...lesson.pitfalls.map((item) => el('li', { className: 'build-row' }, [
      el('p', { className: 'build-fix' }, [
        fr('del', item.wrong), el('span', { text: ' → ', attrs: { 'aria-hidden': 'true' } }),
        el('span', { className: 'visually-hidden', text: ' se corrige: ' }), fr('ins', item.right),
      ]),
      el('p', { className: 'hint', text: item.explanation }),
      ...reviewNote(item),
    ])));
    $('#build-sources').replaceChildren(...lesson.sources.map(sourceNode));
  }

  // --- Práctica ---
  const current = () => practice.queue[practice.index];

  function tileItem(item, onClick) {
    const button = el('button', { className: 'build-tile', text: item.text, attrs: { type: 'button' } });
    button.addEventListener('click', onClick);
    return el('li', {}, [button]);
  }
  // Redibuja las dos zonas; el foco va a la ficha que quedó en el mismo lugar
  function renderTiles(focus = null) {
    const { board } = practice;
    placedList.replaceChildren(...board.placed().map((item, pos) => tileItem(item, () => removeTile(item, pos))));
    tilesList.replaceChildren(...board.available().map((item, pos) => tileItem(item, () => placeTile(item, pos))));
    if (!focus) return;
    const buttons = [...focus.list.querySelectorAll('button')];
    (buttons[focus.pos] ?? buttons.at(-1) ?? focus.fallback()).focus();
  }
  function placeTile(item, pos) {
    practice.board.place(item.index);
    renderTiles({ list: tilesList, pos, fallback: () => checkButton });
    live.textContent = `Agregaste: ${item.text}. Tu frase: ${practice.board.sentence()}`;
  }
  function removeTile(item, pos) {
    practice.board.remove(item.index);
    renderTiles({ list: placedList, pos, fallback: () => tilesList.querySelector('button') ?? checkButton });
    live.textContent = `Quitaste: ${item.text}`;
  }
  clearButton.addEventListener('click', () => {
    practice.board.clear();
    renderTiles({ list: tilesList, pos: 0, fallback: () => checkButton });
  });

  // La fila de acentos escribe en el cursor y devuelve el foco al campo
  for (const button of accents) {
    button.addEventListener('click', () => {
      const { value, caret } = insertAt(answer.value, answer.selectionStart ?? answer.value.length,
        answer.selectionEnd ?? answer.value.length, button.dataset.letter);
      answer.value = value;
      answer.focus();
      answer.setSelectionRange(caret, caret);
    });
  }

  function setLocked(locked) {
    for (const button of [...placedList.querySelectorAll('button'), ...tilesList.querySelectorAll('button'), clearButton, ...accents]) {
      button.disabled = locked;
    }
    answer.readOnly = locked;
  }

  function showExercise() {
    const ex = current();
    practice.checked = false;
    countEl.textContent = `Ejercicio ${practice.index + 1}/${practice.queue.length}`;
    exReview.hidden = !ex.review;
    exReviewNote.hidden = !ex.review;
    exReviewNote.textContent = ex.review ? ex.reviewNote : '';
    prompt.textContent = ex.prompt;
    orderEl.hidden = ex.type !== 'order';
    writeEl.hidden = ex.type === 'order';
    live.textContent = '';
    if (ex.type === 'order') {
      practice.board = createTileBoard(ex.tiles);
      renderTiles();
    } else {
      sentenceEl.replaceChildren(...(ex.type === 'gap'
        ? [document.createTextNode(ex.before), el('span', { className: 'build-gap', text: BLANK }), document.createTextNode(ex.after)]
        : [document.createTextNode(ex.wrong)]));
      answer.value = ex.type === 'fix' ? ex.wrong : ''; // la frase con error se corrige en el mismo campo
    }
    setLocked(false);
    feedback.hidden = true;
    status.textContent = '';
    checkButton.hidden = false;
    nextButton.hidden = true;
  }

  function startPractice() {
    stopVoice();
    practice = { queue: [...lesson.exercises], index: 0, requeued: new Set(), board: null, checked: false, expected: '' };
    startButton.hidden = true;
    doneEl.hidden = true;
    card.hidden = false;
    showExercise();
    focusOn(prompt);
  }
  startButton.addEventListener('click', startPractice);

  // «Tu respuesta:» con las palabras distintas marcadas (negrita y <mark>) y su nombre para el lector de pantalla
  function diffNodes(diff) {
    return diff.flatMap((item, i) => {
      const space = i > 0 ? [document.createTextNode(' ')] : [];
      if (item.status === 'same') return [...space, fr('span', item.word)];
      const shown = item.status === 'missing' ? el('span', { text: BLANK, attrs: { 'aria-hidden': 'true' } }) : fr('span', item.word);
      return [...space, el('mark', { className: `build-diff build-diff-${item.status}` }, [
        shown, el('span', { className: 'visually-hidden', text: ` (${DIFF_NAMES[item.status]})` }),
      ])];
    });
  }

  // Guarda el intento; si no se puede, avisa y la práctica sigue sin guardar
  function record(ex, correct) {
    const today = localDate(now());
    try {
      const { cardCreated } = buildStore.recordAttempt({ lessonId: lesson.id, exerciseId: ex.id, correct, today });
      if (cardCreated) status.textContent = 'Este ejercicio irá a tu repaso.';
      if (correct && lessonStatus(lesson, buildStore.getState().progress[lesson.id]).state === 'done') {
        buildStore.completeLesson(lesson.id, today);
      }
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      showNotice(storageMessage(error));
    }
  }

  checkButton.addEventListener('click', () => {
    const ex = current();
    const typed = ex.type === 'order' ? practice.board.sentence() : answer.value;
    if (typed.trim() === '') {
      (ex.type === 'order' ? tilesList.querySelector('button') : answer).focus(); // sin respuesta no se comprueba
      return;
    }
    const result = checkExercise(ex, typed, { requireAccents: studyStore.getState().settings.requireAccents });
    practice.checked = true;
    practice.expected = result.expected;
    record(ex, result.correct);
    // Un fallo vuelve una sola vez al final de esta práctica
    if (!result.correct && !practice.requeued.has(ex.id)) {
      practice.requeued.add(ex.id);
      practice.queue.push(ex);
    }

    feedback.classList.toggle('is-correct', result.correct);
    verdict.textContent = result.correct ? 'Correcto.' : 'No es correcta.';
    explanation.textContent = result.explanation ?? '';
    explanation.hidden = !result.explanation;
    expectedEl.replaceChildren(document.createTextNode('La respuesta es: '), fr('span', result.expected, 'build-fr'));
    // La diferencia solo se muestra al fallar (una respuesta correcta puede traer cambios de espacios)
    typedEl.hidden = result.correct;
    typedEl.replaceChildren(...(result.correct ? [] : [el('span', { className: 'quiz-label', text: 'Tu respuesta: ' }), ...diffNodes(result.diff)]));
    setLocked(true);
    feedback.hidden = false;
    checkButton.hidden = true;
    nextButton.hidden = false;
    focusOn(verdict);
  });
  answer.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing && practice && !practice.checked) checkButton.click();
  });
  $('#build-listen').addEventListener('click', () => say(practice.expected));

  nextButton.addEventListener('click', () => {
    stopVoice();
    practice.index += 1;
    if (practice.index < practice.queue.length) {
      showExercise();
      focusOn(prompt);
      return;
    }
    // Fin de la práctica: se puede volver a practicar
    practice = null;
    card.hidden = true;
    startButton.hidden = false;
    doneEl.hidden = false;
    focusOn(doneEl);
  });

  function resetPractice() {
    practice = null;
    card.hidden = true;
    doneEl.hidden = true;
    startButton.hidden = false;
  }

  return {
    // param = id de «#/construir/<id>», o null para la lista. moveFocus: llevar el foco al título.
    onShow(param, moveFocus = true) {
      stopVoice();
      clearNotice();
      if (lessons === null) showNotice(MESSAGES.storageUnavailable); // no se pudo leer el índice
      if (param === null) {
        lesson = null;
        resetPractice();
        lessonEl.hidden = true;
        list.hidden = false;
        renderList();
        if (moveFocus) heading.focus();
        return;
      }
      const number = (lessons ?? []).findIndex((entry) => entry.id === param && entry.lesson);
      if (number === -1) {
        location.replace('#/construir'); // id desconocido (o «repaso», que llega después): vuelve a la lista
        return;
      }
      lesson = lessons[number].lesson;
      resetPractice();
      list.hidden = true;
      lessonEl.hidden = false;
      renderLesson(number + 1);
      if (moveFocus) titleEl.focus();
    },
    onHide() {
      stopVoice();
    },
  };
}
