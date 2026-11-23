// Pantalla Quiz: elegir modo, preguntas con respuesta inmediata y resumen.
// Es práctica: guarda cada respuesta en el historial, pero no cambia las tarjetas de Estudiar.
// Todo texto del usuario va con textContent.
import { resolveRoute } from '../lib/router.js';
import { StorageError } from '../lib/storage.js';
import { RATES } from '../lib/speech.js';
import { localDate } from '../lib/dates.js';
import { checkAnswer } from '../lib/answer-check.js';
import { MODES, modeStatus, pickQuizWords, buildChoiceOptions, expectedAnswer, summarizeQuiz } from '../lib/quiz.js';
import { playFrench, hasFrenchVoice } from './voice.js';

const $ = (selector, root = document) => root.querySelector(selector);
const ANSWER_LABELS = { write: 'Escribe en francés (con artículo)', dictation: 'Escribe lo que oyes' };
const PROMPT_LABELS = { choice: 'Francés', write: 'Español', dictation: 'Dictado' };

// Título de la respuesta: el símbolo es decoración; el texto dice el resultado
function feedbackTitle({ correct, accentOnly }) {
  if (correct) return accentOnly ? 'Correcto, pero ojo con el acento' : 'Correcto';
  return accentOnly ? 'Solo te falló el acento' : 'Incorrecto';
}

function textEl(tag, text, { className, lang } = {}) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  if (lang) node.setAttribute('lang', lang);
  return node;
}

export function initQuiz({ wordStore, studyStore, synth, now = () => new Date(), random = Math.random }) {
  const notice = $('#quiz-notice');
  const start = $('#quiz-start');
  const question = $('#quiz-question');
  const summary = $('#quiz-summary');
  const accentsBox = $('#quiz-require-accents');
  const card = $('#quiz-card');
  const prompt = $('#quiz-prompt');
  const promptListen = $('#quiz-prompt-listen');
  const voiceButtons = $('#quiz-voice');
  const optionsBox = $('#quiz-options');
  const optionButtons = [...optionsBox.querySelectorAll('.quiz-option')];
  const form = $('#quiz-answer-form');
  const input = $('#quiz-answer');
  const inputError = $('#quiz-answer-error');
  const feedback = $('#quiz-feedback');

  // null fuera de un quiz; si no: { mode, words, index, results, requireAccents, options, answered }
  let session = null;
  let hasVoice = null; // null = comprobando
  let saving = false;

  // --- Avisos ---
  function showNotice(title, text) {
    notice.replaceChildren(textEl('strong', title), textEl('span', ` ${text}`));
    notice.hidden = false;
  }
  function clearNotice() {
    notice.hidden = true;
    notice.replaceChildren();
  }
  function storageProblem(error) {
    if (!(error instanceof StorageError)) throw error;
    if (error.code === 'quota') {
      showNotice('No hay espacio para guardar tu respuesta.', 'Exporta tus palabras como copia y borra las que no necesites.');
    } else {
      showNotice('El navegador no deja guardar datos.', 'Comprueba que no estás en modo privado.');
    }
  }

  function showPart(part) {
    start.hidden = part !== 'start';
    question.hidden = part !== 'question';
    summary.hidden = part !== 'summary';
  }

  // --- Inicio ---
  function renderStart() {
    session = null;
    const status = modeStatus({ words: wordStore.getWords(), hasVoice });
    for (const mode of MODES) {
      const button = $(`[data-mode="${mode}"]`, start);
      const reason = $(`#quiz-mode-${mode}-reason`);
      button.disabled = !status[mode].available;
      reason.textContent = status[mode].reason ?? '';
      reason.hidden = status[mode].available;
    }
    accentsBox.checked = studyStore.getState().settings.requireAccents;
    showPart('start');
  }
  function refreshStart() {
    if (!start.hidden) renderStart();
  }

  async function checkVoice() {
    hasVoice = null;
    refreshStart();
    hasVoice = await hasFrenchVoice(synth);
    refreshStart();
  }

  accentsBox.addEventListener('change', async () => {
    const wanted = accentsBox.checked;
    try {
      await studyStore.saveSettings({ requireAccents: wanted });
      clearNotice();
    } catch (error) {
      accentsBox.checked = !wanted; // no se guardó: la casilla vuelve a su valor
      storageProblem(error);
    }
  });

  for (const mode of MODES) {
    $(`[data-mode="${mode}"]`, start).addEventListener('click', () => startQuiz(mode));
  }

  // --- Preguntas ---
  function startQuiz(mode) {
    const words = pickQuizWords({ words: wordStore.getWords(), cards: studyStore.getState().cards, mode, random });
    if (words.length === 0) return;
    clearNotice();
    session = {
      mode, words, index: 0, results: [], requireAccents: studyStore.getState().settings.requireAccents,
      options: null, answered: false,
    };
    showQuestion();
  }

  const currentWord = () => session.words[session.index];
  const speakFrench = (text, rate = RATES.normal) => playFrench({ synth, text, rate, notice });

  function showQuestion() {
    const { mode, words, index } = session;
    const word = currentWord();
    session.answered = false;
    session.options = null;
    $('#quiz-progress').textContent = `Pregunta ${index + 1} de ${words.length}`;
    $('#quiz-bar-fill').style.width = `${(index / words.length) * 100}%`;

    $('#quiz-prompt-label').textContent = PROMPT_LABELS[mode];
    prompt.hidden = mode === 'dictation';
    prompt.textContent = mode === 'choice' ? word.fr : mode === 'write' ? word.es : '';
    if (mode === 'choice') prompt.setAttribute('lang', 'fr');
    else prompt.removeAttribute('lang');
    promptListen.hidden = mode !== 'choice';
    voiceButtons.hidden = mode !== 'dictation';

    optionsBox.hidden = mode !== 'choice';
    if (mode === 'choice') {
      session.options = buildChoiceOptions({ word, words: wordStore.getWords(), random });
      optionButtons.forEach((button, i) => {
        $('.quiz-option-text', button).textContent = session.options[i].text;
        $('.quiz-option-mark', button).textContent = '';
        button.classList.remove('is-correct', 'is-wrong');
        button.disabled = false;
      });
    }

    form.hidden = mode === 'choice';
    $('#quiz-answer-label').textContent = ANSWER_LABELS[mode] ?? '';
    input.value = '';
    setInputError('');
    feedback.hidden = true;
    showPart('question');

    if (mode === 'choice') card.focus();
    else input.focus(); // abre el teclado en pantalla
    // El dictado suena solo: siempre llega aquí tras un toque (Empezar o Siguiente)
    if (mode === 'dictation') speakFrench(word.exampleFr);
  }

  function setInputError(text) {
    inputError.textContent = text;
    inputError.hidden = !text;
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  // Guarda primero; si no se puede, aviso y la pregunta no avanza. Devuelve si se guardó.
  async function record(result) {
    if (!session || session.answered || saving) return false;
    const stamp = now();
    const { mode } = session;
    const entry = {
      kind: 'quiz', at: stamp.toISOString(), date: localDate(stamp), wordId: currentWord().id,
      mode, correct: result.correct, accentOnly: result.accentOnly,
    };
    saving = true;
    try {
      await studyStore.recordQuizAnswer(entry);
    } catch (error) {
      storageProblem(error);
      return false;
    } finally {
      saving = false;
    }
    clearNotice();
    session.answered = true;
    session.results.push({ word: currentWord(), mode, ...result });
    return true;
  }

  optionButtons.forEach((button, i) => button.addEventListener('click', async () => {
    if (!session?.options) return;
    const chosen = session.options[i];
    const saved = await record({ correct: chosen.isCorrect, accentOnly: false, typed: null });
    if (!saved) return;
    optionButtons.forEach((other, j) => {
      const option = session.options[j];
      other.disabled = true;
      if (option.isCorrect) {
        other.classList.add('is-correct');
        $('.quiz-option-mark', other).textContent = '✓ Correcta';
      } else if (j === i) {
        other.classList.add('is-wrong');
        $('.quiz-option-mark', other).textContent = '✗ Tu respuesta';
      }
    });
    showFeedback();
  }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!session || session.answered) return;
    const typed = input.value;
    if (typed.trim() === '') {
      setInputError('Escribe tu respuesta o pulsa «No lo sé».');
      input.focus();
      return;
    }
    const result = checkAnswer(typed, expectedAnswer(currentWord(), session.mode), { requireAccents: session.requireAccents });
    if (await record({ ...result, typed })) showFeedback();
  });

  $('#quiz-skip').addEventListener('click', async () => {
    if (await record({ correct: false, accentOnly: false, typed: null })) showFeedback();
  });

  // --- Respuesta inmediata ---
  function showFeedback() {
    const result = session.results.at(-1);
    const { word, mode } = result;
    form.hidden = true;

    feedback.classList.toggle('is-correct', result.correct);
    const title = $('#quiz-feedback-title');
    title.replaceChildren(textEl('span', result.correct ? '✓ ' : '✗ ', {}), document.createTextNode(feedbackTitle(result)));
    title.firstChild.setAttribute('aria-hidden', 'true');

    const correctAnswer = $('#quiz-correct-answer');
    correctAnswer.textContent = expectedAnswer(word, mode);
    if (mode === 'choice') correctAnswer.removeAttribute('lang');
    else correctAnswer.setAttribute('lang', 'fr');
    $('#quiz-feedback-listen').hidden = mode === 'choice'; // en (a) el altavoz está en la tarjeta

    const translation = $('#quiz-correct-translation');
    translation.hidden = mode !== 'dictation' || !word.exampleEs;
    translation.textContent = mode === 'dictation' ? word.exampleEs || '' : '';

    $('#quiz-typed').hidden = result.typed === null;
    $('#quiz-typed-text').textContent = result.typed ?? '';

    // Ejemplo: la frase y su traducción; en el dictado, la palabra (la frase ya es la respuesta)
    const example = $('#quiz-example');
    const exampleFr = mode === 'dictation' ? word.fr : word.exampleFr;
    const exampleEs = mode === 'dictation' ? word.es : word.exampleEs;
    example.hidden = !exampleFr;
    $('#quiz-example-fr').textContent = exampleFr || '';
    $('#quiz-example-es').textContent = exampleEs || '';

    const isLast = session.index === session.words.length - 1;
    $('#quiz-next').textContent = isLast ? 'Ver resumen' : 'Siguiente';
    feedback.hidden = false;
    title.focus();
  }

  $('#quiz-next').addEventListener('click', () => {
    if (!session?.answered) return;
    session.index += 1;
    if (session.index >= session.words.length) showSummary();
    else showQuestion();
  });

  // --- Resumen ---
  function failedItem({ word, mode, typed }) {
    const questionText = { choice: word.fr, write: word.es, dictation: word.exampleFr }[mode];
    const answerText = { choice: word.es, write: word.fr, dictation: word.exampleEs || word.fr }[mode];
    const item = document.createElement('li');
    item.append(
      textEl('p', questionText, { className: 'quiz-failed-q', lang: mode === 'write' ? undefined : 'fr' }),
      textEl('p', answerText, { lang: mode === 'write' ? 'fr' : undefined }),
    );
    if (typed !== null) item.append(textEl('p', `Escribiste: ${typed}`, { className: 'quiz-failed-typed' }));
    return item;
  }

  function showSummary() {
    const { total, correct, failed } = summarizeQuiz(session.results);
    $('#quiz-summary-title').textContent = `Acertaste ${correct} de ${total}`;
    $('#quiz-summary-none').hidden = failed.length > 0;
    $('#quiz-failed-title').hidden = failed.length === 0;
    $('#quiz-failed').replaceChildren(...failed.map(failedItem));
    session = null;
    showPart('summary');
    $('#quiz-summary-title').focus();
  }

  $('#quiz-again').addEventListener('click', () => {
    renderStart();
    const first = start.querySelector('[data-mode]:not(:disabled)');
    (first ?? accentsBox).focus();
  });

  // --- Voz ---
  promptListen.addEventListener('click', () => session && speakFrench(currentWord().fr));
  for (const button of voiceButtons.querySelectorAll('[data-rate]')) {
    button.addEventListener('click', () => session && speakFrench(currentWord().exampleFr, RATES[button.dataset.rate]));
  }
  $('#quiz-feedback-listen').addEventListener('click', () => {
    const result = session?.results.at(-1);
    if (result) speakFrench(expectedAnswer(result.word, result.mode));
  });

  // Al entrar en Quiz se vuelve al inicio (las respuestas ya están guardadas)
  window.addEventListener('hashchange', () => {
    if (resolveRoute(location.hash) !== 'quiz') return;
    renderStart();
    if (hasVoice !== true) checkVoice(); // quizá se instaló una voz
  });

  // --- Arranque ---
  renderStart();
  studyStore.watchExternalChanges(window, refreshStart);
  wordStore.watchExternalChanges(window, refreshStart);
  return checkVoice();
}
