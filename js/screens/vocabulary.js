// Pantalla Vocabulario: lista, búsqueda, ficha, formulario, borrar, importar y exportar.
// Todo texto del usuario se escribe con textContent o value, nunca como HTML.
import { filterWords, categoriesOf } from '../lib/words.js';
import { exportJson, exportCsv, exportFileName, readImport, planImport, MAX_IMPORT_BYTES } from '../lib/transfer.js';
import { StorageError } from '../lib/storage.js';
import { RATES, pickFrenchVoice, loadVoices, speak } from '../lib/speech.js';

const GENDER_NAMES = { m: 'masculino', f: 'femenino' };
const FORM_FIELDS = ['fr', 'es', 'gender', 'category', 'exampleFr', 'exampleEs'];
const NO_VOICE_STEPS = 'Para instalarla en Android: Ajustes → Sistema → Idiomas → Salida de texto a voz → '
  + 'Motor preferido (⚙) → Instalar datos de voz → Francés (Francia). El camino puede cambiar según el teléfono.';

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
  let voicesPromise = null;

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
    if (error.code === 'quota') {
      showNotice('No hay espacio para guardar.', 'Exporta tus palabras como copia y borra las que no necesites.');
    } else {
      showNotice('El navegador no deja guardar datos.', 'Comprueba que no estás en modo privado.');
    }
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
      const target = returnFocusTo && returnFocusTo.isConnected ? returnFocusTo : search;
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
    emptyText.hidden = shown.length > 0;
    emptyText.textContent = all.length === 0
      ? 'Todavía no hay palabras. Añade una o importa un archivo.'
      : 'Ninguna palabra coincide con la búsqueda.';
  }

  // Botón de la fila de una palabra (tras volver a dibujar la lista), o null si no se ve
  function rowButton(id) {
    return list.querySelector(`[data-id="${CSS.escape(id)}"] .word-open`);
  }

  search.addEventListener('input', render);
  categorySelect.addEventListener('change', render);
  genderSelect.addEventListener('change', render);

  // --- Voz ---
  function voiceNoticeFor(target) {
    return target === 'detail' ? $('.voice-notice', detail) : notice;
  }
  async function listenTo(text, rate, target = 'list') {
    const box = voiceNoticeFor(target);
    if (!synth) {
      box.replaceChildren(el('strong', { text: 'Este navegador no puede leer en voz alta.' }));
      box.hidden = false;
      return;
    }
    voicesPromise ||= loadVoices(synth);
    const choice = pickFrenchVoice(await voicesPromise);
    if (!choice) {
      voicesPromise = null; // quizá se instale una voz; se vuelve a buscar la próxima vez
      box.replaceChildren(el('strong', { text: 'No hay voz francesa en este dispositivo.' }), el('span', { text: ` ${NO_VOICE_STEPS}` }));
      box.hidden = false;
      return;
    }
    if (!choice.exact && target === 'detail') {
      box.replaceChildren(el('span', { text: `Voz francesa con otro acento (${choice.voice.lang}).` }));
      box.hidden = false;
    }
    speak(synth, choice.voice, text, rate);
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

  $('#vocab-add').addEventListener('click', (event) => openForm(null, event.currentTarget));

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
      formError.textContent = error.code === 'quota'
        ? 'No hay espacio para guardar. Exporta tus palabras y borra las que no necesites.'
        : 'El navegador no deja guardar datos. Comprueba que no estás en modo privado.';
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
      showNotice('El archivo pasa de 2 MB.');
      return;
    }
    const read = readImport(await file.text(), file.name);
    if (read.fatal) {
      showNotice(`No se pudo importar «${file.name}».`, read.fatal);
      return;
    }
    pendingPlan = planImport(read.rows, store.getWords());
    showImportSummary(file.name, read.ignoredColumns, pendingPlan);
  });

  function showImportSummary(fileName, ignoredColumns, plan) {
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
    openDialog(importDialog, $('#vocab-import'));
  }

  async function runImport(replaceDuplicates, dialog) {
    try {
      const { added, replaced } = await store.applyImport(pendingPlan, { replaceDuplicates });
      say(replaced > 0
        ? `Se importaron ${plural(added, 'palabra nueva', 'palabras nuevas')} y se reemplazaron ${replaced}.`
        : `Se importaron ${plural(added, 'palabra nueva', 'palabras nuevas')}.`);
      returnFocusTo = $('#vocab-import');
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
      openDialog(replaceDialog, $('#vocab-import'));
    }
  });
  $('[data-action="confirm"]', replaceDialog).addEventListener('click', () => runImport(true, replaceDialog));

  // --- Arranque ---
  async function start() {
    try {
      const { corruptBackupKey } = await store.load();
      if (corruptBackupKey) {
        showNotice('Tus datos guardados estaban dañados.',
          'Se guardó una copia sin tocar y la lista empezó vacía. Si tienes una exportación, impórtala.');
      }
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
  }

  return start();
}
