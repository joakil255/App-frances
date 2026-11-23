import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { MESSAGES, storageMessage, importFailed, fileTooLarge } from '../js/lib/messages.js';
import { StorageError } from '../js/lib/storage.js';

const KEYS = ['storageQuota', 'storageUnavailable', 'corruptWords', 'corruptStudy', 'restoreFailed',
  'noSpeech', 'noFrenchVoice', 'voiceFailed'];

test('cada caso tiene título y texto claros que terminan en punto', () => {
  for (const key of KEYS) {
    const message = MESSAGES[key];
    assert.ok(message, `falta ${key}`);
    assert.ok(message.title.length > 0 && message.title.endsWith('.'), `${key}: título`);
    if (key === 'restoreFailed') continue; // su texto es el motivo que da readBackup
    assert.ok(message.text.length > 0 && message.text.endsWith('.'), `${key}: texto`);
  }
});

test('los mensajes no se disculpan', () => {
  for (const key of KEYS) {
    const all = `${MESSAGES[key].title} ${MESSAGES[key].text}`.toLowerCase();
    for (const word of ['perdón', 'lo sentimos', 'disculpa']) assert.ok(!all.includes(word), `${key}: «${word}»`);
  }
});

test('los textos exactos de almacenamiento y datos dañados nombran Inicio', () => {
  assert.deepEqual(MESSAGES.storageQuota, {
    title: 'No hay espacio para guardar.',
    text: 'Guarda una copia de seguridad en Inicio y borra palabras que no uses.',
  });
  assert.deepEqual(MESSAGES.storageUnavailable, {
    title: 'El navegador no deja guardar datos.',
    text: 'Comprueba que no estás en modo privado y que el navegador permite guardar datos de este sitio.',
  });
  assert.deepEqual(MESSAGES.corruptWords, {
    title: 'Tus palabras guardadas estaban dañadas.',
    text: 'Se guardó una copia aparte y la lista empezó vacía. Si tienes una copia de seguridad, restáurala en Inicio.',
  });
  assert.deepEqual(MESSAGES.corruptStudy, {
    title: 'Tu progreso guardado estaba dañado.',
    text: 'Se guardó una copia aparte y el estudio empezó de cero. Si tienes una copia de seguridad, restáurala en Inicio.',
  });
  assert.equal(MESSAGES.restoreFailed.title, 'No se pudo restaurar la copia.');
  assert.equal(MESSAGES.noSpeech.title, 'Este navegador no puede leer en voz alta.');
  assert.equal(MESSAGES.noFrenchVoice.title, 'No hay voz francesa en este dispositivo.');
  assert.equal(MESSAGES.voiceFailed.title, 'El teléfono no pudo leer en voz alta.');
  assert.match(MESSAGES.noFrenchVoice.text, /Salida de texto a voz/);
});

test('storageMessage elige el mensaje según el error', () => {
  assert.deepEqual(storageMessage(new StorageError('quota')), MESSAGES.storageQuota);
  assert.deepEqual(storageMessage(new StorageError('unavailable')), MESSAGES.storageUnavailable);
  assert.deepEqual(storageMessage(new Error('otro')), MESSAGES.storageUnavailable);
});

test('importFailed y fileTooLarge', () => {
  assert.deepEqual(importFailed('a.csv', 'El archivo está vacío.'),
    { title: 'No se pudo importar «a.csv».', text: 'El archivo está vacío.' });
  assert.deepEqual(fileTooLarge(2),
    { title: 'El archivo pasa de 2 MB.', text: 'Comprueba que elegiste el archivo correcto.' });
});

test('las pantallas no repiten los textos del catálogo', () => {
  const dir = new URL('../js/screens/', import.meta.url);
  const sources = readdirSync(dir).filter((f) => f.endsWith('.js'))
    .map((f) => [f, readFileSync(new URL(f, dir), 'utf8')]);
  for (const key of KEYS) {
    for (const [file, source] of sources) {
      assert.ok(!source.includes(MESSAGES[key].title), `${file} repite «${MESSAGES[key].title}»`);
    }
  }
});
