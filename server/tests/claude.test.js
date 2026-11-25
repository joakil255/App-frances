import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClaudeAdapter } from '../src/providers/claude.js';
import { PROVIDERS } from '../src/providers/index.js';
import { buildSystemPrompt, buildLookupPrompt, buildStoryPrompt, buildSentencePrompt, LOOKUP_SCHEMA, STORY_SCHEMA, SENTENCE_SCHEMA } from '../src/prompt.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const okBody = (content, stop_reason = 'end_turn') => ({
  id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5',
  content, stop_reason, stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

const textBody = (obj) => okBody([{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }]);

const errBody = (type, details) => ({ type: 'error', error: { type, message: 'x', ...(details ? { details } : {}) } });

function adapterWith(fetch) {
  return createClaudeAdapter({ apiKey: 'test-key', model: 'claude-haiku-5-5', effort: 'low', fetch, maxRetries: 0 });
}
const input = { level: 'A1.2', history: [], message: 'Bonjour' };
const goodOutput = { reply: 'Salut !', corrections: [] };

async function codeOf(fetch, body = input) {
  try {
    await adapterWith(fetch).chat(body);
  } catch (error) {
    assert.equal(error.name, 'ProviderError');
    return error.code;
  }
  assert.fail('debía fallar');
}

test('PROVIDERS expone el adaptador de claude', () => {
  assert.equal(PROVIDERS.claude, createClaudeAdapter);
});

test('arma la petición', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return json(200, textBody(goodOutput));
  };
  const history = [
    { role: 'user', content: 'Salut', extra: 'x' },
    { role: 'assistant', content: 'Ça va ?' },
  ];
  await adapterWith(fetch).chat({ level: 'A1.2', history, message: 'Ça va bien' });
  assert.equal(sent.model, 'claude-haiku-5-5');
  assert.equal(sent.max_tokens, 4000);
  assert.equal(sent.output_config.effort, 'low');
  assert.equal(sent.output_config.format.type, 'json_schema');
  assert.equal(sent.system, buildSystemPrompt('A1.2'));
  assert.deepEqual(sent.messages, [
    { role: 'user', content: 'Salut' },
    { role: 'assistant', content: 'Ça va ?' },
    { role: 'user', content: 'Ça va bien' },
  ]);
  for (const key of ['thinking', 'temperature', 'top_p', 'top_k']) assert.equal(key in sent, false);
});

test('normaliza la respuesta de texto JSON', async () => {
  const out = { reply: 'Salut !', corrections: [{ original: 'je habite', corrected: "j'habite", explanation: 'Elisión.' }] };
  assert.deepEqual(await adapterWith(async () => json(200, textBody(out))).chat(input), out);
});

test('busca el bloque de texto tras bloques thinking', async () => {
  const body = okBody([
    { type: 'thinking', thinking: 'hmm', signature: 'sig' },
    { type: 'text', text: JSON.stringify(goodOutput) },
  ]);
  assert.deepEqual(await adapterWith(async () => json(200, body)).chat(input), goodOutput);
});

test('errores HTTP se traducen a códigos', async () => {
  const cases = [
    [401, errBody('authentication_error'), 'auth'],
    [403, errBody('permission_error'), 'auth'],
    [402, errBody('billing_error'), 'quota'],
    [429, errBody('rate_limit_error', { error_code: 'enforced_spend_limit_reached' }), 'quota'],
    [429, errBody('rate_limit_error', { error_code: 'contract_spend_limit_reached' }), 'quota'],
    [429, errBody('rate_limit_error'), 'rate_limit'],
    [500, errBody('api_error'), 'unavailable'],
    [529, errBody('overloaded_error'), 'unavailable'],
    [400, errBody('invalid_request_error'), 'config'],
    [404, errBody('not_found_error'), 'config'],
  ];
  for (const [status, body, code] of cases) {
    assert.equal(await codeOf(async () => json(status, body)), code, `status ${status}`);
  }
});

test('un fallo de red es unavailable', async () => {
  assert.equal(await codeOf(async () => { throw new TypeError('fetch failed'); }), 'unavailable');
});

test('stop_reason refusal es refused', async () => {
  const body = okBody([{ type: 'text', text: '' }], 'refusal');
  assert.equal(await codeOf(async () => json(200, body)), 'refused');
});

test('max_tokens o texto que no es JSON es bad_output', async () => {
  const cut = okBody([{ type: 'text', text: '{"reply":"Sal' }], 'max_tokens');
  assert.equal(await codeOf(async () => json(200, cut)), 'bad_output');
  assert.equal(await codeOf(async () => json(200, textBody('hola, no es JSON'))), 'bad_output');
  assert.equal(await codeOf(async () => json(200, okBody([]))), 'bad_output');
  assert.equal(await codeOf(async () => json(200, textBody({ reply: 'x' }))), 'bad_output');
});

const lookupInput = { lang: 'fr', word: 'manges', sentence: 'Tu manges souvent ?' };
const goodLookup = {
  contextTranslation: 'comes', lemma: 'manger', lemmaTranslation: 'comer', partOfSpeech: 'verb',
  gender: null, baseWithArticle: 'manger', sentenceTranslation: '¿Comes a menudo?',
};

async function lookupCodeOf(fetch) {
  try {
    await adapterWith(fetch).lookup(lookupInput);
  } catch (error) {
    assert.equal(error.name, 'ProviderError');
    return error.code;
  }
  assert.fail('debía fallar');
}

test('lookup arma la petición con el esquema, la palabra y la frase', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return json(200, textBody(goodLookup));
  };
  await adapterWith(fetch).lookup(lookupInput);
  assert.equal(sent.model, 'claude-haiku-5-5');
  assert.equal(sent.output_config.effort, 'low');
  assert.deepEqual(sent.output_config.format, { type: 'json_schema', schema: LOOKUP_SCHEMA });
  assert.equal(sent.system, buildLookupPrompt());
  assert.equal(sent.messages.length, 1);
  assert.equal(sent.messages[0].role, 'user');
  assert.ok(sent.messages[0].content.includes('manges'));
  assert.ok(sent.messages[0].content.includes('Tu manges souvent ?'));
  for (const key of ['thinking', 'temperature', 'top_p', 'top_k']) assert.equal(key in sent, false);
});

test('lookup normaliza una salida válida', async () => {
  const out = await adapterWith(async () => json(200, textBody({ ...goodLookup, lemma: 'Manger', baseWithArticle: 'manger' }))).lookup(lookupInput);
  assert.deepEqual(out, goodLookup);
});

test('lookup rechaza una salida inválida como bad_output', async () => {
  assert.equal(await lookupCodeOf(async () => json(200, textBody({ ...goodLookup, partOfSpeech: 'foo' }))), 'bad_output');
});

test('lookup traduce los errores HTTP igual que chat', async () => {
  assert.equal(await lookupCodeOf(async () => json(401, errBody('authentication_error'))), 'auth');
  assert.equal(await lookupCodeOf(async () => json(429, errBody('rate_limit_error'))), 'rate_limit');
  assert.equal(await lookupCodeOf(async () => json(500, errBody('api_error'))), 'unavailable');
});

test('lookup: refusal es refused y max_tokens es bad_output', async () => {
  assert.equal(await lookupCodeOf(async () => json(200, okBody([{ type: 'text', text: '' }], 'refusal'))), 'refused');
  assert.equal(await lookupCodeOf(async () => json(200, okBody([{ type: 'text', text: '{' }], 'max_tokens'))), 'bad_output');
});

test('el esquema de consulta lista todo en required y permite gender null', () => {
  assert.equal(LOOKUP_SCHEMA.additionalProperties, false);
  assert.deepEqual([...LOOKUP_SCHEMA.required].sort(), Object.keys(LOOKUP_SCHEMA.properties).sort());
});

const storyInput = { lang: 'fr', level: 'A1.2', topic: 'le marché', quizLang: 'es', supportLang: 'es' };
const storySentences = Array.from({ length: 20 }, (_, i) => ({ text: `Je vois un chat ${i} dans la maison.`, translation: `Veo un gato ${i} en la casa.` }));
const goodStory = {
  title: 'Mon chat',
  sentences: storySentences,
  questions: Array.from({ length: 4 }, () => ({
    question: '¿Qué ve el narrador?',
    options: ['Un gato', 'Un perro', 'Un pájaro'],
    answer: 0,
    explanation: 'El texto dice que ve un gato.',
    evidence: 'Je vois un chat 3 dans la maison.',
  })),
};

async function storyCodeOf(fetch) {
  try {
    await adapterWith(fetch).story(storyInput);
  } catch (error) {
    assert.equal(error.name, 'ProviderError');
    return error.code;
  }
  assert.fail('debía fallar');
}

test('story arma la petición con el esquema, el nivel, el idioma de las preguntas y el tema', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return json(200, textBody(goodStory));
  };
  await adapterWith(fetch).story(storyInput);
  assert.equal(sent.model, 'claude-haiku-5-5');
  assert.equal(sent.output_config.effort, 'low');
  assert.deepEqual(sent.output_config.format, { type: 'json_schema', schema: STORY_SCHEMA });
  assert.equal(sent.system, buildStoryPrompt('A1.2', 'es', 'es'));
  assert.ok(sent.system.includes('A1.2'));
  assert.ok(sent.system.includes('escritas en español'));
  assert.equal(sent.system.includes('escritas en francés'), false);
  assert.equal(sent.messages.length, 1);
  assert.equal(sent.messages[0].role, 'user');
  assert.ok(sent.messages[0].content.includes('le marché'));
  assert.equal(sent.system.includes('le marché'), false);
});

test('story devuelve las frases emparejadas y el body unido', async () => {
  const result = await adapterWith(async () => json(200, textBody(goodStory))).story(storyInput);
  assert.deepEqual(result.sentences, storySentences);
  assert.equal(result.body, storySentences.map((s) => s.text).join(' '));
});

test('story sin tema pide un tema libre', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return json(200, textBody(goodStory));
  };
  await adapterWith(fetch).story({ ...storyInput, topic: '' });
  assert.equal(sent.messages[0].content.includes('undefined'), false);
  assert.ok(sent.messages[0].content.trim().length > 0);
});

test('las instrucciones de historia cambian con el nivel y el idioma de las preguntas', () => {
  assert.ok(buildStoryPrompt('A2', 'fr').includes('passé composé'));
  assert.ok(buildStoryPrompt('A2', 'fr').includes('escritas en francés'));
  assert.equal(buildStoryPrompt('A2', 'fr').includes('escritas en español'), false);
  assert.ok(buildStoryPrompt('A2', 'es').includes('escritas en español'));
  assert.equal(buildStoryPrompt('A2', 'es').includes('escritas en francés'), false);
  assert.notEqual(buildStoryPrompt('A2', 'es'), buildStoryPrompt('A2', 'fr'));
  assert.ok(buildStoryPrompt('A1.1', 'es').includes('A1.1'));
  assert.equal(buildStoryPrompt('A1.1', 'es').includes('{'), false);
});

// El modelo no cuenta palabras con exactitud: se le pide una meta con margen sobre el mínimo del servidor
test('las instrucciones de historia piden una longitud con margen sobre el mínimo', () => {
  const prompt = buildStoryPrompt('A2', 'fr');
  assert.ok(prompt.includes('Unas 150 palabras'));
  assert.ok(prompt.includes('nunca menos de 110'));
  // Con frases cortas (unas 6 palabras en A1.1), 12 frases daban ~74 palabras: la meta de frases debe alcanzar la de palabras
  assert.ok(prompt.includes('unas 20 frases cortas'));
  assert.equal(prompt.includes('Entre 80 y 300 palabras'), false);
});

test('las instrucciones de historia piden un solo tiempo en A2 y preguntas sin mezclar idiomas', () => {
  assert.ok(buildStoryPrompt('A2', 'fr').includes('Mantén un mismo tiempo en todo el relato'));
  assert.equal(buildStoryPrompt('A1.2', 'es').includes('Mantén un mismo tiempo'), false);
  // La explicación siempre va en español, sin mezclar francés
  for (const quizLang of ['es', 'fr']) {
    assert.ok(buildStoryPrompt('A1.2', quizLang).includes('La explicación va solo en español, sin palabras francesas salvo citas del texto'));
  }
  // Preguntas en español: el modelo copiaba palabras del texto en las opciones; un ejemplo explícito lo corrige
  const es = buildStoryPrompt('A1.2', 'es');
  assert.ok(es.includes('Las preguntas y sus opciones van solo en español'));
  assert.ok(es.includes('«Manzanas rojas», no «Pommes rouges»'));
  assert.equal(es.includes('Las preguntas y sus opciones van en francés'), false);
  // Preguntas en francés: la regla del español no debe aplicarse (traducía las opciones al español)
  const fr = buildStoryPrompt('A1.2', 'fr');
  assert.ok(fr.includes('Las preguntas y sus opciones van en francés correcto y natural (no en español)'));
  assert.ok(fr.includes('cada opción debe responder gramaticalmente a su pregunta'));
  assert.equal(fr.includes('Manzanas rojas'), false);
  assert.equal(fr.includes('Las preguntas y sus opciones van solo en español'), false);
});

test('story normaliza una salida válida', async () => {
  const out = await adapterWith(async () => json(200, textBody(goodStory))).story(storyInput);
  assert.deepEqual(out, { ...goodStory, body: storySentences.map((pair) => pair.text).join(' ') });
});

test('story rechaza una salida inválida como bad_output', async () => {
  assert.equal(await storyCodeOf(async () => json(200, textBody({ ...goodStory, questions: [] }))), 'bad_output');
});

test('story traduce los errores HTTP igual que chat', async () => {
  assert.equal(await storyCodeOf(async () => json(401, errBody('authentication_error'))), 'auth');
  assert.equal(await storyCodeOf(async () => json(429, errBody('rate_limit_error'))), 'rate_limit');
  assert.equal(await storyCodeOf(async () => json(500, errBody('api_error'))), 'unavailable');
});

test('story: refusal es refused y max_tokens es bad_output', async () => {
  assert.equal(await storyCodeOf(async () => json(200, okBody([{ type: 'text', text: '' }], 'refusal'))), 'refused');
  assert.equal(await storyCodeOf(async () => json(200, okBody([{ type: 'text', text: '{' }], 'max_tokens'))), 'bad_output');
});

test('el esquema de historia lista todo en required y no admite campos extra', () => {
  assert.equal(STORY_SCHEMA.additionalProperties, false);
  assert.deepEqual([...STORY_SCHEMA.required].sort(), Object.keys(STORY_SCHEMA.properties).sort());
  const item = STORY_SCHEMA.properties.questions.items;
  assert.equal(item.additionalProperties, false);
  assert.deepEqual([...item.required].sort(), Object.keys(item.properties).sort());
});

const sentenceInput = {
  lang: 'fr', explainLang: 'es', level: 'A1.2', situation: 'En un café', focus: 'elisión', sentence: 'Je aime le café.',
};
const goodSentence = {
  corrected: "J'aime le café.",
  errors: [{ original: 'Je aime', corrected: "J'aime", kind: 'spelling', explanation: "Je pierde la e delante de vocal: j'aime." }],
  suggestion: '',
};

async function sentenceCodeOf(fetch) {
  try {
    await adapterWith(fetch).sentence(sentenceInput);
  } catch (error) {
    assert.equal(error.name, 'ProviderError');
    return error.code;
  }
  assert.fail('debía fallar');
}

test('sentence arma la petición con el esquema, el nivel y las tres líneas', async () => {
  let sent;
  const fetch = async (url, init) => {
    sent = JSON.parse(init.body);
    return json(200, textBody(goodSentence));
  };
  await adapterWith(fetch).sentence(sentenceInput);
  assert.equal(sent.output_config.effort, 'low');
  assert.deepEqual(sent.output_config.format, { type: 'json_schema', schema: SENTENCE_SCHEMA });
  assert.equal(sent.system, buildSentencePrompt('A1.2'));
  assert.ok(sent.system.includes('A1.2'));
  assert.equal(sent.messages.length, 1);
  assert.equal(sent.messages[0].role, 'user');
  assert.equal(sent.messages[0].content, 'Situación: En un café\nPatrón de la lección: elisión\nFrase del alumno: Je aime le café.');
});

test('sentence normaliza una salida válida', async () => {
  const out = await adapterWith(async () => json(200, textBody(goodSentence))).sentence(sentenceInput);
  assert.equal(out.correct, false);
  assert.equal(out.corrected, "J'aime le café.");
  assert.equal(out.errors.length, 1);
});

test('sentence rechaza un original que no está en la frase como bad_output', async () => {
  const bad = { ...goodSentence, errors: [{ ...goodSentence.errors[0], original: 'Tu aimes' }] };
  assert.equal(await sentenceCodeOf(async () => json(200, textBody(bad))), 'bad_output');
});

test('sentence traduce los errores HTTP igual que chat', async () => {
  assert.equal(await sentenceCodeOf(async () => json(401, errBody('authentication_error'))), 'auth');
  assert.equal(await sentenceCodeOf(async () => json(429, errBody('rate_limit_error'))), 'rate_limit');
  assert.equal(await sentenceCodeOf(async () => json(500, errBody('api_error'))), 'unavailable');
});
