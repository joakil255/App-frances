// Ajustes del lector que se recuerdan en el navegador. Sin DOM; nunca lanza.
export const READER_PREFS_KEY = 'app-frances-reader';

const DEFAULTS = { quizLang: 'es', showTranslation: false };

export function createReaderPrefs(backend) {
  function stored() {
    try {
      const doc = JSON.parse(backend.getItem(READER_PREFS_KEY));
      return doc && typeof doc === 'object' ? doc : {};
    } catch {
      return {};
    }
  }

  return {
    load() {
      const doc = stored();
      return {
        quizLang: doc.quizLang === 'fr' ? 'fr' : DEFAULTS.quizLang,
        showTranslation: doc.showTranslation === true,
      };
    },
    // Mezcla el cambio con lo guardado; si el navegador no deja guardar, no se recuerda
    save(change) {
      try {
        backend.setItem(READER_PREFS_KEY, JSON.stringify({ ...stored(), ...change }));
      } catch {
        // no se recuerda; no es grave
      }
    },
  };
}
