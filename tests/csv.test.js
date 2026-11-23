import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv, CsvError } from '../js/lib/csv.js';

const fieldsOf = (text) => parseCsv(text).records.map((r) => r.fields);

test('lee campos simples con coma', () => {
  assert.deepEqual(fieldsOf('frances,espanol\nle chat,el gato\n'), [['frances', 'espanol'], ['le chat', 'el gato']]);
});

test('respeta comas, punto y coma y comillas dobles dentro de comillas', () => {
  const text = 'a,b\n"ser, estar","dijo ""hola""; adiós"\n';
  assert.deepEqual(fieldsOf(text)[1], ['ser, estar', 'dijo "hola"; adiós']);
});

test('acepta saltos de línea dentro de un campo y numera bien las líneas', () => {
  const { records } = parseCsv('a,b\n"línea 1\nlínea 2",x\nfin,y\n');
  assert.deepEqual(records.map((r) => r.fields), [['a', 'b'], ['línea 1\nlínea 2', 'x'], ['fin', 'y']]);
  assert.deepEqual(records.map((r) => r.line), [1, 2, 4]);
});

test('acepta finales de línea \\r\\n y archivos sin salto final', () => {
  assert.deepEqual(fieldsOf('a,b\r\n1,2\r\n3,4'), [['a', 'b'], ['1', '2'], ['3', '4']]);
});

test('quita la marca BOM del principio', () => {
  assert.deepEqual(fieldsOf('\uFEFFfrances,espanol\n'), [['frances', 'espanol']]);
});

test('detecta el punto y coma de Excel en español', () => {
  const result = parseCsv('\uFEFFfrances;espanol\r\n"le chat, noir";el gato negro\r\n');
  assert.equal(result.delimiter, ';');
  assert.deepEqual(result.records[1].fields, ['le chat, noir', 'el gato negro']);
});

test('en caso de empate usa la coma', () => {
  assert.equal(parseCsv('a\n').delimiter, ',');
});

test('conserva campos vacíos, también al final', () => {
  assert.deepEqual(fieldsOf('a,b,\n,,x\n'), [['a', 'b', ''], ['', '', 'x']]);
});

test('unas comillas sin cerrar dan un error con su línea', () => {
  assert.throws(() => parseCsv('a,b\n1,2\n"sin cerrar,3\n'), (error) => error instanceof CsvError && error.line === 3);
});

test('acentos, signos franceses y emoji quedan intactos', () => {
  assert.deepEqual(fieldsOf('fr\n«l’œuf» ça été ñ 🇫🇷\n')[1], ['«l’œuf» ça été ñ 🇫🇷']);
});

test('toCsv escribe BOM, \\r\\n y comillas solo cuando hace falta', () => {
  const text = toCsv([['a', 'b'], ['ser, estar', 'di "sí"'], ['x;y', 'dos\nlíneas']]);
  assert.equal(text, '\uFEFFa,b\r\n"ser, estar","di ""sí"""\r\n"x;y","dos\nlíneas"\r\n');
});

test('ida y vuelta: leer lo escrito devuelve lo mismo', () => {
  const rows = [
    ['frances', 'espanol', 'nota'],
    ['l’eau', 'el agua', ''],
    ['"guillemets"', 'coma, y ; punto y coma', 'línea\r\ncon CRLF'],
    ['être', '«ser»', '=SUMA(1)'],
  ];
  assert.deepEqual(fieldsOf(toCsv(rows)), rows);
});
