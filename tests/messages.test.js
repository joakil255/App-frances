import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { MESSAGES, storageMessage, textsLoadNotice, buildLoadNotice, importFailed, fileTooLarge, FILE_UNREADABLE, chatMessage } from '../js/lib/messages.js';
import { StorageError } from '../js/lib/storage.js';

const KEYS = ['storageQuota', 'storageUnavailable', 'corruptWords', 'corruptStudy', 'corruptTexts', 'restoreFailed',
  'backupUnverified', 'noSpeech', 'noFrenchVoice', 'voiceFailed', 'chatOffline', 'chatNetwork', 'chatWrongCode',
  'chatDailyLimit', 'chatInvalid', 'chatConfig', 'chatAuth', 'chatRateLimit', 'chatQuota', 'chatUnavailable',
  'chatBadOutput', 'chatRefused', 'micBlocked', 'micNoSpeech', 'micNoDevice', 'micNetwork', 'micLanguage',
  'micFailed', 'lookupLimit', 'corruptBuild'];

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
  assert.deepEqual(MESSAGES.corruptTexts, {
    title: 'Tus historias guardadas estaban dañadas.',
    text: 'Se guardó una copia aparte y la biblioteca empezó vacía. Si tienes una copia de seguridad, restáurala en Inicio.',
  });
  assert.equal(MESSAGES.restoreFailed.title, 'No se pudo restaurar la copia.');
  assert.deepEqual(MESSAGES.backupUnverified, {
    title: 'No se guardó la copia.',
    text: 'Tus datos tienen algo que la copia no reconoce y no se podría restaurar. Exporta tus palabras desde Palabras mientras tanto.',
  });
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

test('cada código del servidor tiene su mensaje exacto', () => {
  assert.deepEqual(MESSAGES.chatOffline, {
    title: 'Necesitas conexión para conversar.',
    text: 'Conéctate a internet y vuelve a enviar tu mensaje.',
  });
  assert.deepEqual(MESSAGES.chatNetwork, {
    title: 'No se pudo conectar con el servidor.',
    text: 'Revisa tu conexión y vuelve a enviar tu mensaje.',
  });
  assert.deepEqual(MESSAGES.chatWrongCode, {
    title: 'El código de acceso no es correcto.',
    text: 'Escríbelo de nuevo tal como lo guardaste al configurar el servidor.',
  });
  assert.deepEqual(MESSAGES.chatDailyLimit, {
    title: 'Llegaste al límite de hoy, vuelve mañana.',
    text: 'El contador se reinicia a medianoche, hora de Chile.',
  });
  assert.deepEqual(MESSAGES.chatInvalid, {
    title: 'El mensaje no se pudo enviar.',
    text: 'Escribe un mensaje de 500 caracteres como máximo.',
  });
  assert.deepEqual(MESSAGES.chatConfig, {
    title: 'El servidor no está bien configurado.',
    text: 'Revisa las variables y los secretos del servidor en Cloudflare.',
  });
  assert.deepEqual(MESSAGES.chatAuth, {
    title: 'El servidor no pudo usar la clave de Anthropic.',
    text: 'Revisa que la clave guardada en Cloudflare siga activa en la consola de Anthropic.',
  });
  assert.deepEqual(MESSAGES.chatRateLimit, {
    title: 'Claude recibió demasiados mensajes seguidos.',
    text: 'Espera un minuto y vuelve a enviar tu mensaje.',
  });
  assert.deepEqual(MESSAGES.chatQuota, {
    title: 'Se acabó el saldo o el tope de gasto de Anthropic.',
    text: 'Revisa el saldo y el tope de gasto en la consola de Anthropic.',
  });
  assert.deepEqual(MESSAGES.chatUnavailable, {
    title: 'Claude no respondió a tiempo.',
    text: 'Vuelve a enviar tu mensaje en unos minutos.',
  });
  assert.deepEqual(MESSAGES.chatBadOutput, {
    title: 'La respuesta de Claude llegó incompleta.',
    text: 'Vuelve a enviar tu mensaje.',
  });
  assert.deepEqual(MESSAGES.chatRefused, {
    title: 'Claude no quiso responder ese mensaje.',
    text: 'Escríbelo de otra forma y vuelve a enviarlo.',
  });
});

test('lookupLimit tiene su texto exacto y lookup_limit lo usa', () => {
  assert.deepEqual(MESSAGES.lookupLimit, {
    title: 'Llegaste al límite de consultas de hoy.',
    text: 'Puedes seguir conversando; las consultas se reinician a medianoche, hora de Chile.',
  });
  assert.deepEqual(chatMessage('lookup_limit'), MESSAGES.lookupLimit);
});

test('chatMessage elige el mensaje según el código del servidor', () => {
  assert.deepEqual(chatMessage('offline'), MESSAGES.chatOffline);
  assert.deepEqual(chatMessage('network'), MESSAGES.chatNetwork);
  assert.deepEqual(chatMessage('unauthorized'), MESSAGES.chatWrongCode);
  assert.deepEqual(chatMessage('daily_limit'), MESSAGES.chatDailyLimit);
  assert.deepEqual(chatMessage('invalid_input'), MESSAGES.chatInvalid);
  assert.deepEqual(chatMessage('auth'), MESSAGES.chatAuth);
  assert.deepEqual(chatMessage('rate_limit'), MESSAGES.chatRateLimit);
  assert.deepEqual(chatMessage('quota'), MESSAGES.chatQuota);
  assert.deepEqual(chatMessage('unavailable'), MESSAGES.chatUnavailable);
  assert.deepEqual(chatMessage('bad_output'), MESSAGES.chatBadOutput);
  assert.deepEqual(chatMessage('refused'), MESSAGES.chatRefused);
});

test('config, forbidden_origin y not_found muestran el mismo mensaje de configuración', () => {
  assert.deepEqual(chatMessage('config'), MESSAGES.chatConfig);
  assert.deepEqual(chatMessage('forbidden_origin'), MESSAGES.chatConfig);
  assert.deepEqual(chatMessage('not_found'), MESSAGES.chatConfig);
});

test('un código desconocido muestra chatUnavailable', () => {
  assert.deepEqual(chatMessage('codigo_inventado'), MESSAGES.chatUnavailable);
  assert.deepEqual(chatMessage(undefined), MESSAGES.chatUnavailable);
  assert.deepEqual(chatMessage(''), MESSAGES.chatUnavailable);
  assert.deepEqual(chatMessage('toString'), MESSAGES.chatUnavailable);
  assert.deepEqual(chatMessage('__proto__'), MESSAGES.chatUnavailable);
});

test('los mensajes del micrófono tienen su texto exacto', () => {
  assert.deepEqual(MESSAGES.micBlocked, {
    title: 'El navegador no deja usar el micrófono.',
    text: 'Permite el micrófono para este sitio en los ajustes del navegador (el candado junto a la dirección) y vuelve a tocar Hablar.',
  });
  assert.deepEqual(MESSAGES.micNoSpeech, {
    title: 'No se oyó nada.',
    text: 'Toca Hablar y di tu frase cerca del micrófono.',
  });
  assert.deepEqual(MESSAGES.micNoDevice, {
    title: 'No se encontró un micrófono.',
    text: 'Revisa que el dispositivo tenga micrófono y que ninguna otra app lo esté usando.',
  });
  assert.deepEqual(MESSAGES.micNetwork, {
    title: 'No se pudo conectar con el reconocimiento de voz.',
    text: 'Revisa tu conexión y vuelve a intentarlo, o escribe tu mensaje.',
  });
  assert.deepEqual(MESSAGES.micLanguage, {
    title: 'Este navegador no reconoce voz en francés.',
    text: 'Escribe tu mensaje: el resto de la pantalla funciona igual.',
  });
  assert.deepEqual(MESSAGES.micFailed, {
    title: 'El reconocimiento de voz falló.',
    text: 'Vuelve a tocar Hablar o escribe tu mensaje.',
  });
});

test('motivo cuando el teléfono no deja abrir el archivo', () => {
  assert.equal(FILE_UNREADABLE, 'No se pudo abrir el archivo. Vuelve a elegirlo.');
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

test('storyLimit tiene su texto exacto y story_limit lo usa', () => {
  assert.deepEqual(MESSAGES.storyLimit, {
    title: 'Llegaste al límite de historias de hoy.',
    text: 'Puedes leer las que ya tienes; el límite se reinicia a medianoche, hora de Chile.',
  });
  assert.deepEqual(chatMessage('story_limit'), MESSAGES.storyLimit);
});

test('textsLoadNotice avisa de datos dañados o de un error de lectura, y calla si todo salió bien', () => {
  assert.equal(textsLoadNotice({ corruptBackupKey: null }), null);
  assert.equal(textsLoadNotice(), null);
  assert.equal(textsLoadNotice({ corruptBackupKey: 'app-frances-texts-corrupt-x' }), MESSAGES.corruptTexts);
  assert.equal(textsLoadNotice({ error: new StorageError('quota') }), MESSAGES.storageQuota);
  assert.equal(textsLoadNotice({ error: new StorageError('unavailable') }), MESSAGES.storageUnavailable);
});

test('buildLoadNotice avisa si el progreso de frases estaba dañado o no se pudo leer, y calla si todo salió bien', () => {
  assert.equal(buildLoadNotice({ corruptBackupKey: null }), null);
  assert.equal(buildLoadNotice(), null);
  assert.equal(buildLoadNotice({ corruptBackupKey: 'app-frances-build-corrupt-x' }), MESSAGES.corruptBuild);
  assert.equal(buildLoadNotice({ error: new StorageError('quota') }), MESSAGES.storageQuota);
  assert.equal(buildLoadNotice({ error: new StorageError('unavailable') }), MESSAGES.storageUnavailable);
  assert.deepEqual(MESSAGES.corruptBuild, {
    title: 'Tu progreso de frases estaba dañado.',
    text: 'Se guardó una copia aparte y Construir frases empezó de cero. Si tienes una copia de seguridad, restáurala en Inicio.',
  });
});

test('sentenceLimit y sentenceOffline tienen su texto exacto y sentence_limit lo usa', () => {
  assert.deepEqual(MESSAGES.sentenceLimit, {
    title: 'Llegaste al límite de correcciones de hoy.',
    text: 'El límite se reinicia a medianoche, hora de Chile.',
  });
  assert.deepEqual(MESSAGES.sentenceOffline, {
    title: 'Necesitas conexión para que Claude revise tu frase.',
    text: 'Compara tu frase con las respuestas modelo.',
  });
  assert.deepEqual(chatMessage('sentence_limit'), MESSAGES.sentenceLimit);
});
