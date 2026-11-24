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
