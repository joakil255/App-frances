// Comprobación de frases de los ejercicios de «Construir frases» (funciones puras).
import { normalizeAnswer, foldAccents } from './answer-check.js';

// Palabras con su forma normalizada; la puntuación suelta («?») no cuenta
function toWords(text) {
  return String(text ?? '').split(/\s+/)
    .map((word) => ({ word, key: normalizeAnswer(word) }))
    .filter((w) => w.key !== '');
}

// Diferencia palabra por palabra (subsecuencia común más larga), sin plegar acentos
export function wordDiff(typed, expected) {
  const a = toWords(typed);
  const b = toWords(expected);
  const lcs = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i].key === b[j].key ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const result = [];
  let extras = [];
  let missings = [];
  // Une los sobrantes y faltantes de un tramo: se emparejan como «changed»
  const flush = () => {
    const pairs = Math.min(extras.length, missings.length);
    for (let k = 0; k < pairs; k++) result.push({ word: extras[k], status: 'changed', expected: missings[k] });
    extras.slice(pairs).forEach((word) => result.push({ word, status: 'extra' }));
    missings.slice(pairs).forEach((word) => result.push({ word, status: 'missing' }));
    extras = [];
    missings = [];
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].key === b[j].key) {
      flush();
      result.push({ word: a[i].word, status: 'same' });
      i++; j++;
    } else if (j >= b.length || (i < a.length && lcs[i + 1][j] >= lcs[i][j + 1])) {
      extras.push(a[i].word);
      i++;
    } else {
      missings.push(b[j].word);
      j++;
    }
  }
  flush();
  return result;
}

const distance = (diff) => diff.filter((d) => d.status !== 'same').length;

export function checkExercise(exercise, typed, { requireAccents }) {
  const text = String(typed ?? '');
  const full = (answer) => (exercise.type === 'gap' ? exercise.before + answer + exercise.after : answer);
  const candidates = exercise.answers.map((answer) => {
    const sentence = full(answer);
    return { sentence, diff: wordDiff(exercise.type === 'gap' ? full(text) : text, sentence) };
  });
  const best = candidates.reduce((a, b) => (distance(b.diff) < distance(a.diff) ? b : a));
  const typedKey = normalizeAnswer(exercise.type === 'gap' ? full(text) : text);

  if (normalizeAnswer(text) === '') {
    return { correct: false, accentOnly: false, explanation: exercise.rule, expected: best.sentence, diff: wordDiff('', best.sentence) };
  }
  const exact = candidates.find((c) => normalizeAnswer(c.sentence) === typedKey);
  if (exact) return { correct: true, accentOnly: false, explanation: null, expected: exact.sentence, diff: exact.diff };
  const folded = candidates.find((c) => foldAccents(normalizeAnswer(c.sentence)) === foldAccents(typedKey));
  if (folded) {
    const correct = !requireAccents;
    return {
      correct, accentOnly: true, expected: folded.sentence, diff: folded.diff,
      explanation: correct ? null : `Ojo con el acento: ${folded.sentence}`,
    };
  }
  const mistake = (exercise.mistakes ?? []).find((m) => normalizeAnswer(m.answer) === normalizeAnswer(text));
  return {
    correct: false, accentOnly: false, expected: best.sentence, diff: best.diff,
    explanation: mistake ? mistake.explanation : exercise.rule,
  };
}

// Frase libre: se compara con los modelos; si no coincide, la revisa la IA
export function checkFree(situation, typed, { requireAccents }) {
  const key = normalizeAnswer(typed);
  if (key === '') return { correct: false, accentOnly: false, needsAi: false };
  const models = situation.models.map(normalizeAnswer);
  if (models.includes(key)) return { correct: true, accentOnly: false, needsAi: false };
  if (models.some((m) => foldAccents(m) === foldAccents(key))) {
    return { correct: !requireAccents, accentOnly: true, needsAi: false };
  }
  return { correct: false, accentOnly: false, needsAi: true };
}

// Fichas para tocar y colocar; `index` es la posición original en `tiles`
export function createTileBoard(tiles) {
  let order = [];
  const item = (index) => ({ index, text: tiles[index] });
  return {
    available: () => tiles.map((_, index) => index).filter((i) => !order.includes(i)).map(item),
    placed: () => order.map(item),
    place(index) {
      if (index >= 0 && index < tiles.length && !order.includes(index)) order.push(index);
    },
    remove(index) { order = order.filter((i) => i !== index); },
    clear() { order = []; },
    sentence: () => order.map((i) => tiles[i]).join(' '),
  };
}
