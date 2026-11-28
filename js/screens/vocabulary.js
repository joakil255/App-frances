// Pantalla Vocabulario: lista, búsqueda, ficha, formulario, borrar, importar y exportar.
// Todo texto del usuario se escribe con textContent o value, nunca como HTML.
import { filterWords, categoriesOf } from '../lib/words.js';
import { exportJson, exportCsv, exportFileName, readImport, planImport, MAX_IMPORT_BYTES } from '../lib/transfer.js';
import { loadDeck, A1_DECK_NAME } from '../lib/deck.js';
import { StorageError } from '../lib/storage.js';
import { MESSAGES, storageMessage, joined, importFailed, fileTooLarge, FILE_UNREADABLE } from '../lib/messages.js';
import { RATES } from '../lib/speech.js';
import { playFrench } from './voice.js';
import { resolveRoute } from '../lib/router.js';

const GENDER_NAMES = { m: 'masculino', f: 'femenino' };
const FORM_FIELDS = ['fr', 'es', 'gender', 'category', 'exampleFr', 'exampleEs'];

const $ = (selector, root = document) => root.querySelector(selector);

// Crea un elemento con texto (siempre textContent) y atributos
function el(tag, { text, className, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}

// Icono de altavoz en SVG, dibujado con createElementNS (sin HTML)
function speakerIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const shapes = [
    ['path', { d: 'M3 9v6h4l5 4V5L7 9H3z', fill: 'currentColor' }],
    ['path', { d: 'M15.5 8.5a5 5 0 0 1 0 7', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' }],
    ['path', { d: 'M18 6a8.5 8.5 0 0 1 0 12', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' }],
  ];
  for (const [tag, attrs] of shapes) {
    const shape = document.createElementNS(NS, tag);
    for (const [name, value] of Object.entries(attrs)) shape.setAttribute(name, value);
    svg.append(shape);
  }
  return svg;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function initVocabulary({ store, synth, now = () => new Date() }) {
  const search = $('#vocab-search');
  const categorySelect = $('#vocab-category');
  const genderSelect = $('#vocab-gender');
  const list = $('#vocab-list');
  const count = $('#vocab-count');
  const emptyText = $('#vocab-empty');
  const startBlock = $('#vocab-start');
  const heading = $('#screen-vocabulary h1');
  const notice = $('#vocab-notice');
  const message = $('#vocab-message');
  const fileInput = $('#vocab-file');

  const detail = $('#word-detail');
  const formDialog = $('#word-form');
  const form = $('form', formDialog);
  const deleteDialog = $('#confirm-delete');
  const importDialog = $('#import-summary');
  const replaceDialog = $('#confirm-replace');
  const exportDialog = $('#export-choice');

  let currentWord = null; // palabra abierta en la ficha
  let editingId = null; // null = añadiendo
  let pendingPlan = null; // plan de importación esperando decisión
  let returnFocusTo = null;

  // --- Avisos y mensajes ---
  function showNotice(title, text = '') {
    notice.replaceChildren(el('strong', { text: title }), ...(text ? [el('span', { text: ` ${text}` })] : []));
    notice.hidden = false;
  }
  function clearNotice() {
    notice.hidden = true;
    notice.replaceChildren();
  }
  function say(text) {
    message.textContent = text;
  }
  function storageProblem(error) {
    if (!(error instanceof StorageError)) throw error;
    const { title, text } = storageMessage(error);
    showNotice(title, text);
  }

  // --- Ventanas ---
  function openDialog(dialog, opener = document.activeElement) {
    returnFocusTo = opener;
    dialog.showModal();
  }
  for (const dialog of [detail, formDialog, deleteDialog, importDialog, replaceDialog, exportDialog]) {
    dialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="close"]')) dialog.close();
    });
    dialog.addEventListener('close', () => {
      // Si el botón que abrió la ventana ya no se ve (el bloque vacío desapareció), el foco va al título
      let target = search;
      if (returnFocusTo && returnFocusTo.isConnected) target = returnFocusTo.offsetParent === null ? heading : returnFocusTo;
      if (!document.querySelector('dialog[open]')) target.focus();
    });
  }

  // --- Lista ---
  function renderCategories() {
    const categories = categoriesOf(store.getWords());
    const selected = categorySelect.value;
    const options = [el('option', { text: 'Todas', attrs: { value: 'all' } })];
    for (const name of categories) options.push(el('option', { text: name, attrs: { value: name } }));
    options.push(el('option', { text: 'Sin categoría', attrs: { value: '' } }));
    categorySelect.replaceChildren(...options);
    categorySelect.value = selected === '' || categories.includes(selected) ? selected : 'all';

    $('#category-options').replaceChildren(...categories.map((name) => el('option', { attrs: { value: name } })));
  }

  function wordRow(word) {
    const listen = el('button', { className: 'listen-button', attrs: { type: 'button', 'aria-label': `Oír «${word.fr}»` } },
      [speakerIcon()]);
    listen.addEventListener('click', () => listenTo(word.fr, RATES.normal));

    const meta = el('span', { className: 'word-meta' });
    if (word.category) meta.append(el('span', { text: word.category }));
    if (word.needsReview) meta.append(el('span', { className: 'tag-review', text: 'Revisar' }));

    const open = el('button', { className: 'word-open', attrs: { type: 'button' } }, [
      el('span', { className: 'word-text' }, [
        el('span', { className: 'word-fr', text: word.fr, attrs: { lang: 'fr' } }),
        el('span', { className: 'word-es', text: word.es }),
        meta,
      ]),
      el('span', { className: 'word-chevron', text: '›', attrs: { 'aria-hidden': 'true' } }),
    ]);
    open.addEventListener('click', () => openDetail(word, open));

    return el('li', { className: 'word-row', attrs: { 'data-id': word.id } }, [listen, open]);
  }

  function render() {
    const all = store.getWords();
    const shown = filterWords(all, { query: search.value, category: categorySelect.value, gender: genderSelect.value });
    list.replaceChildren(...shown.map(wordRow));
    count.textContent = `${shown.length} de ${plural(all.length, 'palabra', 'palabras')}`;
    const noWords = all.length === 0;
    // Sin palabras: bloque de inicio con acción; con palabras: el aviso de búsqueda sin resultados
    startBlock.hidden = !noWords;
    emptyText.hidden = noWords || shown.length > 0;
    emptyText.textContent = 'Ninguna palabra coincide con la búsqueda.';
    $('#vocab-add').hidden = noWords;
    $('#vocab-deck').hidden = noWords;
  }

  // Botón de la fila de una palabra (tras volver a dibujar la lista), o null si no se ve
  function rowButton(id) {
    return list.querySelector(`[data-id="${CSS.escape(id)}"] .word-open`);
  }

  search.addEventListener('input', render);
  categorySelect.addEventListener('change', render);
  genderSelect.addEventListener('change', render);

  // --- Voz: en la ficha el aviso va dentro de la ventana; en la lista, arriba ---
  function listenTo(text, rate, target = 'list') {
    const inDetail = target === 'detail';
    return playFrench({ synth, text, rate, notice: inDetail ? $('.voice-notice', detail) : notice, showAccent: inDetail });
  }

  // --- Ficha ---
  function openDetail(word, opener) {
    currentWord = word;
    $('#detail-fr').textContent = word.fr;
    $('.detail-es', detail).textContent = word.es;
    const meta = [GENDER_NAMES[word.gender] ?? 'sin género', word.category].filter(Boolean).join(' · ');
    $('.detail-meta', detail).replaceChildren(
      el('span', { text: meta }),
      ...(word.needsReview ? [el('span', { className: 'tag-review', text: 'Revisar' })] : []),
    );
    const example = $('.detail-example', detail);
    example.hidden = !word.exampleFr;
    $('.example-fr', detail).textContent = word.exampleFr;
    $('.example-es', detail).textContent = word.exampleEs;
    $('.voice-notice', detail).hidden = true;
    openDialog(detail, opener);
  }

  detail.addEventListener('click', (event) => {
    const rateButton = event.target.closest('[data-rate]');
    if (rateButton) listenTo(currentWord.fr, RATES[rateButton.dataset.rate], 'detail');
    if (event.target.closest('[data-action="edit"]')) {
      const opener = returnFocusTo;
      detail.close();
      openForm(currentWord, opener);
    }
    if (event.target.closest('[data-action="delete"]')) {
      const opener = returnFocusTo;
      detail.close();
      $('#delete-title').textContent = `¿Borrar «${currentWord.fr}»?`;
      openDialog(deleteDialog, opener);
    }
  });

  // --- Borrar ---
  $('[data-action="confirm"]', deleteDialog).addEventListener('click', async () => {
    try {
      await store.deleteWord(currentWord.id);
      clearNotice();
      say(`Se borró «${currentWord.fr}».`);
      returnFocusTo = search;
      deleteDialog.close();
      renderCategories();
      render();
    } catch (error) {
      deleteDialog.close();
      storageProblem(error);
    }
  });

  // --- Formulario ---
  function setFieldError(field, text) {
    const error = $(`#error-${field}`);
    error.textContent = text || '';
    error.hidden = !text;
    const inputs = field === 'gender' ? form.querySelectorAll('input[name="gender"]') : [form.elements[field]];
    for (const input of inputs) {
      if (text) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
  function clearFormErrors() {
    for (const field of FORM_FIELDS) setFieldError(field, '');
    $('.form-error', form).hidden = true;
  }

  function openForm(word, opener) {
    editingId = word ? word.id : null;
    $('#form-title').textContent = word ? 'Editar palabra' : 'Añadir palabra';
    form.reset();
    clearFormErrors();
    if (word) {
      for (const field of ['fr', 'es', 'category', 'exampleFr', 'exampleEs']) form.elements[field].value = word[field] || '';
      form.elements.needsReview.checked = Boolean(word.needsReview);
    }
    const gender = word ? word.gender ?? '' : '';
    form.querySelector(`input[name="gender"][value="${gender}"]`).checked = true;
    openDialog(formDialog, opener);
    form.elements.fr.focus();
  }

  for (const id of ['#vocab-add', '#vocab-start-add']) {
    $(id).addEventListener('click', (event) => openForm(null, event.currentTarget));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFormErrors();
    const input = {
      fr: form.elements.fr.value,
      es: form.elements.es.value,
      gender: form.elements.gender.value,
      category: form.elements.category.value,
      exampleFr: form.elements.exampleFr.value,
      exampleEs: form.elements.exampleEs.value,
      needsReview: form.elements.needsReview.checked,
    };
    try {
      const result = await store.saveWord(input, editingId);
      if (!result.ok) {
        for (const [field, text] of Object.entries(result.errors)) setFieldError(field, text);
        const first = FORM_FIELDS.find((field) => result.errors[field]);
        const target = first === 'gender' ? form.querySelector('input[name="gender"]:checked') : form.elements[first];
        target.focus();
        return;
      }
      clearNotice();
      say(`Se guardó «${result.word.fr}».`);
      renderCategories();
      render();
      // El foco vuelve a la palabra guardada (si el filtro la oculta, al buscador)
      returnFocusTo = rowButton(result.word.id) || search;
      formDialog.close();
    } catch (error) {
      if (!(error instanceof StorageError)) throw error;
      const formError = $('.form-error', form);
      formError.textContent = joined(storageMessage(error));
      formError.hidden = false;
    }
  });

  // --- Exportar ---
  $('#vocab-export').addEventListener('click', (event) => openDialog(exportDialog, event.currentTarget));
  exportDialog.addEventListener('click', (event) => {
    const button = event.target.closest('[data-format]');
    if (!button) return;
    const kind = button.dataset.format;
    const words = store.getWords();
    const text = kind === 'json' ? exportJson(words, now()) : exportCsv(words);
    const type = kind === 'json' ? 'application/json' : 'text/csv;charset=utf-8';
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = el('a', { attrs: { href: url, download: exportFileName(kind, now()) } });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    exportDialog.close();
    say(`Se exportaron ${plural(words.length, 'palabra', 'palabras')} en ${kind.toUpperCase()}.`);
  });

  // --- Importar ---
  $('#vocab-import').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    clearNotice();
    if (file.size > MAX_IMPORT_BYTES) {
      const { title, text } = fileTooLarge(2);
      showNotice(title, text);
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      const { title, text: reason } = importFailed(file.name, FILE_UNREADABLE);
      showNotice(title, reason);
      return;
    }
    const read = readImport(text, file.name);
    if (read.fatal) {
      const { title, text } = importFailed(file.name, read.fatal);
      showNotice(title, text);
      return;
    }
    pendingPlan = planImport(read.rows, store.getWords());
    showImportSummary(file.name, read.ignoredColumns, pendingPlan, $('#vocab-import'));
  });

  // Mazo A1: el mismo resumen que al importar un archivo (no cambia nada hasta confirmar)
  async function openDeck(deckButton) {
    if (deckButton.disabled) return;
    deckButton.disabled = true; // evita abrir dos veces la ventana con un doble toque
    clearNotice();
    try {
      const read = await loadDeck(window.fetch.bind(window));
      if (read.fatal) {
        showNotice(read.fatal);
        return;
      }
      pendingPlan = planImport(read.rows, store.getWords());
      showImportSummary(A1_DECK_NAME, read.ignoredColumns, pendingPlan, deckButton);
    } finally {
      deckButton.disabled = false;
    }
  }
  for (const id of ['#vocab-deck', '#vocab-start-deck']) {
    $(id).addEventListener('click', (event) => openDeck(event.currentTarget));
  }

  // «source» es el botón que abrió la ventana: el foco vuelve a él al cerrarla
  let importSource = null;
  function showImportSummary(fileName, ignoredColumns, plan, source) {
    importSource = source;
    const { newWords, duplicates, invalid } = plan;
    $('#import-title').textContent = `Revisión de «${fileName}»`;
    $('.import-counts', importDialog).replaceChildren(
      el('li', { text: `${plural(newWords.length, 'palabra nueva', 'palabras nuevas')} para importar` }),
      el('li', { text: `${plural(duplicates.length, 'ya existe', 'ya existen')} en tu lista` }),
      el('li', { text: `${plural(invalid.length, 'fila con errores', 'filas con errores')}` }),
    );
    const ignored = $('.import-ignored', importDialog);
    ignored.hidden = ignoredColumns.length === 0;
    ignored.textContent = `Columnas que no se usan: ${ignoredColumns.join(', ')}.`;
    $('.import-invalid', importDialog).hidden = invalid.length === 0;
    $('.import-reasons', importDialog).replaceChildren(
      ...invalid.map(({ row, reasons }) => el('li', { text: `Fila ${row}: ${reasons.join(' ')}` })),
    );
    const importButton = $('[data-action="import"]', importDialog);
    importButton.hidden = newWords.length === 0;
    importButton.textContent = `Importar ${plural(newWords.length, 'nueva', 'nuevas')}`;
    $('[data-action="replace"]', importDialog).hidden = duplicates.length === 0;
    openDialog(importDialog, source);
  }

  async function runImport(replaceDuplicates, dialog) {
    try {
      const { added, replaced } = await store.applyImport(pendingPlan, { replaceDuplicates });
      say(replaced > 0
        ? `Se importaron ${plural(added, 'palabra nueva', 'palabras nuevas')} y se reemplazaron ${replaced}.`
        : `Se importaron ${plural(added, 'palabra nueva', 'palabras nuevas')}.`);
      returnFocusTo = importSource;
      dialog.close();
      renderCategories();
      render();
    } catch (error) {
      dialog.close();
      storageProblem(error);
    } finally {
      pendingPlan = null;
    }
  }

  importDialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="import"]')) runImport(false, importDialog);
    if (event.target.closest('[data-action="replace"]')) {
      const n = pendingPlan.duplicates.length;
      $('#replace-title').textContent = `¿Reemplazar ${plural(n, 'palabra', 'palabras')}?`;
      $('.replace-text', replaceDialog).textContent = `Se sobrescribirán ${n === 1 ? 'la palabra' : `las ${n} palabras`} de tu lista `
        + `con los datos del archivo, y se añadirán ${plural(pendingPlan.newWords.length, 'nueva', 'nuevas')}. No se puede deshacer.`;
      importDialog.close();
      openDialog(replaceDialog, importSource);
    }
  });
  $('[data-action="confirm"]', replaceDialog).addEventListener('click', () => runImport(true, replaceDialog));

  // --- Arranque ---
  async function start() {
    try {
      const { corruptBackupKey, migrationError } = await store.load();
      if (corruptBackupKey) {
        showNotice(MESSAGES.corruptWords.title, MESSAGES.corruptWords.text);
      }
      // No se pudo guardar la versión 2: las palabras siguen en memoria; se avisa del almacenamiento
      if (migrationError) storageProblem(migrationError);
    } catch (error) {
      storageProblem(error);
    }
    renderCategories();
    render();
    // Cambios guardados desde otra copia de la app: se vuelve a dibujar con la lista actual
    store.watchExternalChanges(window, () => {
      renderCategories();
      render();
    });
    // Al entrar en Vocabulario se vuelve a dibujar: Conversar puede haber guardado palabras
    window.addEventListener('hashchange', () => {
      if (resolveRoute(location.hash) !== 'vocabulary') return;
      renderCategories();
      render();
    });
  }

  return start();
}
