// Plan del día en Aprende: la acción principal, la línea «Después» y las tres estaciones.
const fmt = (n) => n.toLocaleString('es');
const words = (n) => `${fmt(n)} ${n === 1 ? 'palabra' : 'palabras'}`;
const sentences = (n) => `${fmt(n)} ${n === 1 ? 'frase' : 'frases'}`;
const pending = (n) => `${fmt(n)} ${n === 1 ? 'pendiente' : 'pendientes'}`;

export function todayPlan({ hasWords, wordsDue, sentencesDue, lesson, lessonsReady }) {
  const lessonText = lesson ? `la lección ${lesson.number}, «${lesson.title}»` : null;
  let title;
  let action = null;
  let followUp;

  if (wordsDue > 0 || sentencesDue > 0) {
    const onWords = wordsDue > 0;
    const n = onWords ? wordsDue : sentencesDue;
    const noun = onWords ? words(n) : sentences(n);
    title = `${noun} ${n === 1 ? 'te espera' : 'te esperan'}`;
    action = { text: `Repasar ${noun}`, href: onWords ? '#/estudiar' : '#/construir/repaso' };
    const next = [];
    if (onWords && sentencesDue > 0) next.push(sentences(sentencesDue));
    if (lessonText) next.push(lessonText);
    const after = next.length ? `Después: ${next.join(' y ')}.` : 'Después de esto, tu repaso de hoy queda completo.';
    followUp = !onWords && hasWords ? `Tus palabras ya están al día. ${after}` : after;
  } else {
    title = 'Tu repaso de hoy está completo';
    // Sin palabras en la lista no se dice que estén al día
    const upToDate = hasWords ? 'Tus palabras y tus frases están al día.' : 'Tus frases están al día.';
    if (lesson) {
      action = { text: `Continuar: Lección ${lesson.number} · ${lesson.title}`, href: `#/construir/${lesson.id}` };
      followUp = upToDate;
    } else if (lessonsReady) {
      followUp = 'Completaste todas las lecciones disponibles. Mañana tendrás más repaso.';
    } else {
      followUp = `${upToDate} Las lecciones todavía no están disponibles.`;
    }
  }

  // Estaciones: la primera con algo pendiente es la actual
  const stations = [];
  if (!hasWords && wordsDue === 0) stations.push({ name: 'Palabras', state: 'done', text: 'Sin palabras' });
  else if (wordsDue === 0) stations.push({ name: 'Palabras', state: 'done', text: 'Al día' });
  else stations.push({ name: 'Palabras', state: 'current', text: `Ahora: ${pending(wordsDue)}` });

  if (sentencesDue === 0) stations.push({ name: 'Frases', state: 'done', text: 'Al día' });
  else if (wordsDue === 0) stations.push({ name: 'Frases', state: 'current', text: `Ahora: ${pending(sentencesDue)}` });
  else stations.push({ name: 'Frases', state: 'todo', text: pending(sentencesDue) });

  if (lesson) {
    const idle = wordsDue === 0 && sentencesDue === 0;
    stations.push({ name: 'Lección', state: idle ? 'current' : 'todo', text: idle ? `Ahora: Lección ${lesson.number}` : `Lección ${lesson.number}` });
  } else if (lessonsReady) stations.push({ name: 'Lección', state: 'done', text: 'Terminadas' });
  else stations.push({ name: 'Lección', state: 'todo', text: 'Sin cargar' });

  return { title, action, followUp, showMore: action === null, stations };
}
