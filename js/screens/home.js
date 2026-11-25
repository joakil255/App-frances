// Inicio: la tarjeta de «Construir frases» y guardar o restaurar la copia de seguridad completa.
// Restaurar reemplaza todo tras confirmar; después la app se recarga para leer los datos nuevos.
import { buildBackup, backupFileName, readBackup, restoreBackup, restoreWarning, MAX_BACKUP_BYTES } from '../lib/backup.js';
import { MESSAGES, storageMessage, fileTooLarge, FILE_UNREADABLE } from '../lib/messages.js';
import { countDueToday, lessonStatus } from '../lib/build-review.js';
import { localDate } from '../lib/dates.js';

const $ = (selector, root = document) => root.querySelector(selector);
const RESTORED_KEY = 'app-frances-restored';
const count = (n, one, many) => `${n.toLocaleString('es')} ${n === 1 ? one : many}`;
const pad = (n) => String(n).padStart(2, '0');
const dayOf = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
// «160 palabras, 98 tarjetas estudiadas, 1234 respuestas y 3 historias» (sin historias si no se conocen)
const contents = ({ words, cards, answers, texts }) => {
  const parts = [count(words, 'palabra', 'palabras'), count(cards, 'tarjeta estudiada', 'tarjetas estudiadas'), count(answers, 'respuesta', 'respuestas')];
  if (typeof texts === 'number') parts.push(count(texts, 'historia', 'historias'));
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`;
};

function textEl(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

// getLessons: las lecciones cargadas ([{ id, lesson, error }]) o null si aún no llegan o no se pudieron leer
export function initHome({ wordStore, studyStore, textStore, buildStore, backend, getLessons = () => null, now = () => new Date() }) {
  const notice = $('#home-notice');
  const status = $('#home-status');
  const fileInput = $('#backup-file');
  const restoreButton = $('#backup-restore');
  const dialog = $('#restore-confirm');
  const confirmButton = $('[data-action="confirm"]', dialog);
  let pending = null; // copia leída y validada, esperando confirmación

  function showNotice({ title, text }) {
    notice.replaceChildren(textEl('strong', title), ...(text ? [textEl('span', ` ${text}`)] : []));
    notice.hidden = false;
  }
  function clearMessages() {
    notice.hidden = true;
    notice.replaceChildren();
    status.textContent = '';
  }
  const current = () => {
    const { cards, history, settings } = studyStore.getState();
    return { words: wordStore.getWords(), texts: textStore.getTexts(), build: buildStore.getState(), study: { cards, history, settings } };
  };

  // --- Construir frases: próxima lección y repaso de hoy ---
  const buildNext = $('#home-build-next');
  const buildDue = $('#home-build-due');
  const continueButton = $('#home-build-continue');
  const reviewButton = $('#home-build-review');
  let nextHref = '#/construir';

  function renderBuildCard() {
    const lessons = getLessons();
    const { progress, cards } = buildStore.getState();
    // Sin lecciones todavía solo se cuentan las frases propias (las de ejercicio necesitan su lección)
    const due = countDueToday({ cards, lessons: lessons ?? [], algorithm: studyStore.getState().settings.algorithm, today: localDate(now()) });
    buildDue.textContent = `Repaso: ${due} ${due === 1 ? 'pendiente' : 'pendientes'} hoy`;
    reviewButton.textContent = `Repasar (${due})`;
    if (due === 0) reviewButton.setAttribute('aria-disabled', 'true');
    else reviewButton.removeAttribute('aria-disabled');

    const valid = (lessons ?? []).filter((entry) => entry.lesson);
    const next = valid.find((entry) => lessonStatus(entry.lesson, progress[entry.id]).state !== 'done');
    buildNext.hidden = valid.length === 0;
    buildNext.textContent = next ? `Próxima lección: ${next.lesson.title}` : 'Terminaste todas las lecciones';
    // Sin lecciones cargadas, «Seguir lección» lleva a la lista; con todas terminadas, no se muestra
    continueButton.hidden = valid.length > 0 && !next;
    nextHref = next ? `#/construir/${next.id}` : '#/construir';
  }
  continueButton.addEventListener('click', () => {
    location.hash = nextHref;
  });
  reviewButton.addEventListener('click', () => {
    if (reviewButton.getAttribute('aria-disabled') !== 'true') location.hash = '#/construir/repaso';
  });
  renderBuildCard();

  // --- Guardar copia ---
  $('#backup-save').addEventListener('click', () => {
    clearMessages();
    const { words, study, texts, build } = current();
    const text = buildBackup({ words, study, texts, build, now: now() });
    // Solo se descarga una copia que se pueda restaurar
    if (readBackup(text).fatal) {
      showNotice(MESSAGES.backupUnverified);
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName(now());
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `Se guardó la copia con ${count(words.length, 'palabra', 'palabras')} `
      + `y ${count(study.history.length, 'respuesta', 'respuestas')}.`;
  });

  // --- Restaurar copia ---
  restoreButton.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    clearMessages();
    if (file.size > MAX_BACKUP_BYTES) {
      showNotice(fileTooLarge(10));
      return;
    }
    let text;
    try {
      text = await file.text();
    } catch {
      showNotice({ title: MESSAGES.restoreFailed.title, text: FILE_UNREADABLE });
      return;
    }
    const read = readBackup(text);
    if (read.fatal) {
      showNotice({ title: MESSAGES.restoreFailed.title, text: read.fatal });
      return;
    }
    pending = read.backup;
    const { words, study, texts } = current();
    const mine = { words: words.length, cards: Object.keys(study.cards).length, answers: study.history.length, texts: read.backup.texts && texts.length };
    $('#restore-title').textContent = `¿Restaurar la copia del ${dayOf(read.summary.createdAt)}?`;
    $('.restore-text', dialog).textContent = `La copia tiene ${contents(read.summary)}.\n`
      + `Tus datos actuales: ${contents(mine)}. ${restoreWarning(read.backup)}`;
    confirmButton.disabled = false;
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="close"]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    pending = null;
    restoreButton.focus();
  });

  confirmButton.addEventListener('click', () => {
    if (!pending || confirmButton.disabled) return;
    confirmButton.disabled = true; // un doble toque no restaura dos veces
    const { createdAt } = pending;
    try {
      restoreBackup(backend, pending);
    } catch (error) {
      dialog.close();
      showNotice(storageMessage(error));
      return;
    }
    try {
      sessionStorage.setItem(RESTORED_KEY, createdAt);
    } catch {
      // sin sessionStorage solo se pierde el aviso de «restaurada»
    }
    location.hash = '#/';
    location.reload();
  });

  // Aviso tras la recarga de una restauración
  try {
    const restored = sessionStorage.getItem(RESTORED_KEY);
    if (restored) {
      sessionStorage.removeItem(RESTORED_KEY);
      status.textContent = `Se restauró la copia del ${dayOf(restored)}.`;
    }
  } catch {
    // sin sessionStorage no hay aviso
  }

  return {
    // Al mostrar Inicio, al llegar las lecciones y si otra pestaña cambia el progreso
    refresh: renderBuildCard,
  };
}
