// Cola diaria de repaso: primero las vencidas, después las nuevas hasta el límite
import { cardIdOf, dueOf } from './scheduler.js';

const item = (wordId, direction, isNew) => ({ cardId: cardIdOf(wordId, direction), wordId, direction, isNew });

// Tarjetas ya estudiadas de palabras que existen, vencidas hasta «date», ordenadas
// por fecha y, a igual fecha, por último repaso (las falladas hace poco al final)
function dueCards({ words, cards, settings, date }) {
  const due = [];
  for (const word of words) {
    const card = cards[cardIdOf(word.id, settings.direction)];
    const cardDue = card ? dueOf(card, settings.algorithm) : null;
    if (cardDue !== null && cardDue <= date) due.push({ card, due: cardDue });
  }
  const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  due.sort((a, b) => byText(a.due, b.due) || byText(a.card.lastReviewedAt ?? '', b.card.lastReviewedAt ?? ''));
  return due.map(({ card }) => card);
}

export function buildQueue({ words, cards, settings, today }) {
  const { direction, newPerDay } = settings;
  const queue = dueCards({ words, cards, settings, date: today })
    .map((card) => item(card.wordId, direction, false));

  // Las nuevas presentadas hoy (en esta dirección) gastan el límite diario
  const introducedToday = Object.values(cards)
    .filter((card) => card.direction === direction && card.introducedOn === today).length;
  let room = Math.max(0, newPerDay - introducedToday);
  for (const word of words) {
    if (room === 0) break;
    if (!cards[cardIdOf(word.id, direction)]) {
      queue.push(item(word.id, direction, true));
      room -= 1;
    }
  }
  return queue;
}

// Cuántos repasos (no nuevas) vencen hasta «date» (por ejemplo, mañana)
export function countDueOn({ words, cards, settings, date }) {
  return dueCards({ words, cards, settings, date }).length;
}
