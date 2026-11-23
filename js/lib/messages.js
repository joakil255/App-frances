// Catálogo único de mensajes de error: el título dice qué pasó y el texto, qué hacer.
// Todas las pantallas los usan desde aquí para decir lo mismo en todas partes.
import { StorageError } from './storage.js';

const VOICE_SETTINGS = 'En Ajustes de Android busca «Salida de texto a voz»: elige el motor «Servicios de voz de Google», '
  + 'instala los datos de voz en Francés (Francia) y prueba «Escuchar un ejemplo».';

const message = (title, text) => Object.freeze({ title, text });

export const MESSAGES = Object.freeze({
  storageQuota: message('No hay espacio para guardar.',
    'Guarda una copia de seguridad en Inicio y borra palabras que no uses.'),
  storageUnavailable: message('El navegador no deja guardar datos.',
    'Comprueba que no estás en modo privado y que el navegador permite guardar datos de este sitio.'),
  corruptWords: message('Tus palabras guardadas estaban dañadas.',
    'Se guardó una copia aparte y la lista empezó vacía. Si tienes una copia de seguridad, restáurala en Inicio.'),
  corruptStudy: message('Tu progreso guardado estaba dañado.',
    'Se guardó una copia aparte y el estudio empezó de cero. Si tienes una copia de seguridad, restáurala en Inicio.'),
  restoreFailed: message('No se pudo restaurar la copia.', ''),
  backupUnverified: message('No se guardó la copia.',
    'Tus datos tienen algo que la copia no reconoce y no se podría restaurar. Exporta tus palabras desde Vocabulario mientras tanto.'),
  noSpeech: message('Este navegador no puede leer en voz alta.', 'Abre la app en Chrome para oír el francés.'),
  noFrenchVoice: message('No hay voz francesa en este dispositivo.', VOICE_SETTINGS),
  voiceFailed: message('El teléfono no pudo leer en voz alta.', VOICE_SETTINGS),
});

// Mensaje para un error al guardar o leer (StorageError: 'quota' o 'unavailable')
export function storageMessage(error) {
  return error instanceof StorageError && error.code === 'quota' ? MESSAGES.storageQuota : MESSAGES.storageUnavailable;
}

// Título y texto en una sola frase (para errores dentro de una ventana)
export const joined = ({ title, text }) => `${title} ${text}`;

export function importFailed(fileName, reason) {
  return { title: `No se pudo importar «${fileName}».`, text: reason };
}

export function fileTooLarge(maxMb) {
  return { title: `El archivo pasa de ${maxMb} MB.`, text: 'Comprueba que elegiste el archivo correcto.' };
}
