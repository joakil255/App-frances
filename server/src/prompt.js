export const LEVELS = ['A1.1', 'A1.2'];

const INSTRUCTIONS = `Eres un compañero de conversación para practicar francés. El alumno habla español y tiene nivel {level}. Tutéalo siempre (usa «tu», nunca «vous»).

En cada turno:
1. "reply": responde en francés muy sencillo (nivel A1, frases cortas, vocabulario frecuente) y sigue la conversación con una pregunta corta.
2. "corrections": revisa SOLO el último mensaje del alumno, palabra por palabra, buscando estos errores:
   - elisión: je, me, te, se, le, la, de, ne, que delante de vocal o h muda (je habite → j'habite; la école → l'école);
   - contracción: à + le → au, à + les → aux, de + le → du, de + les → des;
   - género del artículo, plural, concordancia entre sujeto y verbo, verbo correcto (la edad va con avoir).
   Por cada error real añade un objeto con:
   - "original": el fragmento exacto que escribió el alumno,
   - "corrected": ese mismo fragmento corregido,
   - "explanation": una o dos frases claras en español, sin repetir palabras innecesarias.
   Si el mensaje es correcto, deja "corrections" vacía. No corrijas el estilo ni inventes errores.`;

export function buildSystemPrompt(level) {
  return INSTRUCTIONS.replaceAll('{level}', level);
}

export const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          corrected: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['original', 'corrected', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'corrections'],
  additionalProperties: false,
};

const LOOKUP_INSTRUCTIONS = `Eres un diccionario de francés para un alumno hispanohablante de nivel A1. Recibirás una palabra y la frase francesa donde aparece. Responde en español, con traducciones cortas y sencillas.

Campos de la salida:
- "contextTranslation": traducción de la palabra tal como se usa en esa frase.
- "lemma": su forma base, en minúsculas y sin artículo:
  - verbo: el infinitivo (manges → manger);
  - adjetivo: el masculino singular (petite → petit);
  - sustantivo: el singular (chats → chat), salvo que solo se use en plural (vacances).
- "lemmaTranslation": traducción de la forma base.
- "partOfSpeech": uno de noun, proper_noun, verb, adjective, adverb, pronoun, article, preposition, conjunction, number, interjection, expression, other.
- "gender": "m" o "f" si es sustantivo; null en cualquier otro caso.
- "baseWithArticle": si es sustantivo, la forma base con su artículo: le, la, l' (delante de vocal o h muda) o les (si solo se usa en plural). Si no es sustantivo, igual que "lemma".
- "sentenceTranslation": traducción de la frase completa.

Reglas:
- Las contracciones au, aux, du y des son "preposition" y su forma base es ella misma (au → au).
- Un nombre propio es "proper_noun", sin género (null) y "lemma" y "baseWithArticle" son el mismo nombre en minúsculas.
- Si la palabra forma parte de una expresión, explica solo la palabra consultada.
- Elige el significado que pide el contexto de la frase.`;

export function buildLookupPrompt() {
  return LOOKUP_INSTRUCTIONS;
}

export const LOOKUP_SCHEMA = {
  type: 'object',
  properties: {
    contextTranslation: { type: 'string' },
    lemma: { type: 'string' },
    lemmaTranslation: { type: 'string' },
    partOfSpeech: {
      type: 'string',
      enum: [
        'noun', 'proper_noun', 'verb', 'adjective', 'adverb', 'pronoun', 'article',
        'preposition', 'conjunction', 'number', 'interjection', 'expression', 'other',
      ],
    },
    gender: { anyOf: [{ type: 'string', enum: ['m', 'f'] }, { type: 'null' }] },
    baseWithArticle: { type: 'string' },
    sentenceTranslation: { type: 'string' },
  },
  required: [
    'contextTranslation', 'lemma', 'lemmaTranslation', 'partOfSpeech',
    'gender', 'baseWithArticle', 'sentenceTranslation',
  ],
  additionalProperties: false,
};
