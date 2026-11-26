import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  storyUrl, sendStory, textFromStory, splitSentences, findEvidenceSentence,
  translateUrl, readerSentences, translatableSentences, sendTranslation,
} from '../js/lib/story.js';
import { PRODUCTION_CHAT_URL } from '../js/lib/chat.js';
import { validateText, GENERATED_SOURCE } from '../js/lib/texts.js';

const BODY = "Marie habite à Lyon. Elle aime l’école. Aujourd'hui, elle mange une pomme. Le soir, elle lit.";
const question = (n) => ({
  question: ` Question ${n} ? `,
  options: [' Lyon ', 'Paris', ' Nice '],
  answer: 0,
  explanation: ' Elle habite à Lyon. ',
  evidence: ' Marie habite à Lyon. ',
});
const PAIRS = splitSentences(BODY).map((text) => ({ text: ` ${text} `, translation: ` Traducción de ${text} ` }));
const STORY = { title: ' Marie ', body: ` ${BODY}\n`, sentences: PAIRS, questions: [1, 2, 3, 4].map(question), remainingStories: 4 };

test('storyUrl cambia /chat por /story', () => {
  assert.equal(storyUrl('example.com'), PRODUCTION_CHAT_URL.replace(/\/chat$/, '/story'));
  assert.equal(storyUrl('localhost'), 'http://127.0.0.1:8787/story');
});

const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
const send = (fetch, extra = {}) => sendStory({ url: 'u', code: 'c', body: {}, fetch, isOnline: true, ...extra });

test('sendStory devuelve la historia y lo que queda', async () => {
  const out = await send(reply(200, STORY));
  assert.equal(out.ok, true);
  assert.equal(out.remainingStories, 4);
  assert.equal(out.result.title, ' Marie ');
  assert.equal('remainingStories' in out.result, false);
});

test('sendStory: story_limit, JSON roto, sin conexión y forma incorrecta', async () => {
  assert.deepEqual(await send(reply(429, { error: 'story_limit' })), { ok: false, error: 'story_limit' });
  assert.deepEqual(await send(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x'); } })),
    { ok: false, error: 'bad_output' });
  assert.deepEqual(await send(async () => { throw new TypeError('x'); }), { ok: false, error: 'network' });
  assert.deepEqual(await send(reply(200, STORY), { isOnline: false }), { ok: false, error: 'offline' });
  const badQuestion = { ...STORY, questions: [{ ...question(1), options: 'x' }] };
  for (const bad of [null, {}, { ...STORY, title: 1 }, { ...STORY, questions: 'x' }, { ...STORY, remainingStories: '1' }, badQuestion,
    { ...STORY, sentences: undefined }, { ...STORY, sentences: [{ text: 'a' }] }, { ...STORY, sentences: [{ text: 1, translation: 'b' }] }]) {
    assert.deepEqual(await send(reply(200, bad)), { ok: false, error: 'bad_output' });
  }
});

test('textFromStory recorta, arma la entrada y pasa validateText', () => {
  const input = textFromStory(STORY, { level: 'A1.2', topic: 'La famille', quizLang: 'es', supportLang: 'es' });
  assert.equal(input.title, 'Marie');
  assert.equal(input.body, BODY);
  assert.equal(input.lang, 'fr');
  assert.equal(input.level, 'A1.2');
  assert.equal(input.topic, 'La famille');
  assert.deepEqual(input.source, GENERATED_SOURCE);
  assert.equal(input.quiz.lang, 'es');
  assert.equal(input.translation.lang, 'es');
  assert.equal(input.translation.status, 'review');
  assert.deepEqual(input.translation.sentences, PAIRS.map((p) => p.translation.trim()));
  assert.deepEqual(input.quiz.questions[0].options, ['Lyon', 'Paris', 'Nice']);
  assert.equal(input.quiz.questions[0].evidence, 'Marie habite à Lyon.');
  const { ok, errors } = validateText({
    ...input, status: 'review', quizResult: null, createdAt: '2026-11-24T10:00:00.000Z', updatedAt: '2026-11-24T10:00:00.000Z',
  });
  assert.equal(ok, true, JSON.stringify(errors));
});

test('textFromStory no junta los espacios internos del texto', () => {
  const body = 'Il a  deux chats.\nIls dorment.';
  const input = textFromStory({ ...STORY, body, questions: [] }, { level: 'A1.1', topic: '', quizLang: 'fr', supportLang: 'es' });
  assert.equal(input.body, body);
});

test('splitSentences parte, recorta y no deja vacías', () => {
  assert.deepEqual(splitSentences(BODY), [
    'Marie habite à Lyon.', 'Elle aime l’école.', "Aujourd'hui, elle mange une pomme.", 'Le soir, elle lit.',
  ]);
  assert.deepEqual(splitSentences('  \n '), []);
  assert.deepEqual(splitSentences(''), []);
});

test('splitSentences sin Segmenter devuelve el texto como una sola frase', () => {
  assert.deepEqual(splitSentences(' Bonjour. Salut. ', null), ['Bonjour. Salut.']);
  assert.deepEqual(splitSentences('  ', null), []);
});

test('findEvidenceSentence ignora mayúsculas y apóstrofos tipográficos', () => {
  const sentences = splitSentences(BODY);
  assert.equal(findEvidenceSentence(sentences, 'elle aime l\'école'), 1);
  assert.equal(findEvidenceSentence(sentences, 'AUJOURD’HUI, elle mange'), 2);
  assert.equal(findEvidenceSentence(sentences, 'Le soir'), 3);
  assert.equal(findEvidenceSentence(sentences, 'Elle dort'), -1);
  assert.equal(findEvidenceSentence([], 'Le soir'), -1);
});

test('findEvidenceSentence pliega ʼ (U+02BC) como el servidor', () => {
  const sentences = splitSentences('Marie habite à Lyon. Elle aime l\u02BCécole. Le soir, elle lit.');
  assert.equal(findEvidenceSentence(sentences, "elle aime l'école"), 1);
  assert.equal(findEvidenceSentence(splitSentences("Elle aime l'école. Bonjour."), 'elle aime l\u02BCécole'), 0);
});

test('textFromStory guarda frases y traducción con los bordes recortados', () => {
  const input = textFromStory(STORY, { level: 'A1.2', topic: '', quizLang: 'es', supportLang: 'es' });
  assert.deepEqual(input.sentences, splitSentences(BODY));
  assert.equal(input.translation.sentences.length, input.sentences.length);
});

test('translateUrl cambia /chat por /translate', () => {
  assert.equal(translateUrl('example.com'), PRODUCTION_CHAT_URL.replace(/\/chat$/, '/translate'));
  assert.equal(translateUrl('127.0.0.1'), 'http://127.0.0.1:8787/translate');
});

test('readerSentences usa las frases guardadas o parte el texto', () => {
  assert.deepEqual(readerSentences({ sentences: ['A.', 'B.'], body: 'otro' }), ['A.', 'B.']);
  assert.deepEqual(readerSentences({ body: BODY }), splitSentences(BODY));
  assert.deepEqual(readerSentences({ body: 'Bonjour.' }), ['Bonjour.']);
});

test('translatableSentences parte con el Segmenter real y valida los límites', () => {
  assert.equal(translatableSentences('Fin. Début.').length, 2);
  assert.deepEqual(translatableSentences('Fin.Début.'), ['Fin.Début.']); // sin espacio, el Segmenter no parte
  assert.deepEqual(translatableSentences(BODY), splitSentences(BODY));
  assert.equal(translatableSentences('a'.repeat(601), undefined), null);
  assert.equal(translatableSentences('', undefined), null);
  assert.equal(translatableSentences(Array.from({ length: 61 }, (_, i) => `Phrase ${i}.`).join(' ')), null);
  assert.equal(translatableSentences(Array.from({ length: 60 }, (_, i) => `Phrase ${i}.`).join(' ')).length, 60);
  // un Segmenter que pierde texto no cumple sentencesMatchBody
  const lossy = class { segment() { return [{ segment: 'Hola.' }]; } };
  assert.equal(translatableSentences('Hola. Adiós.', lossy), null);
});

test('sendTranslation devuelve las traducciones si el largo coincide', async () => {
  const body = { sentences: ['A.', 'B.'] };
  const ok = await sendTranslation({ url: 'u', code: 'c', body, fetch: reply(200, { translations: ['a', 'b'], remainingTranslations: 3 }), isOnline: true });
  assert.deepEqual(ok, { ok: true, translations: ['a', 'b'], remainingTranslations: 3 });
  const short = await sendTranslation({ url: 'u', code: 'c', body, fetch: reply(200, { translations: ['a'], remainingTranslations: 3 }), isOnline: true });
  assert.deepEqual(short, { ok: false, error: 'bad_output' });
  for (const bad of [null, {}, { translations: ['a', 2], remainingTranslations: 1 }, { translations: ['a', 'b'] }]) {
    assert.deepEqual(await sendTranslation({ url: 'u', code: 'c', body, fetch: reply(200, bad), isOnline: true }), { ok: false, error: 'bad_output' });
  }
  const limit = await sendTranslation({ url: 'u', code: 'c', body, fetch: reply(429, { error: 'translate_limit' }), isOnline: true });
  assert.deepEqual(limit, { ok: false, error: 'translate_limit' });
});

test('sendTranslation sin conexión no llama a fetch', async () => {
  let called = false;
  const out = await sendTranslation({ url: 'u', code: 'c', body: { sentences: ['A.'] }, fetch: async () => { called = true; }, isOnline: false });
  assert.deepEqual(out, { ok: false, error: 'offline' });
  assert.equal(called, false);
});
