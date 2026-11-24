import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCase } from '../eval/score.js';

const fix = (corrected) => ({ original: 'x', corrected, explanation: 'y' });

test('acierta si una corrección contiene la forma esperada', () => {
  const result = scoreCase({ expected: 'la maison' }, [fix('La maison est grande.')]);
  assert.deepEqual(result, { found: true, invented: false });
});

test('ignora mayúsculas, apóstrofo tipográfico y punto final', () => {
  assert.equal(scoreCase({ expected: "l'école" }, [fix('L’ÉCOLE.')]).found, true);
  assert.equal(scoreCase({ expected: "j'habite" }, [fix("J’habite à Santiago")]).found, true);
});

test('no acierta si ninguna corrección tiene la forma esperada', () => {
  assert.equal(scoreCase({ expected: 'une pomme' }, [fix('un pomme')]).found, false);
  assert.equal(scoreCase({ expected: 'une pomme' }, []).found, false);
});

test('la #7 acepta las dos formas', () => {
  const expected = ['ils sont', 'il est'];
  assert.equal(scoreCase({ expected }, [fix('Ils sont dans la cuisine.')]).found, true);
  assert.equal(scoreCase({ expected }, [fix('Il est dans la cuisine.')]).found, true);
  assert.equal(scoreCase({ expected }, [fix('Elles sont')]).found, false);
});

test('en una frase correcta, una corrección cuenta como inventada', () => {
  assert.deepEqual(scoreCase({ expected: null }, [fix('Il fait froid')]), { found: false, invented: true });
  assert.deepEqual(scoreCase({ expected: null }, []), { found: false, invented: false });
});

test('en una frase con error, una corrección extra no es inventada', () => {
  assert.equal(scoreCase({ expected: 'la maison' }, [fix('la maison'), fix('otra')]).invented, false);
});
