import test from 'node:test';
import assert from 'node:assert/strict';
import { todayPlan, dailyGoal } from '../js/lib/today.js';

const L7 = { id: 'fr-a1-07', number: 7, title: 'Los adjetivos' };

const st = (p) => p.stations.map((s) => [s.name, s.state, s.text]);
test('con palabras pendientes, la acción es repasar palabras', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 12, sentencesDue: 3, lesson: L7, lessonsReady: true });
  assert.equal(p.title, '12 palabras te esperan');
  assert.deepEqual(p.action, { text: 'Repasar 12 palabras', href: '#/estudiar' });
  assert.equal(p.followUp, 'Después: 3 frases y la lección 7, «Los adjetivos».');
  assert.equal(p.showMore, false);
  assert.deepEqual(st(p), [['Palabras', 'current', 'Ahora: 12 pendientes'], ['Frases', 'todo', '3 pendientes'], ['Lección', 'todo', 'Lección 7']]);
});
test('singular: 1 palabra, 1 frase', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 1, sentencesDue: 1, lesson: L7, lessonsReady: true });
  assert.equal(p.title, '1 palabra te espera');
  assert.equal(p.action.text, 'Repasar 1 palabra');
  assert.equal(p.followUp, 'Después: 1 frase y la lección 7, «Los adjetivos».');
  assert.deepEqual(st(p).slice(0, 2), [['Palabras', 'current', 'Ahora: 1 pendiente'], ['Frases', 'todo', '1 pendiente']]);
});
test('sin palabras pendientes, la acción es repasar frases', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 3, lesson: L7, lessonsReady: true });
  assert.equal(p.title, '3 frases te esperan');
  assert.deepEqual(p.action, { text: 'Repasar 3 frases', href: '#/construir/repaso' });
  assert.equal(p.followUp, 'Tus palabras ya están al día. Después: la lección 7, «Los adjetivos».');
  assert.deepEqual(st(p), [['Palabras', 'done', 'Al día'], ['Frases', 'current', 'Ahora: 3 pendientes'], ['Lección', 'todo', 'Lección 7']]);
});
test('palabras pendientes y 0 frases: Frases ya está al día', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 5, sentencesDue: 0, lesson: L7, lessonsReady: true });
  assert.equal(p.followUp, 'Después: la lección 7, «Los adjetivos».');
  assert.deepEqual(st(p)[1], ['Frases', 'done', 'Al día']);
});
test('sin repasos, la acción es continuar la lección', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 0, lesson: L7, lessonsReady: true });
  assert.equal(p.title, 'Tu repaso de hoy está completo');
  assert.deepEqual(p.action, { text: 'Continuar: Lección 7 · Los adjetivos', href: '#/construir/fr-a1-07' });
  assert.equal(p.followUp, 'Tus palabras y tus frases están al día.');
  assert.deepEqual(st(p)[2], ['Lección', 'current', 'Ahora: Lección 7']);
});
test('todo terminado: sin botón y con «Practicar algo más»', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 0, lesson: null, lessonsReady: true });
  assert.equal(p.action, null);
  assert.equal(p.followUp, 'Completaste todas las lecciones disponibles. Mañana tendrás más repaso.');
  assert.equal(p.showMore, true);
  assert.deepEqual(st(p)[2], ['Lección', 'done', 'Terminadas']);
});
test('lecciones sin cargar: Aprende sigue con palabras y frases', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 0, lesson: null, lessonsReady: false });
  assert.equal(p.action, null);
  assert.equal(p.followUp, 'Tus palabras y tus frases están al día. Las lecciones todavía no están disponibles.');
  assert.equal(p.showMore, true);
  assert.deepEqual(st(p)[2], ['Lección', 'todo', 'Sin cargar']);
  const q = todayPlan({ hasWords: true, wordsDue: 4, sentencesDue: 0, lesson: null, lessonsReady: false });
  assert.equal(q.action.href, '#/estudiar');
  assert.equal(q.followUp, 'Después de esto, tu repaso de hoy queda completo.');
});
test('sin palabras en la lista: Palabras dice «Sin palabras»', () => {
  const p = todayPlan({ hasWords: false, wordsDue: 0, sentencesDue: 2, lesson: L7, lessonsReady: true });
  assert.deepEqual(st(p)[0], ['Palabras', 'done', 'Sin palabras']);
  assert.equal(p.action.href, '#/construir/repaso');
});
test('cifras grandes y títulos con acentos y comillas', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 15000, sentencesDue: 0, lesson: { id: 'fr-a1-02', number: 2, title: "Être, avoir, c'est, il y a" }, lessonsReady: true });
  assert.equal(p.title, '15.000 palabras te esperan');
  assert.equal(p.followUp, "Después: la lección 2, «Être, avoir, c'est, il y a».");
});
test('sin palabras en la lista, el texto habla solo de las frases', () => {
  const lesson = todayPlan({ hasWords: false, wordsDue: 0, sentencesDue: 0, lesson: L7, lessonsReady: true });
  assert.equal(lesson.followUp, 'Tus frases están al día.');
  const notReady = todayPlan({ hasWords: false, wordsDue: 0, sentencesDue: 0, lesson: null, lessonsReady: false });
  assert.equal(notReady.followUp, 'Tus frases están al día. Las lecciones todavía no están disponibles.');
  // Lo que no depende de las palabras no cambia
  const done = todayPlan({ hasWords: false, wordsDue: 0, sentencesDue: 0, lesson: null, lessonsReady: true });
  assert.equal(done.followUp, 'Completaste todas las lecciones disponibles. Mañana tendrás más repaso.');
});

const T = '2026-11-27';
test('cuenta lo que queda y lo hecho hoy', () => {
  const g = dailyGoal({
    wordQueue: [{ cardId: 'a' }, { cardId: 'b' }], sentenceQueue: ['s1'],
    history: [{ date: T, cardId: 'c' }, { date: T, cardId: 'c' }, { date: T, cardId: 'd' }, { date: '2026-11-26', cardId: 'e' }, { kind: 'quiz', date: T }],
    sentenceCards: { s1: { lastReviewedAt: null }, s2: { lastReviewedAt: '2026-11-27T10:00:00.000Z' } },
    today: T, dayOf: (iso) => iso.slice(0, 10),
  });
  assert.deepEqual([g.wordsLeft, g.sentencesLeft, g.done], [2, 1, 3]);
  assert.equal(g.ratio, 0.5);
  assert.equal(g.text, 'Te quedan 2 palabras y 1 frase.');
  assert.equal(g.answersText, 'Llevas 4 respuestas hoy.');
});
test('una entrada de hoy sin cardId no cuenta como palabra hecha, pero sí como respuesta', () => {
  const g = dailyGoal({
    wordQueue: [], sentenceQueue: [], sentenceCards: {}, today: T,
    history: [{ date: T }, { date: T, cardId: undefined }, { date: T, cardId: 'a' }, { kind: 'quiz', date: T }],
  });
  assert.equal(g.done, 1);
  assert.equal(g.answersText, 'Llevas 4 respuestas hoy.');
});
test('«Otra vez»: la palabra respondida hoy que sigue en la cola cuenta como pendiente, no como hecha', () => {
  const g = dailyGoal({ wordQueue: [{ cardId: 'a' }], sentenceQueue: [], history: [{ date: T, cardId: 'a' }], sentenceCards: {}, today: T });
  assert.deepEqual([g.wordsLeft, g.done], [1, 0]);
  assert.equal(g.text, 'Te queda 1 palabra.');
});
test('textos: solo frases, varias frases, y la frase de completado', () => {
  const base = { wordQueue: [], history: [], sentenceCards: {}, today: T };
  assert.equal(dailyGoal({ ...base, sentenceQueue: ['x'] }).text, 'Te queda 1 frase.');
  assert.equal(dailyGoal({ ...base, sentenceQueue: ['x', 'y'] }).text, 'Te quedan 2 frases.');
  const done = dailyGoal({ ...base, sentenceQueue: [] });
  assert.equal(done.text, 'Repaso de hoy completado. No te queda nada pendiente.');
  assert.equal(done.ratio, 1);
  assert.equal(done.answersText, 'Hoy todavía no has respondido nada.');
});
test('la frase repasada cuenta en el día local, no en UTC', () => {
  const g = dailyGoal({ wordQueue: [], sentenceQueue: [], history: [{ date: T, cardId: 'z' }], sentenceCards: { s: { lastReviewedAt: '2026-11-28T02:00:00.000Z' } }, today: T, dayOf: () => T });
  assert.equal(g.done, 2);
  assert.equal(g.answersText, 'Llevas 1 respuesta hoy.');
});
test('ignora entradas del historial sin fecha válida', () => {
  const g = dailyGoal({ wordQueue: [], sentenceQueue: [], history: [{ cardId: 'q' }, null, { date: 'ayer', cardId: 'r' }], sentenceCards: {}, today: T });
  assert.equal(g.done, 0);
});
