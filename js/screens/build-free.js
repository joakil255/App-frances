// Frase libre de «Construir frases»: una situación por vez, al terminar los ejercicios.
// Se compara con los modelos; si no coincide, la corrige Claude por el servidor (/sentence).
// Todo lo que viene de la lección, de Claude o de quien escribe se pinta con textContent.
import { checkFree } from '../lib/sentence-check.js';
import { normalizeAnswer, foldAccents } from '../lib/answer-check.js';
import { sentenceUrl, sendSentence } from '../lib/sentence.js';
import { localDate } from '../lib/dates.js';
import { MESSAGES, chatMessage, storageMessage } from '../lib/messages.js';
import { StorageError } from '../lib/storage.js';

const $ = (selector) => document.querySelector(selector);
const KIND_NAMES = { grammar: 'Gramática', syntax: 'Sintaxis', spelling: 'Ortografía' };

function el(tag, { text, className, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}
const fr = (tag, text, className) => el(tag, { text, className, attrs: { lang: 'fr' } });

// El servidor no acepta saltos de línea: el campo de varias líneas se junta en una
const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

export function initFreeSentence({ buildStore, studyStore, fetch, isOnline, hostname, getCode, now, focusOn }) {
  const url = sentenceUrl(hostname);
  const card = $('#build-free');
  const countEl = $('#build-free-count');
  const reviewTag = $('#build-free-review');
  const reviewNote = $('#build-free-review-note');
  const situationEl = $('#build-free-situation');
  const answer = $('#build-free-answer');
  const checkButton = $('#build-free-check');
  const errorEl = $('#build-free-error');
  const result = $('#build-free-result');
  const verdict = $('#build-free-verdict');
  const detail = $('#build-free-detail');
  const errorsList = $('#build-free-errors');
  const suggestion = $('#build-free-suggestion');
  const suggestionText = $('#build-free-suggestion-text');
  const models = $('#build-free-models');
  const status = $('#build-free-status');
  const nextButton = $('#build-free-next');

  let lesson = null;
  let index = 0;
  let busy = false;
  let run = 0; // cambia al mostrar otra situación: una respuesta tardía ya no se pinta

  const current = () => lesson.situations[index];

  function showError({ title, text }) {
    errorEl.replaceChildren(el('strong', { text: title }), ...(text ? [el('span', { text: ` ${text}` })] : []));
    errorEl.hidden = false;
  }
  function clearError() {
    errorEl.hidden = true;
    errorEl.replaceChildren();
  }

  function setBusy(value) {
    busy = value;
    // aria-disabled en vez de disabled: el foco se queda en el botón y se oye «Revisando…»
    if (busy) checkButton.setAttribute('aria-disabled', 'true');
    else checkButton.removeAttribute('aria-disabled');
    checkButton.textContent = busy ? 'Revisando…' : 'Comprobar';
    answer.readOnly = busy;
    if (busy) status.textContent = 'Revisando…';
  }

  function showSituation() {
    run += 1;
    const situation = current();
    countEl.textContent = `Situación ${index + 1}/${lesson.situations.length}`;
    reviewTag.hidden = !situation.review;
    reviewNote.hidden = !situation.review;
    reviewNote.textContent = situation.review ? situation.reviewNote : '';
    situationEl.textContent = situation.situation;
    answer.value = '';
    answer.readOnly = false;
    setBusy(false);
    clearError();
    result.hidden = true;
    status.textContent = '';
    checkButton.hidden = false;
    nextButton.hidden = true;
  }

  // kind: 'correct' (verde), 'wrong' (rojo) o 'info' (sin conexión: ni bien ni mal)
  function showResult({ kind, verdictNodes, detailText = null, errors = [], suggestionValue = '' }) {
    result.classList.toggle('is-correct', kind === 'correct');
    result.classList.toggle('is-info', kind === 'info');
    verdict.replaceChildren(...verdictNodes);
    detail.textContent = detailText ?? '';
    detail.hidden = !detailText;
    errorsList.replaceChildren(...errors.map((error) => el('li', { className: 'build-free-error' }, [
      el('p', { className: 'build-fix' }, [
        fr('del', error.original), el('span', { text: ' → ', attrs: { 'aria-hidden': 'true' } }),
        el('span', { className: 'visually-hidden', text: ' se corrige: ' }), fr('ins', error.corrected),
      ]),
      el('p', { className: 'build-free-explanation' }, [
        el('span', { className: 'build-kind', text: KIND_NAMES[error.kind] ?? error.kind }),
        document.createTextNode(` ${error.explanation}`),
      ]),
    ])));
    errorsList.hidden = errors.length === 0;
    suggestionText.textContent = suggestionValue;
    suggestion.hidden = suggestionValue.trim() === '';
    models.replaceChildren(...current().models.map((model) => el('li', { text: model })));
    result.hidden = false;
    focusOn(verdict);
  }

  // Resultado final: ya no se vuelve a comprobar esta situación
  function finish() {
    answer.readOnly = true;
    checkButton.hidden = true;
    nextButton.hidden = index + 1 >= lesson.situations.length;
  }

  function saveOwnCard(situation, sentence, { corrected, errors }) {
    try {
      buildStore.addOwnCard({ situation: situation.situation, original: sentence, corrected, errors, today: localDate(now()) });
      return true;
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      showError(storageMessage(error));
      return false;
    }
  }

  async function check() {
    if (busy) return;
    const situation = current();
    const sentence = oneLine(answer.value);
    if (sentence === '') {
      answer.focus(); // sin frase no se comprueba
      return;
    }
    clearError();
    const requireAccents = studyStore.getState().settings.requireAccents;
    const local = checkFree(situation, sentence, { requireAccents });

    if (!local.needsAi) {
      // Coincide con un modelo (o solo cambia un acento): sin llamar a nadie
      const key = foldAccents(normalizeAnswer(sentence));
      const model = situation.models.find((m) => foldAccents(normalizeAnswer(m)) === key);
      showResult({
        kind: local.correct ? 'correct' : 'wrong',
        verdictNodes: [document.createTextNode(local.correct ? 'Correcta.' : 'No es correcta.')],
        detailText: local.accentOnly ? `Ojo con el acento: ${model}` : null,
      });
      finish();
      return;
    }
    if (!isOnline()) {
      // Sin conexión no se envía nada: se muestran los modelos para comparar
      showResult({ kind: 'info', verdictNodes: [document.createTextNode(MESSAGES.sentenceOffline.title)], detailText: MESSAGES.sentenceOffline.text });
      return;
    }
    const code = getCode();
    if (!code) {
      showError(MESSAGES.sentenceNoCode); // el código se guarda en Conversar
      return;
    }

    const mine = run;
    setBusy(true);
    let sent;
    try {
      sent = await sendSentence({
        url,
        code,
        fetch,
        isOnline: isOnline(),
        body: { lang: lesson.lang, explainLang: lesson.explainLang, level: lesson.level, situation: situation.situation, focus: situation.focus, sentence },
      });
    } finally {
      if (mine === run) setBusy(false);
    }
    // La tarjeta se guarda aunque ya estés en otra situación; solo el resultado deja de pintarse
    const saved = sent.ok && sent.result.errors.length > 0 && saveOwnCard(situation, sentence, sent.result);
    if (mine !== run) return;
    status.textContent = saved ? 'Agregamos esta frase a tu repaso.' : '';
    if (!sent.ok) {
      showError(chatMessage(sent.error));
      return;
    }
    const { correct, corrected, errors, suggestion: tip } = sent.result;
    showResult({
      kind: correct ? 'correct' : 'wrong',
      verdictNodes: correct
        ? [document.createTextNode('Correcta.')]
        : [document.createTextNode('Corregida: '), fr('span', corrected, 'build-fr')],
      errors,
      suggestionValue: tip,
    });
    finish();
  }

  checkButton.addEventListener('click', check);
  nextButton.addEventListener('click', () => {
    index += 1;
    showSituation();
    focusOn(situationEl);
  });

  return {
    // Muestra la primera situación de la lección (si tiene)
    show(nextLesson) {
      lesson = nextLesson;
      index = 0;
      card.hidden = lesson.situations.length === 0;
      if (!card.hidden) showSituation();
    },
    hide() {
      run += 1;
      setBusy(false);
      card.hidden = true;
    },
  };
}
