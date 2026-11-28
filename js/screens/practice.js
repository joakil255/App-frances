// Practica: las cifras de las baldosas (palabras, lo que toca estudiar hoy e historias).
// Todo se pinta con textContent. Usa la misma cola que Estudiar para que las cifras coincidan.
import { buildQueue } from '../lib/queue.js';
import { localDate } from '../lib/dates.js';
import { practiceCounts } from '../lib/practice.js';

const $ = (selector) => document.querySelector(selector);

export function initPractice({ wordStore, studyStore, textStore, now = () => new Date() }) {
  const words = $('#practice-words');
  const study = $('#practice-study');
  const reader = $('#practice-reader');

  function refresh() {
    const all = wordStore.getWords();
    const { cards, settings } = studyStore.getState();
    const queue = buildQueue({ words: all, cards, settings, today: localDate(now()) });
    const counts = practiceCounts({
      wordCount: all.length,
      dueCount: queue.filter((item) => !item.isNew).length,
      newCount: queue.filter((item) => item.isNew).length,
      textCount: textStore.getTexts().length,
    });
    words.textContent = counts.words;
    study.textContent = counts.study;
    reader.textContent = counts.reader;
  }

  return { refresh };
}
