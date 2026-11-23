import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, addDays, daysBetween } from '../js/lib/dates.js';

test('D1: localDate usa la fecha local; el día cambia a medianoche', () => {
  assert.equal(localDate(new Date(2026, 10, 23, 23, 59)), '2026-11-23');
  assert.equal(localDate(new Date(2026, 10, 24, 0, 0)), '2026-11-24');
});

test('localDate rellena mes y día con cero', () => {
  assert.equal(localDate(new Date(2026, 0, 5, 12, 0)), '2026-01-05');
});

test('D2: addDays cruza el cambio de hora de Europa sin moverse', () => {
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
});

test('addDays cruza fin de mes y de año', () => {
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('addDays respeta el año bisiesto', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('addDays con 0 días devuelve la misma fecha', () => {
  assert.equal(addDays('2026-11-23', 0), '2026-11-23');
});

test('daysBetween cuenta días de calendario', () => {
  assert.equal(daysBetween('2026-10-01', '2026-11-23'), 53);
});

test('daysBetween es negativo si la segunda fecha es anterior', () => {
  assert.equal(daysBetween('2026-11-24', '2026-11-23'), -1);
});

test('daysBetween de una fecha consigo misma es 0', () => {
  assert.equal(daysBetween('2026-11-23', '2026-11-23'), 0);
});
