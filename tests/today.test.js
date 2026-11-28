import test from 'node:test';
import assert from 'node:assert/strict';
import { todayPlan } from '../js/lib/today.js';

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
