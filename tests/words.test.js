import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText, validateWord, duplicateKey, searchKey, sortWords, filterWords, categoriesOf,
} from '../js/lib/words.js';

const base = { fr: 'la maison', es: 'la casa', exampleFr: '', exampleEs: '', category: '', gender: 'f' };
const errorsOf = (input, existing, ownId) => validateWord({ ...base, ...input }, existing, ownId).errors;

test('normalizeText recorta, junta espacios y usa NFC', () => {
  assert.equal(normalizeText('  la   maison \n'), 'la maison');
  assert.equal(normalizeText(undefined), '');
  assert.equal(normalizeText('été'), 'été'); // é descompuesta → compuesta
});

test('una palabra correcta es válida y sale normalizada', () => {
  const result = validateWord({ ...base, fr: ' la  maison ', needsReview: 1 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.word, {
    fr: 'la maison', es: 'la casa', exampleFr: '', exampleEs: '', category: '', gender: 'f', needsReview: true,
  });
});

test('francés y español son obligatorios (también si solo hay espacios)', () => {
  assert.equal(errorsOf({ fr: '' }).fr, 'Escribe la palabra en francés.');
  assert.equal(errorsOf({ fr: '   ', gender: null }).fr, 'Escribe la palabra en francés.');
  assert.equal(errorsOf({ es: ' ' }).es, 'Escribe la traducción al español.');
});

test('máximo 200 caracteres por campo', () => {
  const ok = 'la ' + 'a'.repeat(197);
  assert.equal(errorsOf({ fr: ok }).fr, undefined);
  assert.equal(errorsOf({ fr: ok + 'a' }).fr, 'Máximo 200 caracteres.');
  assert.equal(errorsOf({ category: 'c'.repeat(201) }).category, 'Máximo 200 caracteres.');
});

test('si hay una frase de ejemplo, la otra es obligatoria', () => {
  assert.equal(errorsOf({ exampleFr: 'La maison est grande.' }).exampleEs, 'Falta la traducción del ejemplo.');
  assert.equal(errorsOf({ exampleEs: 'La casa es grande.' }).exampleFr, 'Falta el ejemplo en francés.');
  assert.deepEqual(errorsOf({ exampleFr: 'La maison est grande.', exampleEs: 'La casa es grande.' }), {});
});

test('el género solo puede ser m, f o vacío', () => {
  assert.equal(validateWord({ ...base, gender: '' }).word.gender, null);
  assert.equal(errorsOf({ gender: 'x' }).gender, 'El género debe ser masculino, femenino o sin género.');
});

test('con género, el francés debe llevar artículo', () => {
  assert.equal(errorsOf({ fr: 'maison' }).fr, "Con género, escribe el artículo: le, la, l', les, un, une o des.");
  assert.equal(errorsOf({ fr: 'être', gender: null }).fr, undefined);
});

test('el artículo debe coincidir con el género', () => {
  assert.equal(errorsOf({ fr: 'la chat', gender: 'm' }).gender, '«la» es femenino: cambia el género o el artículo.');
  assert.equal(errorsOf({ fr: 'une chat', gender: 'm' }).gender, '«une» es femenino: cambia el género o el artículo.');
  assert.equal(errorsOf({ fr: 'le maison', gender: 'f' }).gender, '«le» es masculino: cambia el género o el artículo.');
  assert.equal(errorsOf({ fr: 'Le Chat', gender: 'm' }).gender, undefined);
});

test("l', l’, les y des valen con cualquier género", () => {
  for (const fr of ["l'eau", 'l’eau', 'les enfants', 'des pommes']) {
    assert.deepEqual(errorsOf({ fr, gender: 'f' }), {}, fr);
    assert.deepEqual(errorsOf({ fr, gender: 'm' }), {}, fr);
  }
});

test('duplicateKey ignora mayúsculas, espacios y el tipo de apóstrofo, pero no los acentos', () => {
  assert.equal(duplicateKey('  La   Maison '), duplicateKey('la maison'));
  assert.equal(duplicateKey('l’eau'), duplicateKey("l'eau"));
  assert.notEqual(duplicateKey('a'), duplicateKey('à'));
});

test('no deja guardar una palabra que ya está en la lista', () => {
  const existing = [{ id: 'w1', ...base }];
  assert.equal(errorsOf({ fr: 'La  Maison' }, existing).fr, '«La Maison» ya está en tu lista.');
});

test('editar una palabra cambiando solo mayúsculas no la marca como duplicada de sí misma', () => {
  const existing = [{ id: 'w1', ...base, fr: 'Le chat', gender: 'm' }];
  assert.deepEqual(errorsOf({ fr: 'le chat', gender: 'm' }, existing, 'w1'), {});
});

test('searchKey quita acentos, mayúsculas y unifica el apóstrofo', () => {
  assert.equal(searchKey('Être'), 'etre');
  assert.equal(searchKey('Français'), 'francais');
  assert.equal(searchKey('L’Œuf'), "l'œuf");
});

const words = [
  { id: '1', fr: 'être', es: 'ser, estar', category: 'Verbos', gender: null },
  { id: '2', fr: 'la fenêtre', es: 'la ventana', category: 'Casa', gender: 'f' },
  { id: '3', fr: 'la tête', es: 'la cabeza', category: '', gender: 'f' },
  { id: '4', fr: 'le pain', es: 'el pan', category: 'Comida', gender: 'm' },
  { id: '5', fr: "l'eau", es: 'el agua', category: 'Comida', gender: 'f' },
  { id: '6', fr: 'la maison', es: 'la casa', category: 'Casa', gender: 'f' },
];
const frs = (list) => list.map((w) => w.fr);

test('la búsqueda ignora acentos y busca también en español', () => {
  assert.deepEqual(frs(filterWords(words, { query: 'etre' })), ['être', 'la fenêtre']);
  assert.deepEqual(frs(filterWords(words, { query: 'tete' })), ['la tête']);
  assert.deepEqual(frs(filterWords(words, { query: 'CASA' })), ['la maison']);
  assert.equal(filterWords(words, { query: '   ' }).length, words.length);
});

test('filtra por categoría (incluida sin categoría) y por género', () => {
  assert.deepEqual(frs(filterWords(words, { category: 'Comida' })), ["l'eau", 'le pain']);
  assert.deepEqual(frs(filterWords(words, { category: '' })), ['la tête']);
  assert.deepEqual(frs(filterWords(words, { gender: 'm' })), ['le pain']);
  assert.deepEqual(frs(filterWords(words, { gender: 'none' })), ['être']);
  assert.deepEqual(frs(filterWords(words, { gender: 'f', category: 'Casa' })), ['la fenêtre', 'la maison']);
});

test('ordena alfabéticamente en francés ignorando el artículo', () => {
  assert.deepEqual(frs(sortWords(words)), ["l'eau", 'être', 'la fenêtre', 'la maison', 'le pain', 'la tête']);
});

test('categoriesOf devuelve las categorías únicas y ordenadas, sin la vacía', () => {
  assert.deepEqual(categoriesOf(words), ['Casa', 'Comida', 'Verbos']);
});

test('filtra 1.000 palabras en menos de 50 ms', () => {
  const many = Array.from({ length: 1000 }, (_, i) => ({
    id: String(i), fr: `le mot${i} é`, es: `palabra ${i}`, category: `c${i % 10}`, gender: 'm',
  }));
  filterWords(many, { query: 'mot' }); // primera vez: calienta el motor
  const start = performance.now();
  const result = filterWords(many, { query: 'MOT9', category: 'c9' });
  assert.ok(performance.now() - start < 50, 'demasiado lento');
  assert.ok(result.length > 0);
});

// --- Mejora B de la auditoría: la palabra francesa se guarda con el apóstrofo recto y sin espacios a su lado ---
const saved = (fr, extra = {}) => validateWord({ ...base, gender: null, fr, ...extra }).word;

test('al guardar, el apóstrofo de la palabra se unifica y pierde los espacios', () => {
  for (const fr of ['l’ami', "l' ami", 'l ’ami', 'l ʼ ami', 'l‘ami']) {
    assert.equal(saved(fr).fr, "l'ami", fr);
  }
  assert.equal(saved('L’Ami').fr, "L'Ami"); // no cambia las mayúsculas
});

test('las palabras sin apóstrofo o con apóstrofo interno no cambian', () => {
  for (const fr of ["aujourd'hui", "s'il vous plaît", 'la maison', 'bonjour']) assert.equal(saved(fr).fr, fr);
});

test('el ejemplo en francés no se normaliza (puede tener comillas)', () => {
  assert.equal(saved('le chat', { exampleFr: "Il dit 'oui'.", exampleEs: 'Dice «sí».' }).exampleFr, "Il dit 'oui'.");
  assert.equal(saved('le chat', { exampleFr: 'L’œuf est là.', exampleEs: 'El huevo está ahí.' }).exampleFr, 'L’œuf est là.');
});

test("duplicateKey trata «l' ami», «l'ami» y «l’ami» como la misma palabra", () => {
  assert.equal(duplicateKey("l' ami"), duplicateKey("l'ami"));
  assert.equal(duplicateKey('l ’ami'), duplicateKey('l’ami'));
});

test('guardar «l\' ami» con una «l’ami» ya guardada avisa; editar esa misma no', () => {
  const existing = [{ id: 'w1', fr: 'l’ami' }];
  assert.match(errorsOf({ fr: "l' ami", gender: null }, existing).fr, /ya está en tu lista/);
  assert.deepEqual(errorsOf({ fr: "l' ami", gender: null }, existing, 'w1'), {});
});
