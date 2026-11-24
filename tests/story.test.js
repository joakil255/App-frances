import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyUrl, sendStory, textFromStory, splitSentences, findEvidenceSentence } from '../js/lib/story.js';
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
const STORY = { title: ' Marie ', body: ` ${BODY}\n`, questions: [1, 2, 3, 4].map(question), remainingStories: 4 };

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
  for (const bad of [null, {}, { ...STORY, title: 1 }, { ...STORY, questions: 'x' }, { ...STORY, remainingStories: '1' }, badQuestion]) {
    assert.deepEqual(await send(reply(200, bad)), { ok: false, error: 'bad_output' });
  }
});

test('textFromStory recorta, arma la entrada y pasa validateText', () => {
  const input = textFromStory(STORY, { level: 'A1.2', topic: 'La famille', quizLang: 'es' });
  assert.equal(input.title, 'Marie');
  assert.equal(input.body, BODY);
  assert.equal(input.lang, 'fr');
  assert.equal(input.level, 'A1.2');
  assert.equal(input.topic, 'La famille');
  assert.deepEqual(input.source, GENERATED_SOURCE);
  assert.equal(input.quiz.lang, 'es');
  assert.deepEqual(input.quiz.questions[0].options, ['Lyon', 'Paris', 'Nice']);
  assert.equal(input.quiz.questions[0].evidence, 'Marie habite à Lyon.');
  const { ok, errors } = validateText({ ...input, status: 'review', quizResult: null });
  assert.equal(ok, true, JSON.stringify(errors));
});

test('textFromStory no junta los espacios internos del texto', () => {
  const body = 'Il a  deux chats.\nIls dorment.';
  const input = textFromStory({ ...STORY, body, questions: [] }, { level: 'A1.1', topic: '', quizLang: 'fr' });
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
