// Cifras de la pantalla Practica: palabras, lo que toca estudiar y las historias.
const fmt = (n) => n.toLocaleString('es');

export function practiceCounts({ wordCount, dueCount, newCount, textCount }) {
  const words = wordCount === 0
    ? 'Todavía no tienes palabras'
    : `${fmt(wordCount)} ${wordCount === 1 ? 'palabra' : 'palabras'}`;

  let study;
  if (dueCount === 0 && newCount === 0) {
    study = wordCount === 0 ? 'Añade palabras para empezar' : 'Al día';
  } else {
    const parts = [];
    if (dueCount > 0) parts.push(`${fmt(dueCount)} para repasar`);
    if (newCount > 0) parts.push(`${fmt(newCount)} ${newCount === 1 ? 'nueva' : 'nuevas'}`);
    study = parts.join(' y ');
  }

  const reader = textCount === 0
    ? 'Todavía no tienes historias'
    : `${fmt(textCount)} ${textCount === 1 ? 'historia' : 'historias'}`;

  return { words, study, reader };
}
