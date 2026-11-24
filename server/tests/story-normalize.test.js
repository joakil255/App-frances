import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStory } from '../src/story-normalize.js';
import { ProviderError } from '../src/errors.js';

// 100 palabras en 5 frases
const sentence = 'Marie habite à Paris avec son chat noir et elle aime beaucoup le café du matin.';
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
  body: BODY,
  questions: [makeQuestion(), makeQuestion(), makeQuestion(), makeQuestion()],
  ...overrides,
});
const bad = (raw) => assert.throws(() => normalizeStory(raw), (error) => error instanceof ProviderError && error.code === 'bad_output');
const withQuestion = (overrides) => makeStory({ questions: [makeQuestion(overrides), makeQuestion(), makeQuestion(), makeQuestion()] });

test('acepta una historia válida y devuelve title, body y questions', () => {
  const story = normalizeStory(makeStory());
  assert.deepEqual(Object.keys(story), ['title', 'body', 'questions']);
  assert.equal(story.questions.length, 4);
});

test('rechaza lo que no es objeto o le faltan campos', () => {
  for (const raw of [null, [], 'x', undefined]) bad(raw);
  bad({ title: 'a', body: BODY });
});

test('título vacío o de más de 80 letras', () => {
  bad(makeStory({ title: '  ' }));
  bad(makeStory({ title: 'a'.repeat(81) }));
  assert.ok(normalizeStory(makeStory({ title: 'é'.repeat(80) })));
});

test('exactamente 80 y 300 palabras con 4 frases son válidas', () => {
  const make = (n) => {
    const filler = Array(n - 3).fill('mot').join(' ');
    return `Un. Deux. Trois. ${filler}.`;
  };
  assert.ok(normalizeStory(makeStory({ body: make(80), questions: [0, 1, 2, 3].map(() => makeQuestion({ evidence: 'Deux' })) })));
  assert.ok(normalizeStory(makeStory({ body: make(300), questions: [0, 1, 2, 3].map(() => makeQuestion({ evidence: 'Deux' })) })));
  bad(makeStory({ body: make(79) }));
  bad(makeStory({ body: make(301) }));
});

test('más de 3000 letras', () => {
  const body = `Un. Deux. Trois. Quatre. ${'a'.repeat(3000)}`;
  bad(makeStory({ body }));
});

test('menos de 4 frases', () => {
  const body = Array(100).fill('mot').join(' ') + '. Fin. Oui.';
  bad(makeStory({ body, questions: [0, 1, 2, 3].map(() => makeQuestion({ evidence: 'Fin' })) }));
});

test('cuenta frases con ! ? … y «...», también con acentos', () => {
  const filler = Array(90).fill('été').join(' ');
  const body = `Où es-tu? Je suis là! Ça va... Très bien… ${filler}`;
  assert.ok(normalizeStory(makeStory({ body, questions: [0, 1, 2, 3].map(() => makeQuestion({ evidence: 'Je suis là' })) })));
  // «...» cuenta como un solo final, no como tres frases
  const three = `Où es-tu... Je suis là... Ça va... ${filler}`;
  bad(makeStory({ body: three }));
});

test('rechaza HTML', () => {
  bad(makeStory({ body: BODY.replace('chat', '<b>chat</b>') }));
  bad(makeStory({ body: `${BODY} <br>` }));
});

test('rechaza Markdown: ** __ ` # y viñetas', () => {
  bad(makeStory({ body: BODY.replace('chat', '**chat**') }));
  bad(makeStory({ body: BODY.replace('chat', '__chat__') }));
  bad(makeStory({ body: BODY.replace('chat', '`chat`') }));
  bad(makeStory({ body: `# Titre\n${BODY}` }));
  bad(makeStory({ body: `${BODY}\n- un élément` }));
  bad(makeStory({ body: `${BODY}\n* un élément` }));
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
  const body = BODY.replace('Marie habite', "Marie d'habite");
  assert.ok(normalizeStory(makeStory({ body, questions: [0, 1, 2, 3].map(() => makeQuestion({ evidence: 'MARIE D’HABITE à paris' })) })));
  const typographic = BODY.replace('Marie habite', 'Marie d’habite');
  assert.ok(normalizeStory(makeStory({ body: typographic, questions: [0, 1, 2, 3].map(() => makeQuestion({ evidence: "marie d'habite" })) })));
});
