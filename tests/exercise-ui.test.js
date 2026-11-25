import { test } from 'node:test';
import assert from 'node:assert/strict';
import { insertAt } from '../js/lib/exercise-ui.js';

test('insertAt', () => {
  assert.deepEqual(insertAt('cafe', 3, 4, 'é'), { value: 'café', caret: 4 });
  assert.deepEqual(insertAt('cfe', 1, 1, 'a'), { value: 'cafe', caret: 2 });
  assert.deepEqual(insertAt('xxxx', 1, 3, 'é'), { value: 'xéx', caret: 2 });
  assert.deepEqual(insertAt('', 0, 0, 'à'), { value: 'à', caret: 1 });
});
