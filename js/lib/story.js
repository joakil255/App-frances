// Historias para leer: pedirlas al servidor, convertirlas en un texto y partirlas en frases. Sin DOM.
import { chatUrl, postJson } from './chat.js';
import { GENERATED_SOURCE, evidenceKey } from './texts.js';

// Cambia /chat por /story en la dirección del servidor
export function storyUrl(hostname) {
  return chatUrl(hostname).replace(/\/chat$/, '/story');
}

const isString = (value) => typeof value === 'string';

function isValidQuestion(q) {
  return Boolean(q) && isString(q.question) && Array.isArray(q.options) && q.options.every(isString)
    && Number.isInteger(q.answer) && isString(q.explanation) && isString(q.evidence);
}

function isValidStory(data) {
  return Boolean(data) && isString(data.title) && isString(data.body)
    && Array.isArray(data.questions) && data.questions.every(isValidQuestion)
    && typeof data.remainingStories === 'number';
}

// Nunca lanza: devuelve { ok: true, result, remainingStories } o { ok: false, error }
export async function sendStory(options) {
  const sent = await postJson(options);
  if (!sent.ok) return sent;
  if (!isValidStory(sent.data)) return { ok: false, error: 'bad_output' };
  const { remainingStories, ...result } = sent.data;
  return { ok: true, result, remainingStories };
}

// Entrada para addText. Se recortan los bordes, pero no los espacios de dentro del texto
// (la evidencia se comparó con él tal cual).
export function textFromStory(result, { level, topic, quizLang }) {
  return {
    lang: 'fr',
    title: result.title.trim(),
    body: result.body.trim(),
    level,
    topic,
    source: { ...GENERATED_SOURCE },
    quiz: {
      lang: quizLang,
      questions: result.questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        answer: q.answer,
        explanation: q.explanation.trim(),
        evidence: q.evidence.trim(),
      })),
    },
  };
}

// Frases recortadas y sin vacías. Sin Segmenter, todo el texto es una sola frase.
export function splitSentences(body, Segmenter = globalThis.Intl?.Segmenter) {
  const parts = Segmenter
    ? [...new Segmenter('fr', { granularity: 'sentence' }).segment(body)].map((p) => p.segment)
    : [body];
  return parts.map((p) => p.trim()).filter((p) => p !== '');
}

// Índice de la frase que contiene la evidencia (misma comparación que el servidor), o -1
export function findEvidenceSentence(sentences, evidence) {
  const wanted = evidenceKey(evidence);
  return sentences.findIndex((s) => evidenceKey(s).includes(wanted));
}
