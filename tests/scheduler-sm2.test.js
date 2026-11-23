import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWERS, NEW_SM2, nextSm2 } from '../js/lib/scheduler.js';

const TODAY = '2026-11-23';
const state = (fields) => ({ ...NEW_SM2, due: TODAY, ...fields });

test('respuestas y estado de una tarjeta nueva', () => {
  assert.deepEqual(ANSWERS, ['again', 'hard', 'good', 'easy']);
  assert.deepEqual(NEW_SM2, { reps: 0, interval: 0, ease: 2.5, lapses: 0, due: null });
});

test('S1: nueva + Bien', () => {
  assert.deepEqual(nextSm2(NEW_SM2, 'good', TODAY),
    { reps: 1, interval: 1, ease: 2.5, lapses: 0, due: '2026-11-24' });
});

test('S2: nueva + Difícil', () => {
  assert.deepEqual(nextSm2(NEW_SM2, 'hard', TODAY),
    { reps: 1, interval: 1, ease: 2.35, lapses: 0, due: '2026-11-24' });
});

test('S3: nueva + Fácil', () => {
  assert.deepEqual(nextSm2(NEW_SM2, 'easy', TODAY),
    { reps: 1, interval: 4, ease: 2.65, lapses: 0, due: '2026-11-27' });
});

test('S4: reps 1 + Bien', () => {
  assert.deepEqual(nextSm2(state({ reps: 1, interval: 1, ease: 2.5 }), 'good', TODAY),
    { reps: 2, interval: 3, ease: 2.5, lapses: 0, due: '2026-11-26' });
});

test('S5: reps 1 + Fácil', () => {
  assert.deepEqual(nextSm2(state({ reps: 1, interval: 1, ease: 2.5 }), 'easy', TODAY),
    { reps: 2, interval: 6, ease: 2.65, lapses: 0, due: '2026-11-29' });
});

test('S6: reps 2, int 3 + Bien → 7,5 redondea a 8', () => {
  assert.deepEqual(nextSm2(state({ reps: 2, interval: 3, ease: 2.5 }), 'good', TODAY),
    { reps: 3, interval: 8, ease: 2.5, lapses: 0, due: '2026-12-01' });
});

test('S7: reps 3, int 8 + Fácil → 27,56 redondea a 28', () => {
  assert.deepEqual(nextSm2(state({ reps: 3, interval: 8, ease: 2.5 }), 'easy', TODAY),
    { reps: 4, interval: 28, ease: 2.65, lapses: 0, due: '2026-12-21' });
});

test('S8: reps 3, int 8 + Difícil → 9,6 redondea a 10', () => {
  assert.deepEqual(nextSm2(state({ reps: 3, interval: 8, ease: 2.5 }), 'hard', TODAY),
    { reps: 4, interval: 10, ease: 2.35, lapses: 0, due: '2026-12-03' });
});

test('S9: Difícil con facilidad mínima respeta el mínimo interval + 1', () => {
  assert.deepEqual(nextSm2(state({ reps: 3, interval: 2, ease: 1.3 }), 'hard', TODAY),
    { reps: 4, interval: 3, ease: 1.3, lapses: 0, due: '2026-11-26' });
});

test('S10: Otra vez reinicia y deja la tarjeta para hoy', () => {
  assert.deepEqual(nextSm2(state({ reps: 3, interval: 8, ease: 2.5, lapses: 0 }), 'again', TODAY),
    { reps: 0, interval: 0, ease: 2.3, lapses: 1, due: '2026-11-23' });
});

test('S11: racha de 7 × Otra vez baja la facilidad hasta 1,3 sin pasar', () => {
  const eases = [];
  let current = NEW_SM2;
  for (let i = 0; i < 7; i += 1) {
    current = nextSm2(current, 'again', TODAY);
    eases.push(current.ease);
  }
  assert.deepEqual(eases, [2.3, 2.1, 1.9, 1.7, 1.5, 1.3, 1.3]);
  assert.deepEqual(current, { reps: 0, interval: 0, ease: 1.3, lapses: 7, due: '2026-11-23' });
});

test('S12: 1 × 2,5 = 2,5 redondea hacia arriba a 3', () => {
  assert.deepEqual(nextSm2(state({ reps: 2, interval: 1, ease: 2.5 }), 'good', TODAY),
    { reps: 3, interval: 3, ease: 2.5, lapses: 0, due: '2026-11-26' });
});

test('S13: muy atrasada + Bien suma la mitad del atraso', () => {
  assert.deepEqual(nextSm2(state({ reps: 3, interval: 10, ease: 2.5, due: '2026-10-01' }), 'good', TODAY),
    { reps: 4, interval: 90, ease: 2.5, lapses: 0, due: '2027-02-21' });
});

test('S14: muy atrasada + Difícil no tiene bonificación', () => {
  assert.deepEqual(nextSm2(state({ reps: 3, interval: 10, ease: 2.5, due: '2026-10-01' }), 'hard', TODAY),
    { reps: 4, interval: 12, ease: 2.35, lapses: 0, due: '2026-12-05' });
});

test('S15: el intervalo no pasa de 365 días', () => {
  assert.deepEqual(nextSm2(state({ reps: 5, interval: 200, ease: 2.5 }), 'good', TODAY),
    { reps: 6, interval: 365, ease: 2.5, lapses: 0, due: '2027-11-23' });
});

test('S16: la facilidad no pasa de 3,0', () => {
  assert.deepEqual(nextSm2(state({ reps: 3, interval: 10, ease: 2.95 }), 'easy', TODAY),
    { reps: 4, interval: 39, ease: 3, lapses: 0, due: '2027-01-01' });
});

test('una respuesta desconocida lanza un error', () => {
  assert.throws(() => nextSm2(NEW_SM2, 'maybe', TODAY), { message: 'Respuesta desconocida: maybe' });
});

test('nextSm2 no modifica el estado recibido', () => {
  const before = state({ reps: 3, interval: 8, ease: 2.5 });
  const copy = structuredClone(before);
  for (const answer of ANSWERS) nextSm2(before, answer, TODAY);
  assert.deepEqual(before, copy);
  assert.deepEqual(NEW_SM2, { reps: 0, interval: 0, ease: 2.5, lapses: 0, due: null });
});
