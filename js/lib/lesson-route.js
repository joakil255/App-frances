// Lógica de la ruta de lecciones: estado de cada una, la próxima pendiente y su número.
import { lessonStatus } from './build-review.js';

// '2026-11-25' → '25/11/2026'
export function formatDay(date) {
  if (typeof date !== 'string') return '';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

// entry: una entrada de loadLessons; progress: el progreso de esa lección (puede faltar)
export function lessonState(entry, progress) {
  if (entry.status === 'planned') return { kind: 'planned', text: 'Próximamente' };
  if (!entry.lesson) return { kind: 'error', text: 'No se pudo cargar' };
  const { state, correct, total } = lessonStatus(entry.lesson, progress);
  if (state === 'new') return { kind: 'new', text: 'Sin empezar' };
  if (state === 'started') return { kind: 'started', text: `En curso: ${correct} de ${total}` };
  const last = progress?.lastPractice;
  if (last) return { kind: 'done', text: `Completada · ${last.firstTry} de ${last.total} a la primera · ${formatDay(last.date)}` };
  const day = formatDay(progress?.completedAt);
  return { kind: 'done', text: day ? `Completada · ${day}` : 'Completada' };
}

// Primera lección disponible, cargada y no completada; null si no hay
export function nextLesson(entries, progressMap) {
  return entries.find((entry) => entry.status === 'available' && entry.lesson
    && lessonStatus(entry.lesson, progressMap[entry.id]).state !== 'done') ?? null;
}

// Posición en la ruta empezando en 1 (0 si no existe)
export function lessonNumber(entries, id) {
  return entries.findIndex((entry) => entry.id === id) + 1;
}

// Partes de una lección que pueden llevar review: true (REVISAR)
const REVIEW_PARTS = ['idea', 'think', 'examples', 'pitfalls', 'exercises', 'situations'];
const hasReview = (lesson) => REVIEW_PARTS.some((part) => (lesson[part] ?? []).some((item) => item.review));
const isOpenable = (entry) => entry.status === 'available' && Boolean(entry.lesson);

// Filas de la ruta, en orden: lo que pinta el carrusel de Aprende. href solo en las que se pueden abrir;
// current solo en la siguiente pendiente
export function routeRows(entries, progressMap) {
  const next = nextLesson(entries, progressMap);
  return entries.map((entry, i) => {
    const { kind, text } = lessonState(entry, progressMap[entry.id]);
    const openable = isOpenable(entry);
    return {
      id: entry.id, number: i + 1, level: entry.level, title: entry.lesson?.title ?? entry.title,
      kind, stateText: text, href: openable ? `#/construir/${entry.id}` : null,
      current: entry === next, hasReview: openable && hasReview(entry.lesson),
    };
  });
}

// La entrada que se puede abrir con #/construir/<id>; null si es planificada, desconocida o no se cargó
export function openableLesson(entries, id) {
  return entries.find((entry) => entry.id === id && isOpenable(entry)) ?? null;
}

// Texto del botón «Continuar»; null si no hay lección pendiente
export function continueLabel(entries, progressMap) {
  const next = nextLesson(entries, progressMap);
  return next ? `Continuar: Lección ${lessonNumber(entries, next.id)} · ${next.lesson.title}` : null;
}
