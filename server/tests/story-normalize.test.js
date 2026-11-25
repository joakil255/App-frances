import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStory } from '../src/story-normalize.js';
import { ProviderError } from '../src/errors.js';

// 100 palabras en 5 frases
const sentence = 'Marie habite à Paris avec son chat noir et elle aime beaucoup le café du matin.';
const translation = 'Marie vive en París con su gato negro y le gusta mucho el café de la mañana.';
const pairs = (n, text = sentence) => Array.from({ length: n }, () => ({ text, translation }));
const BODY = Array(5).fill(sentence).join(' ');
const makeQuestion = (overrides = {}) => ({
  question: '¿Dónde vive Marie?',
  options: ['En Paris', 'En Lyon', 'En Niza'],
  answer: 0,
  explanation: 'El texto dice que vive en París.',
  evidence: 'Marie habite à Paris',
  ...overrides,
});
const makeStory = (overrides = {}) => ({
  title: 'Marie à Paris',
  sentences: pairs(5),
  questions: [makeQuestion(), makeQuestion(), makeQuestion(), makeQuestion()],
  ...overrides,
});
const bad = (raw) => assert.throws(() => normalizeStory(raw), (error) => error instanceof ProviderError && error.code === 'bad_output');
const withQuestion = (overrides) => makeStory({ questions: [makeQuestion(overrides), makeQuestion(), makeQuestion(), makeQuestion()] });

const withTexts = (texts) => texts.map((text) => ({ text, translation }));
const evidenceQuestions = (evidence) => [0, 1, 2, 3].map(() => makeQuestion({ evidence }));

test('acepta una historia válida y devuelve title, body, sentences y questions', () => {
  const story = normalizeStory(makeStory());
  assert.deepEqual(Object.keys(story), ['title', 'body', 'sentences', 'questions']);
  assert.equal(story.body, BODY);
  assert.deepEqual(story.sentences, pairs(5));
  assert.equal(story.questions.length, 4);
});

test('rechaza lo que no es objeto o le faltan campos', () => {
  for (const raw of [null, [], 'x', undefined]) bad(raw);
  bad({ title: 'a', sentences: pairs(5) });
});

test('sentences debe ser un arreglo de pares con text y translation', () => {
  bad(makeStory({ sentences: BODY }));
  bad(makeStory({ sentences: undefined }));
  bad(makeStory({ sentences: [...pairs(4), null] }));
  bad(makeStory({ sentences: [...pairs(4), 'texto'] }));
  bad(makeStory({ sentences: [...pairs(4), { text: sentence }] }));
});

test('título vacío o de más de 80 letras', () => {
  bad(makeStory({ title: '  ' }));
  bad(makeStory({ title: 'a'.repeat(81) }));
  assert.ok(normalizeStory(makeStory({ title: 'é'.repeat(80) })));
});

test('de 4 a 60 pares: 3 y 61 se rechazan, 4 y 60 valen', () => {
  // Frases largas para que el rechazo de 3 pares sea por el conteo y no por las palabras
  const long = Array(30).fill('mot').join(' ');
  bad(makeStory({ sentences: pairs(3, long) }));
  assert.ok(normalizeStory(makeStory({ sentences: pairs(4, long), questions: evidenceQuestions('mot mot') })));
  const short = 'Je vois un chat noir.';
  bad(makeStory({ sentences: pairs(61, short), questions: evidenceQuestions('Je vois') }));
  assert.ok(normalizeStory(makeStory({ sentences: pairs(60, short), questions: evidenceQuestions('Je vois') })));
});

test('text vacío; translation vacía, de 600 o de 601 letras', () => {
  bad(makeStory({ sentences: [...pairs(4), { text: '  ', translation }] }));
  bad(makeStory({ sentences: [...pairs(4), { text: sentence, translation: '' }] }));
  bad(makeStory({ sentences: [...pairs(4), { text: sentence, translation: '   ' }] }));
  bad(makeStory({ sentences: [...pairs(4), { text: sentence, translation: 'é'.repeat(601) }] }));
  assert.ok(normalizeStory(makeStory({ sentences: [...pairs(4), { text: sentence, translation: 'é'.repeat(600) }] })));
});

test('translation con HTML o Markdown se rechaza', () => {
  bad(makeStory({ sentences: [...pairs(4), { text: sentence, translation: 'El <b>gato</b>' }] }));
  bad(makeStory({ sentences: [...pairs(4), { text: sentence, translation: 'El **gato**' }] }));
});

test('exactamente 80 y 300 palabras son válidas', () => {
  const make = (n) => withTexts(['Un.', 'Deux.', 'Trois.', `${Array(n - 3).fill('mot').join(' ')}.`]);
  assert.ok(normalizeStory(makeStory({ sentences: make(80), questions: evidenceQuestions('Deux') })));
  assert.ok(normalizeStory(makeStory({ sentences: make(300), questions: evidenceQuestions('Deux') })));
  bad(makeStory({ sentences: make(79) }));
  bad(makeStory({ sentences: make(301) }));
});

test('más de 3000 letras', () => {
  bad(makeStory({ sentences: withTexts(['Un.', 'Deux.', 'Trois.', `Quatre ${'a'.repeat(3000)}.`]) }));
});

test('rechaza HTML en el texto de una frase', () => {
  bad(makeStory({ sentences: withTexts([...Array(4).fill(sentence), sentence.replace('chat', '<b>chat</b>')]) }));
  bad(makeStory({ sentences: withTexts([...Array(4).fill(sentence), '<br>']) }));
});

test('rechaza Markdown: ** __ ` # y viñetas en el texto', () => {
  const withBad = (text) => makeStory({ sentences: withTexts([...Array(4).fill(sentence), text]) });
  bad(withBad(sentence.replace('chat', '**chat**')));
  bad(withBad(sentence.replace('chat', '__chat__')));
  bad(withBad(sentence.replace('chat', '`chat`')));
  bad(withBad(`# Titre\n${sentence}`));
  bad(withBad(`${sentence}\n- un élément`));
  bad(withBad(`${sentence}\n* un élément`));
});

test('el título tampoco admite HTML ni Markdown', () => {
  bad(makeStory({ title: '<i>Marie</i>' }));
  bad(makeStory({ title: '**Marie**' }));
});

test('3 o 5 preguntas', () => {
  bad(makeStory({ questions: [makeQuestion(), makeQuestion(), makeQuestion()] }));
  bad(makeStory({ questions: Array(5).fill(0).map(() => makeQuestion()) }));
  bad(makeStory({ questions: 'no' }));
});

test('opciones: 2, 5, repetidas o vacías son inválidas; 3 y 4 valen', () => {
  bad(withQuestion({ options: ['a', 'b'], answer: 0 }));
  bad(withQuestion({ options: ['a', 'b', 'c', 'd', 'e'] }));
  bad(withQuestion({ options: ['a', 'b', 'a'] }));
  bad(withQuestion({ options: ['a', 'A', 'c'] }));
  bad(withQuestion({ options: ['a', ' ', 'c'] }));
  assert.ok(normalizeStory(withQuestion({ options: ['a', 'b', 'c', 'd'], answer: 3 })));
});

test('answer fuera de rango o no entero', () => {
  bad(withQuestion({ answer: 3 }));
  bad(withQuestion({ answer: -1 }));
  bad(withQuestion({ answer: 1.5 }));
  bad(withQuestion({ answer: '0' }));
});

test('pregunta o explicación vacías', () => {
  bad(withQuestion({ explanation: '  ' }));
  bad(withQuestion({ question: '' }));
});

test('evidence ausente del texto o vacía', () => {
  bad(withQuestion({ evidence: 'Marie habite à Lyon' }));
  bad(withQuestion({ evidence: '' }));
});

test('evidence con otra mayúscula o apóstrofo tipográfico es válida', () => {
  const sentences = (word) => withTexts(Array(5).fill(sentence.replace('Marie habite', `Marie ${word}`)));
  assert.ok(normalizeStory(makeStory({ sentences: sentences("d'habite"), questions: evidenceQuestions('MARIE D’HABITE à paris') })));
  assert.ok(normalizeStory(makeStory({ sentences: sentences('d’habite'), questions: evidenceQuestions("marie d'habite") })));
});

test('la evidence debe estar en el body unido, no solo en una traducción', () => {
  bad(withQuestion({ evidence: 'Marie vive en París' }));
});
