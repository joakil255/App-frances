// Tarjeta de una palabra de Claude en Conversar: qué significa en la frase, su forma base,
// escucharla y guardarla en el vocabulario. Todo se pinta con textContent.
import { lookupUrl, sendLookup, resolveLookup, findInVocabulary, wordFromLookup, isSavedToken } from '../lib/lookup.js';
import { chatMessage, storageMessage } from '../lib/messages.js';
import { StorageError } from '../lib/storage.js';
import { RATES } from '../lib/speech.js';
import { playFrench } from './voice.js';

const $ = (selector, root = document) => root.querySelector(selector);
const LANG = 'fr';

const PART_OF_SPEECH = {
  noun: 'sustantivo',
  proper_noun: 'nombre propio',
  verb: 'verbo',
  adjective: 'adjetivo',
  adverb: 'adverbio',
  pronoun: 'pronombre',
  article: 'artículo',
  preposition: 'preposición',
  conjunction: 'conjunción',
  number: 'número',
  interjection: 'interjección',
  expression: 'expresión',
  other: 'otra',
};
const GENDER = { m: 'masculino', f: 'femenino' };
const SAVED_SUFFIX = ', en tu vocabulario';

function line(tag, value) {
  const node = document.createElement(tag);
  node.textContent = value;
  return node;
}

export function initWordCard({ wordStore, cache, fetch, isOnline, hostname, getCode, synth, beforeSpeak }) {
  const url = lookupUrl(hostname);
  const dialog = $('#word-card');
  const title = $('#word-card-title');
  const status = $('.word-card-status', dialog);
  const notice = $('.word-card-notice', dialog);
  const info = $('.word-card-info', dialog);
  const field = (name) => $(`[data-field="${name}"]`, dialog);
  const saveButton = $('[data-action="save"]', dialog);

  let current = null; // { token, result } de la palabra abierta
  let request = 0; // una respuesta que llega tarde (de otra palabra o tras cerrar) se ignora
  let returnFocusTo = null;
  let saving = false;

  function showMessage({ title: heading, text }) {
    notice.replaceChildren(line('strong', heading), ...(text ? [line('span', ` ${text}`)] : []));
    notice.hidden = false;
  }
  function clearMessage() {
    notice.hidden = true;
    notice.replaceChildren();
  }
  // La zona de estado nunca se oculta (si no, el lector de pantalla puede no anunciarla): solo cambia su texto
  function setStatus(text) {
    status.textContent = text;
  }

  // «Guardar», o desactivado si ya está («Ya está en tu vocabulario») o se acaba de guardar («Guardada»).
  // aria-disabled en vez de disabled: el foco se queda en el botón y se oye el cambio.
  function setSaveState(state) {
    const texts = { save: 'Guardar', already: 'Ya está en tu vocabulario', saved: 'Guardada' };
    saveButton.textContent = texts[state];
    if (state === 'save') saveButton.removeAttribute('aria-disabled');
    else saveButton.setAttribute('aria-disabled', 'true');
    saveButton.hidden = false;
  }

  const inVocabulary = (result) => findInVocabulary(wordStore.getWords(), { lang: LANG, lemma: result.lemma, fr: result.baseWithArticle });

  function showResult(result) {
    const isNoun = result.partOfSpeech === 'noun';
    field('context').textContent = result.contextTranslation;
    field('base').textContent = isNoun ? result.baseWithArticle : result.lemma;
    field('base-es').textContent = result.lemmaTranslation;
    field('type').textContent = PART_OF_SPEECH[result.partOfSpeech] ?? PART_OF_SPEECH.other;
    field('gender').textContent = GENDER[result.gender] ?? '';
    field('gender').hidden = !GENDER[result.gender];
    info.hidden = false;
    setSaveState(inVocabulary(result) ? 'already' : 'save');
  }

  // Sin código guardado o con uno incorrecto se avisa aquí; no se abren otras ventanas
  function send({ lang, word, sentence }) {
    const code = getCode();
    if (!code) return Promise.resolve({ ok: false, error: 'unauthorized' });
    return sendLookup({ url, code, body: { lang, word, sentence }, fetch, isOnline: isOnline() });
  }

  async function open(token, buttonEl) {
    beforeSpeak(); // corta el micrófono antes de abrir la tarjeta
    const id = ++request;
    current = null;
    returnFocusTo = buttonEl;
    title.textContent = token.text;
    info.hidden = true;
    saveButton.hidden = true;
    clearMessage();
    setStatus('Buscando…');
    if (!dialog.open) dialog.showModal();
    title.focus();

    const outcome = await resolveLookup({ cache, lang: LANG, word: token.word, sentence: token.sentence, isOnline: isOnline(), send });
    if (id !== request) return;
    setStatus('');
    if (!outcome.ok) {
      showMessage(chatMessage(outcome.error));
      return;
    }
    current = { token, result: outcome.result };
    showResult(outcome.result);
    refresh(); // la consulta nueva puede subrayar otras formas de una palabra guardada
  }

  async function save() {
    if (!current || saving || saveButton.hasAttribute('aria-disabled')) return;
    const { token, result } = current;
    clearMessage();
    if (inVocabulary(result)) {
      setSaveState('already');
      return;
    }
    saving = true;
    try {
      const saved = await wordStore.saveWord(wordFromLookup(result, token.sentence));
      if (saved.ok) {
        setSaveState('saved');
        refresh();
      } else {
        showMessage({ title: Object.values(saved.errors).join(' '), text: '' }); // el error de la validación
      }
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      showMessage(storageMessage(error));
    } finally {
      saving = false;
    }
  }

  // Subraya en todo el chat las palabras que ya están en el vocabulario (sin escribir nada al pintar)
  function refresh() {
    const words = wordStore.getWords();
    for (const button of document.querySelectorAll('#chat-log .chat-word')) {
      const { word, sentence } = button.dataset;
      const saved = isSavedToken(words, cache, LANG, word, sentence);
      button.classList.toggle('chat-word-saved', saved);
      if (saved) button.setAttribute('aria-label', `${button.textContent}${SAVED_SUFFIX}`);
      else button.removeAttribute('aria-label');
    }
  }

  setStatus(''); // así la primera apertura también cambia el texto y se anuncia

  dialog.addEventListener('click', (event) => {
    // La tarjeta no tiene relleno propio: un toque en el propio <dialog> es fuera de ella
    if (event.target === dialog || event.target.closest('[data-action="close"]')) dialog.close();
    else if (event.target.closest('[data-action="listen"]') && current) {
      beforeSpeak();
      playFrench({ synth, text: current.result.baseWithArticle, rate: RATES.normal, notice });
    } else if (event.target.closest('[data-action="save"]')) save();
  });
  dialog.addEventListener('close', () => {
    request += 1;
    current = null;
    if (returnFocusTo?.isConnected) returnFocusTo.focus();
  });

  return { open, refresh };
}
