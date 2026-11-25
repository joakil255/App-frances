// Pantalla Leer: biblioteca de historias, lector con voz frase por frase y cuestionario.
// Todo el texto de Claude se pinta con textContent.
import { storyUrl, sendStory, textFromStory, splitSentences, findEvidenceSentence } from '../lib/story.js';
import { createSentencePlayer } from '../lib/sentence-player.js';
import { createReadingQuiz } from '../lib/reading-quiz.js';
import { tokenize } from '../lib/lookup.js';
import { chatMessage, storageMessage, MESSAGES } from '../lib/messages.js';
import { StorageError } from '../lib/storage.js';
import { RATES, loadVoices, pickFrenchVoice } from '../lib/speech.js';

const $ = (selector, root = document) => root.querySelector(selector);
const PREFS_KEY = 'app-frances-reader'; // último idioma de las preguntas

function el(tag, { text, className, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}

// El navegador puede bloquear localStorage: entonces no se recuerda nada y se usa Español
function loadQuizLang() {
  try {
    const lang = JSON.parse(localStorage.getItem(PREFS_KEY))?.quizLang;
    return lang === 'fr' ? 'fr' : 'es';
  } catch {
    return 'es';
  }
}
function saveQuizLang(quizLang) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ quizLang }));
  } catch {
    // no se recuerda; no es grave
  }
}

export function initReader({ textStore, wordCard, fetch, isOnline, hostname, getCode, synth, onBeforeSpeak }) {
  const url = storyUrl(hostname);
  const heading = $('#screen-reader h1');
  const notice = $('#reader-notice');
  const status = $('#reader-status');
  const library = $('#reader-library');
  const newButton = $('#reader-new');
  const empty = $('#reader-empty');
  const list = $('#reader-list');
  const story = $('#reader-story');
  const titleEl = $('#reader-title');
  const levelEl = $('#reader-level');
  const readMark = $('#reader-read-mark');
  const review = $('#reader-review');
  const source = $('#reader-source');
  const playButton = $('#reader-play');
  const rateButton = $('#reader-rate');
  const textEl = $('#reader-text');
  const markReadButton = $('#reader-mark-read');
  const deleteButton = $('#reader-delete');
  const newDialog = $('#reader-new-dialog');
  const newForm = $('form', newDialog);
  const confirmDialog = $('#reader-confirm-delete');
  const quizStart = $('#reader-quiz-start');
  const quizCard = $('#reader-quiz-card');
  const quizCount = $('#reader-quiz-count');
  const quizReview = $('#reader-quiz-review');
  const quizQuestion = $('#reader-quiz-question');
  const quizOptions = $('#reader-quiz-options');
  const checkButton = $('#reader-quiz-check');
  const feedback = $('#reader-quiz-feedback');
  const verdict = $('#reader-quiz-verdict');
  const explanation = $('#reader-quiz-explanation');
  const evidenceEl = $('#reader-quiz-evidence');
  const nextButton = $('#reader-quiz-next');
  const quizResult = $('#reader-quiz-result');
  const score = $('#reader-quiz-score');
  const retryButton = $('#reader-quiz-retry');

  let text = null; // la historia abierta
  let sentences = [];
  let rows = []; // un <p> por frase
  let player = null;
  let playerState = 'idle'; // 'idle' | 'playing' | 'paused'
  let rate = RATES.normal;
  let quiz = null;
  let generating = false;
  let visible = false; // la pantalla Leer está a la vista
  let playTicket = 0; // cada pedido de lectura lleva un número: uno que llega tarde se ignora
  let deleteReturn = null; // botón que abrió la ventana de borrar

  // --- Avisos ---
  function showNotice({ title, text: detail }) {
    notice.replaceChildren(el('strong', { text: title }), ...(detail ? [el('span', { text: ` ${detail}` })] : []));
    notice.hidden = false;
  }
  function clearNotice() {
    notice.hidden = true;
    notice.replaceChildren();
  }
  // Guardar puede fallar (sin espacio, almacenamiento bloqueado): se avisa y la pantalla sigue igual
  async function guarded(action) {
    try {
      return await action();
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      showNotice(storageMessage(error));
      return null;
    }
  }

  // --- Biblioteca ---
  function itemNode(t) {
    const meta = el('span', { className: 'reader-item-meta' }, [el('span', { text: t.level })]);
    if (t.status === 'review') meta.append(el('span', { className: 'tag-review', text: 'REVISAR' }));
    if (t.readAt) meta.append(el('span', { text: 'Leída' }));
    if (t.quizResult) meta.append(el('span', { text: `Preguntas: ${t.quizResult.correct}/${t.quizResult.total}` }));
    const link = el('a', { attrs: { href: `#/leer/${t.id}` } }, [
      el('span', { className: 'reader-item-text' }, [
        el('span', { className: 'reader-item-title', text: t.title, attrs: { lang: t.lang } }),
        meta,
      ]),
      el('span', { className: 'word-chevron', text: '›', attrs: { 'aria-hidden': 'true' } }),
    ]);
    return el('li', { className: 'reader-item' }, [link]);
  }
  function renderLibrary() {
    const texts = textStore.getTexts();
    list.replaceChildren(...texts.map(itemNode));
    empty.hidden = texts.length > 0;
  }

  // --- Voz ---
  function setPlayerState(state) {
    playerState = state;
    playButton.textContent = { idle: 'Escuchar', playing: 'Pausa', paused: 'Seguir' }[state];
  }
  function highlight(index) {
    rows.forEach((row, i) => {
      const isCurrent = i === index;
      row.classList.toggle('is-current', isCurrent);
      if (isCurrent) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
    rows[index]?.scrollIntoView({ block: 'nearest' });
  }
  // Corta la lectura (al salir, al ocultar la página, al abrir una palabra o al usar el micrófono)
  function stopReading() {
    playTicket += 1;
    player?.stop();
    player = null;
    highlight(-1);
    setPlayerState('idle');
  }
  async function frenchVoice() {
    if (!synth) {
      showNotice(MESSAGES.noSpeech);
      return null;
    }
    const choice = pickFrenchVoice(await loadVoices(synth));
    if (!choice) showNotice(MESSAGES.noFrenchVoice);
    return choice?.voice ?? null;
  }
  async function playFrom(index) {
    stopReading();
    onBeforeSpeak(); // el micrófono no debe oír la historia
    const ticket = playTicket;
    const voice = await frenchVoice(); // puede tardar hasta 2 s la primera vez
    if (!voice || ticket !== playTicket) return; // mientras tanto se paró o se pidió otra frase
    clearNotice();
    player = createSentencePlayer({
      synth,
      voice,
      sentences,
      rate,
      onSentence: highlight,
      onEnd: () => {
        player = null;
        highlight(-1);
        setPlayerState('idle');
      },
      onError: (code) => {
        player = null;
        highlight(-1);
        setPlayerState('idle');
        showNotice({ title: MESSAGES.voiceFailed.title, text: `${MESSAGES.voiceFailed.text} (Error: ${code}.)` });
      },
    });
    setPlayerState('playing');
    player.play(index);
  }
  playButton.addEventListener('click', () => {
    if (playerState === 'playing') {
      player.pause();
      setPlayerState('paused');
    } else if (playerState === 'paused') {
      player.resume();
      setPlayerState('playing');
    } else {
      playFrom(0);
    }
  });
  rateButton.addEventListener('click', () => {
    rate = rate === RATES.normal ? RATES.slow : RATES.normal;
    rateButton.textContent = rate === RATES.normal ? 'Más lento' : 'Normal';
    player?.setRate(rate); // vale desde la frase siguiente
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopReading();
  });

  // --- Texto: una fila por frase con su botón ▶ y las palabras como botones ---
  function openWord(token, button) {
    stopReading();
    wordCard.open(token, button, { root: textEl, category: 'Lectura', needsReview: text.status === 'review' });
  }
  function sentenceRow(sentence, index) {
    const from = el('button', { className: 'reader-from', text: '▶', attrs: { type: 'button', 'aria-label': 'Leer desde esta frase' } });
    from.addEventListener('click', () => playFrom(index));
    // Cada palabra va en un grupo sin cortes con la puntuación pegada a ella («famille.»):
    // si no, el punto puede quedar solo en la línea siguiente
    const parts = [];
    for (const token of tokenize(sentence)) {
      const last = parts.at(-1);
      if (token.word === null) {
        if (last?.classList?.contains('reader-nowrap') && /^(\S|\u00A0)/.test(token.text)) last.append(token.text);
        else parts.push(document.createTextNode(token.text));
        continue;
      }
      const button = el('button', { className: 'chat-word', text: token.text, attrs: { type: 'button' } });
      button.dataset.word = token.word; // para el subrayado
      button.dataset.sentence = token.sentence;
      button.addEventListener('click', () => openWord(token, button));
      parts.push(el('span', { className: 'reader-nowrap' }, [button]));
    }
    return el('p', { className: 'reader-sentence' }, [from, el('span', { className: 'reader-words' }, parts)]);
  }

  // --- Cabecera y botones de la historia ---
  function renderHeader() {
    titleEl.textContent = text.title;
    titleEl.lang = text.lang;
    levelEl.textContent = text.level;
    readMark.hidden = !text.readAt;
    review.hidden = text.status !== 'review';
    quizReview.hidden = text.status !== 'review';
    deleteButton.hidden = text.status === 'review'; // en REVISAR se borra con «Descartar»
    source.textContent = `Fuente: ${text.source.name}. ${text.source.license}.`;
    markReadButton.textContent = text.readAt ? 'Leída' : 'Marcar como leída';
    if (text.readAt) markReadButton.setAttribute('aria-disabled', 'true');
    else markReadButton.removeAttribute('aria-disabled');
  }
  function renderStory() {
    renderHeader();
    sentences = splitSentences(text.body);
    rows = sentences.map(sentenceRow);
    textEl.replaceChildren(...rows);
    wordCard.refresh(textEl);
    resetQuiz();
  }

  markReadButton.addEventListener('click', async () => {
    if (!text || text.readAt) return;
    const updated = await guarded(() => textStore.markRead(text.id));
    if (!updated) return;
    text = updated;
    renderHeader(); // el foco se queda en el botón, que ahora dice «Leída»
  });
  $('#reader-approve').addEventListener('click', async () => {
    const updated = await guarded(() => textStore.approve(text.id));
    if (!updated) return;
    text = updated;
    renderHeader();
    titleEl.focus(); // el botón «Aprobar» desaparece: el foco no se pierde
  });

  // --- Borrar (Descartar en REVISAR, o Borrar historia) ---
  function askDelete(event) {
    deleteReturn = event.currentTarget;
    confirmDialog.showModal();
  }
  $('#reader-discard').addEventListener('click', askDelete);
  deleteButton.addEventListener('click', askDelete);
  confirmDialog.addEventListener('click', async (event) => {
    if (event.target.closest('[data-action="close"]')) confirmDialog.close();
    if (!event.target.closest('[data-action="confirm"]')) return;
    const id = text.id;
    const done = await guarded(async () => {
      await textStore.deleteText(id);
      return true;
    });
    if (done) deleteReturn = null;
    confirmDialog.close();
    if (done) location.replace('#/leer'); // la historia ya no existe: no se vuelve a ella con «atrás»
  });
  confirmDialog.addEventListener('close', () => {
    if (deleteReturn?.isConnected) deleteReturn.focus();
  });

  // --- Cuestionario ---
  function resetQuiz() {
    quiz = null;
    quizStart.hidden = false;
    quizCard.hidden = true;
    quizResult.hidden = true;
    markEvidence(-1);
  }
  function markEvidence(index) {
    rows.forEach((row, i) => row.classList.toggle('is-evidence', i === index));
  }
  function showQuestion() {
    const { index, question, options } = quiz.current();
    const lang = text.quiz.lang;
    quizCount.textContent = `${index + 1}/${text.quiz.questions.length}`;
    quizQuestion.textContent = question;
    quizQuestion.lang = lang;
    quizOptions.replaceChildren(...options.map((option, i) => el('label', { className: 'reader-option' }, [
      el('input', { attrs: { type: 'radio', name: 'reader-answer', value: String(i) } }),
      el('span', { text: option, attrs: { lang } }),
    ])));
    feedback.hidden = true;
    nextButton.hidden = true;
    checkButton.hidden = false;
    markEvidence(-1);
    quizQuestion.focus();
  }
  function startQuiz() {
    quiz = createReadingQuiz(text.quiz);
    quizStart.hidden = true;
    quizResult.hidden = true;
    quizCard.hidden = false;
    showQuestion();
  }
  quizStart.addEventListener('click', startQuiz);
  retryButton.addEventListener('click', startQuiz);

  checkButton.addEventListener('click', () => {
    const inputs = [...quizOptions.querySelectorAll('input')];
    const chosen = inputs.findIndex((input) => input.checked);
    if (chosen === -1) {
      inputs[0]?.focus(); // sin elegir no se comprueba: el foco va a las opciones
      return;
    }
    const outcome = quiz.answer(chosen);
    if (!outcome) return;
    const lang = text.quiz.lang;
    const labels = [...quizOptions.querySelectorAll('.reader-option')];
    labels[outcome.answer].classList.add('is-correct');
    if (!outcome.correct) labels[chosen].classList.add('is-wrong');
    for (const input of inputs) input.disabled = true;

    feedback.classList.toggle('is-correct', outcome.correct);
    verdict.replaceChildren(...(outcome.correct
      ? [document.createTextNode('Correcto.')]
      : [document.createTextNode('No es correcta. La respuesta es: '),
        el('span', { text: text.quiz.questions[quiz.current().index].options[outcome.answer], attrs: { lang } })]));
    explanation.textContent = outcome.explanation;
    evidenceEl.replaceChildren(document.createTextNode('En el texto: «'),
      el('span', { text: outcome.evidence, attrs: { lang: text.lang } }), document.createTextNode('»'));
    markEvidence(findEvidenceSentence(sentences, outcome.evidence));
    feedback.hidden = false;
    checkButton.hidden = true;
    nextButton.hidden = false; // «Siguiente» solo después de «Comprobar»
    verdict.focus();
  });

  nextButton.addEventListener('click', async () => {
    if (quiz.next()) {
      showQuestion();
      return;
    }
    // Era la última: se muestra y se guarda el resultado (repetir lo reemplaza)
    const { correct, total } = quiz.result();
    quizCard.hidden = true;
    markEvidence(-1);
    score.textContent = `Resultado: ${correct} de ${total}`;
    quizResult.hidden = false;
    score.focus();
    const updated = await guarded(() => textStore.saveQuizResult(text.id, { correct, total }));
    if (updated) text = updated;
  });

  // --- Nueva historia ---
  const quizLangInputs = [...newForm.querySelectorAll('input[name="quiz-lang"]')];
  newButton.addEventListener('click', () => {
    if (generating) return;
    clearNotice();
    if (!isOnline()) {
      showNotice(chatMessage('offline'));
      return;
    }
    const remembered = loadQuizLang();
    for (const input of quizLangInputs) input.checked = input.value === remembered;
    newDialog.showModal();
  });
  newDialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close"]')) newDialog.close();
  });
  newDialog.addEventListener('close', () => newButton.focus());

  function setGenerating(busy) {
    generating = busy;
    // aria-disabled en vez de disabled: el foco se queda en el botón y se oye «Escribiendo…»
    if (busy) newButton.setAttribute('aria-disabled', 'true');
    else newButton.removeAttribute('aria-disabled');
    newButton.textContent = busy ? 'Escribiendo…' : 'Nueva historia';
    status.textContent = busy ? 'Escribiendo…' : '';
  }

  newForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (generating) return;
    const data = new FormData(newForm);
    const level = data.get('story-level');
    const topic = String(data.get('topic') ?? '').trim();
    const quizLang = data.get('quiz-lang');
    saveQuizLang(quizLang);
    clearNotice();
    setGenerating(true);
    newDialog.close();

    const code = getCode();
    const sent = code
      ? await sendStory({ url, code, body: { lang: 'fr', level, topic, quizLang }, fetch, isOnline: isOnline() })
      : { ok: false, error: 'unauthorized' };
    let added = null;
    if (sent.ok) {
      added = await guarded(() => textStore.addText(textFromStory(sent.result, { level, topic, quizLang })));
      if (added && !added.ok) {
        showNotice(chatMessage('bad_output')); // la historia no pasó la validación: no se guarda
        added = null;
      }
    } else {
      showNotice(chatMessage(sent.error));
    }
    setGenerating(false);
    if (added) newForm.reset();
    // Solo se abre si sigues en la biblioteca; si no, la historia queda en la lista
    if (added && visible && text === null) location.hash = `#/leer/${added.text.id}`;
  });

  return {
    // id = historia de «#/leer/<id>», o null para la biblioteca. moveFocus: llevar el foco al título.
    onShow(id, moveFocus = true) {
      visible = true;
      stopReading();
      clearNotice();
      if (id === null) {
        text = null;
        story.hidden = true;
        library.hidden = false;
        renderLibrary();
        if (moveFocus) heading.focus();
        return;
      }
      const found = textStore.getText(id);
      if (!found) {
        location.replace('#/leer'); // id desconocido: vuelve a la biblioteca
        return;
      }
      text = found;
      library.hidden = true;
      story.hidden = false;
      renderStory();
      if (moveFocus) titleEl.focus();
    },
    onHide() {
      visible = false;
      stopReading();
    },
  };
}
