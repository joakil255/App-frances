// Catálogo único de mensajes de error: el título dice qué pasó y el texto, qué hacer.
// Todas las pantallas los usan desde aquí para decir lo mismo en todas partes.
import { StorageError } from './storage.js';

const VOICE_SETTINGS = 'En Ajustes de Android busca «Salida de texto a voz»: elige el motor «Servicios de voz de Google», '
  + 'instala los datos de voz en Francés (Francia) y prueba «Escuchar un ejemplo».';

const message = (title, text) => Object.freeze({ title, text });

export const MESSAGES = Object.freeze({
  storageQuota: message('No hay espacio para guardar.',
    'Guarda una copia de seguridad en Progreso › Datos y copia y borra palabras que no uses.'),
  storageUnavailable: message('El navegador no deja guardar datos.',
    'Comprueba que no estás en modo privado y que el navegador permite guardar datos de este sitio.'),
  corruptWords: message('Tus palabras guardadas estaban dañadas.',
    'Se guardó una copia aparte y la lista empezó vacía. Si tienes una copia de seguridad, restáurala en Progreso › Datos y copia.'),
  corruptStudy: message('Tu progreso guardado estaba dañado.',
    'Se guardó una copia aparte y el estudio empezó de cero. Si tienes una copia de seguridad, restáurala en Progreso › Datos y copia.'),
  corruptTexts: message('Tus historias guardadas estaban dañadas.',
    'Se guardó una copia aparte y la biblioteca empezó vacía. Si tienes una copia de seguridad, restáurala en Progreso › Datos y copia.'),
  corruptBuild: message('Tu progreso de frases estaba dañado.',
    'Se guardó una copia aparte y Construir frases empezó de cero. Si tienes una copia de seguridad, restáurala en Progreso › Datos y copia.'),
  buildMigrationFailed: message('No se pudo actualizar tu progreso de frases.',
    'La app sigue funcionando; vuelve a abrirla más tarde.'),
  restoreFailed: message('No se pudo restaurar la copia.', ''),
  backupUnverified: message('No se guardó la copia.',
    'Tus datos tienen algo que la copia no reconoce y no se podría restaurar. Exporta tus palabras desde Palabras mientras tanto.'),
  noSpeech: message('Este navegador no puede leer en voz alta.', 'Abre la app en Chrome para oír el francés.'),
  noFrenchVoice: message('No hay voz francesa en este dispositivo.', VOICE_SETTINGS),
  voiceFailed: message('El teléfono no pudo leer en voz alta.', VOICE_SETTINGS),
  chatOffline: message('Necesitas conexión para conversar.',
    'Conéctate a internet y vuelve a enviar tu mensaje.'),
  chatNetwork: message('No se pudo conectar con el servidor.',
    'Revisa tu conexión y vuelve a enviar tu mensaje.'),
  chatWrongCode: message('El código de acceso no es correcto.',
    'Escríbelo de nuevo tal como lo guardaste al configurar el servidor.'),
  chatDailyLimit: message('Llegaste al límite de hoy, vuelve mañana.',
    'El contador se reinicia a medianoche, hora de Chile.'),
  chatInvalid: message('El mensaje no se pudo enviar.',
    'Escribe un mensaje de 500 caracteres como máximo.'),
  chatConfig: message('El servidor no está bien configurado.',
    'Revisa las variables y los secretos del servidor en Cloudflare.'),
  chatAuth: message('El servidor no pudo usar la clave de Anthropic.',
    'Revisa que la clave guardada en Cloudflare siga activa en la consola de Anthropic.'),
  chatRateLimit: message('Claude recibió demasiados mensajes seguidos.',
    'Espera un minuto y vuelve a enviar tu mensaje.'),
  chatQuota: message('Se acabó el saldo o el tope de gasto de Anthropic.',
    'Revisa el saldo y el tope de gasto en la consola de Anthropic.'),
  chatUnavailable: message('Claude no respondió a tiempo.',
    'Vuelve a enviar tu mensaje en unos minutos.'),
  chatBadOutput: message('La respuesta de Claude llegó incompleta.',
    'Vuelve a enviar tu mensaje.'),
  chatRefused: message('Claude no quiso responder ese mensaje.',
    'Escríbelo de otra forma y vuelve a enviarlo.'),
  lookupLimit: message('Llegaste al límite de consultas de hoy.',
    'Puedes seguir conversando; las consultas se reinician a medianoche, hora de Chile.'),
  storyLimit: message('Llegaste al límite de historias de hoy.',
    'Puedes leer las que ya tienes; el límite se reinicia a medianoche, hora de Chile.'),
  translateLimit: message('Llegaste al límite de traducciones de hoy.',
    'Puedes leer tus historias; el límite se reinicia a medianoche, hora de Chile.'),
  translateNotPossible: message('Esta historia no se puede traducir frase por frase.', ''),
  translateOffline: message('Necesitas conexión para generar la traducción.',
    'Puedes leer la historia sin ella.'),
  sentenceLimit: message('Llegaste al límite de correcciones de hoy.',
    'El límite se reinicia a medianoche, hora de Chile.'),
  sentenceOffline: message('Necesitas conexión para que Claude revise tu frase.',
    'Compara tu frase con las respuestas modelo.'),
  sentenceNoCode: message('Falta tu código de acceso.',
    'Escríbelo primero en Conversar; después vuelve aquí.'),
  lessonsUnavailable: message('No se pudieron cargar las lecciones.',
    'Abre la app con conexión una vez para guardarlas en el teléfono.'),
  micBlocked: message('El navegador no deja usar el micrófono.',
    'Permite el micrófono para este sitio en los ajustes del navegador (el candado junto a la dirección) y vuelve a tocar Hablar.'),
  micNoSpeech: message('No se oyó nada.',
    'Toca Hablar y di tu frase cerca del micrófono.'),
  micNoDevice: message('No se encontró un micrófono.',
    'Revisa que el dispositivo tenga micrófono y que ninguna otra app lo esté usando.'),
  micNetwork: message('No se pudo conectar con el reconocimiento de voz.',
    'Revisa tu conexión y vuelve a intentarlo, o escribe tu mensaje.'),
  micLanguage: message('Este navegador no reconoce voz en francés.',
    'Escribe tu mensaje: el resto de la pantalla funciona igual.'),
  micFailed: message('El reconocimiento de voz falló.',
    'Vuelve a tocar Hablar o escribe tu mensaje.'),
});

// Clave del catálogo para cada código de error que devuelve el servidor del chat
const CHAT_KEYS = Object.freeze({
  offline: 'chatOffline',
  network: 'chatNetwork',
  unauthorized: 'chatWrongCode',
  daily_limit: 'chatDailyLimit',
  invalid_input: 'chatInvalid',
  config: 'chatConfig',
  forbidden_origin: 'chatConfig',
  not_found: 'chatConfig',
  auth: 'chatAuth',
  rate_limit: 'chatRateLimit',
  quota: 'chatQuota',
  unavailable: 'chatUnavailable',
  bad_output: 'chatBadOutput',
  refused: 'chatRefused',
  lookup_limit: 'lookupLimit',
  story_limit: 'storyLimit',
  sentence_limit: 'sentenceLimit',
  translate_limit: 'translateLimit',
});

// Mensaje para un código de error del chat; los códigos desconocidos usan chatUnavailable
export function chatMessage(code) {
  const key = Object.hasOwn(CHAT_KEYS, code) ? CHAT_KEYS[code] : 'chatUnavailable';
  return MESSAGES[key];
}

// Mensaje para un error al guardar o leer (StorageError: 'quota' o 'unavailable')
export function storageMessage(error) {
  return error instanceof StorageError && error.code === 'quota' ? MESSAGES.storageQuota : MESSAGES.storageUnavailable;
}

// Aviso al cargar las historias: de un error de lectura o de datos dañados (null si todo bien)
export function textsLoadNotice({ error = null, corruptBackupKey = null } = {}) {
  if (error) return storageMessage(error);
  return corruptBackupKey ? MESSAGES.corruptTexts : null;
}

// Aviso al cargar el progreso de frases: igual que textsLoadNotice, y además si no se pudo
// guardar la versión 2 (migrationError; el progreso sigue en memoria)
export function buildLoadNotice({ error = null, corruptBackupKey = null, migrationError = null } = {}) {
  if (error) return storageMessage(error);
  if (corruptBackupKey) return MESSAGES.corruptBuild;
  return migrationError ? MESSAGES.buildMigrationFailed : null;
}

// Título y texto en una sola frase (para errores dentro de una ventana)
export const joined = ({ title, text }) => `${title} ${text}`;

// Motivo cuando el teléfono no deja leer el archivo elegido (p. ej. ya no está disponible)
export const FILE_UNREADABLE = 'No se pudo abrir el archivo. Vuelve a elegirlo.';

export function importFailed(fileName, reason) {
  return { title: `No se pudo importar «${fileName}».`, text: reason };
}

export function fileTooLarge(maxMb) {
  return { title: `El archivo pasa de ${maxMb} MB.`, text: 'Comprueba que elegiste el archivo correcto.' };
}
