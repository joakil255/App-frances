# Etapa 12 — Construir frases: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección «Construir frases» con:
- 6 lecciones fijas y revisables (formato independiente del idioma);
- ejercicios de ordenar, completar y corregir, corregidos sin IA;
- una frase libre por situación, corregida por Claude en `/sentence`;
- un repaso espaciado propio con los ejercicios fallados 2 veces y las frases libres con errores.

**Architecture:**
- **Datos:** lecciones en JSON (`data/lessons/fr/`), validadas por `js/lib/lessons.js`.
- **Lógica pura:** comprobación y diferencia por palabras en `js/lib/sentence-check.js`; fichas e inserción de acentos en `js/lib/exercise-ui.js`.
- **Almacén:** progreso y tarjetas en `js/lib/build-storage.js` (clave `app-frances-build`), con el programador de `scheduler.js`. Copia de seguridad v4.
- **Servidor:** ruta `POST /sentence` con contador aparte, salida validada y `sentence()` en el adaptador de Claude.
- **Pantalla:** `js/screens/build.js` (`#/construir`, `#/construir/<id>`, `#/construir/repaso`) y una tarjeta en Inicio.

**Tech Stack:** JS en módulos sin dependencias nuevas, `fetch`, `localStorage`, `speechSynthesis`, Cloudflare Worker + KV, `@anthropic-ai/sdk` 1.13.0 (ya aprobada), `node --test` y ESLint.

**Spec:** `docs/superpowers/specs/2026-11-25-etapa-12-construir-frases-design.md` + `DESIGN.md`

## Global Constraints
- **TDD estricto:** primero la prueba, verla fallar y luego el código mínimo. Nunca se debilita ni se borra una prueba.
- **Git solo local:** rama `etapa-12-construir-frases`.
  - Commits en español: el asunto en una línea, una línea en blanco y luego `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Usa `git commit -m "asunto" -m "Co-Authored-By: …"`.
  - **Sin `git push`, sin `wrangler deploy` y sin reescribir el historial.**
- **Sin dependencias nuevas.** Los datos van solo a Anthropic. Los agentes no llaman a Claude ni a Cloudflare.
- Todo texto de una lección, de Claude o del usuario se pinta con `textContent`.
- Nombres de archivos, variables y funciones en inglés; comentarios breves en español; interfaz en español.
- **Lecciones:**
  - formato `'app-frances-leccion'` versión `1`; índice `'app-frances-lecciones'` versión `1`;
  - `id` del tipo `fr-a1-01`; `level` ∈ `A1` o `A2`;
  - `areas` ⊆ `grammar`, `syntax`, `spelling`;
  - tipos de ejercicio `order`, `gap` y `fix`; situaciones aparte;
  - `review: true` exige `reviewNote`.
- **Comprobación:** reutiliza `normalizeAnswer` y `foldAccents` de `js/lib/answer-check.js`. No cuentan las mayúsculas ni la puntuación. Los acentos siguen el ajuste `requireAccents` del estudio.
- **Almacén:** clave `app-frances-build` → `{ schemaVersion: 1, progress, cards }`.
  - Tarjeta de ejercicio: `ex:<lessonId>:<exerciseId>`. Tarjeta propia: `own:<uuid>`.
  - Nace al **2.º fallo** (seguido o no) y nunca dos veces.
  - La primera vez vence **mañana**.
  - Acierto = `'good'` y fallo = `'again'`, con `review()` de `scheduler.js` y el algoritmo de los ajustes de Estudiar.
- **Copia de seguridad:** `BACKUP_VERSION = 4`. Lee las versiones 1 a 4. Una v1 a v3 **no toca** `app-frances-build`.
- **Servidor:**
  - `POST /sentence`, con cuerpo `{ lang: 'fr', explainLang: 'es', level, situation, focus, sentence }`;
  - `level` ∈ `A1` o `A2`; `situation` y `focus`, de 1 a 300 letras; `sentence`, de 1 a 300 letras y sin saltos de línea;
  - clave KV `sentence:AAAA-MM-DD` y `SENTENCE_LIMIT=50`; error `sentence_limit` (429).
- **Salida de `/sentence`:** `{ correct, corrected, errors: [{ original, corrected, kind, explanation }], suggestion, remainingSentences }`.
  - `kind` ∈ `grammar`, `syntax` o `spelling`.
  - `correct` lo calcula el servidor (`errors` vacía).
- `sw.js`: `CACHE_VERSION = 'v22'` (lo sube la primera tarea que toca `sw.js`). Cada archivo nuevo de la app va en `PRECACHE_URLS` en la tarea que lo crea. `tests/precache.test.js` ya exige todo lo que está en `data/` y `js/`.

## Review Focus
1. **Teclado de Android:** una respuesta con apóstrofo tipográfico (`’`) o con espacio fino antes de `?` (`U+202F`) es correcta (Tarea 2).
2. **Restaurar una copia v3 hecha antes de esta etapa** no borra las tarjetas ni el progreso de frases (Tarea 4).
3. **Lección corregida después de crear tarjetas:** una tarjeta cuyo ejercicio ya no existe no aparece en la cola ni en el contador, y no rompe el repaso (Tarea 3).
4. **Claude marca como error una frase correcta que no usa el patrón,** o devuelve un `original` que no está en la frase: lo primero lo detecta la prueba real como «error inventado»; lo segundo da `bad_output` (Tareas 5 y 6).
5. **Sin espacio en el navegador al crear una tarjeta:** `StorageError` y la memoria sin cambios; la pantalla avisa y la práctica sigue (Tareas 3 y 10).

---

### Task 1: Formato y carga de lecciones (TDD)
**Files:** Create `js/lib/lessons.js`, `tests/lessons.test.js`. Modify `sw.js` (`v22` y `js/lib/lessons.js`).

**Produces:**
- `LESSON_FORMAT = 'app-frances-leccion'`, `INDEX_FORMAT = 'app-frances-lecciones'`, `LESSON_LEVELS`, `LESSON_AREAS` y `EXERCISE_TYPES`;
- `validateLesson(lesson): { ok, errors: string[] }`;
- `findExercise(lessons, lessonId, exerciseId)` → el ejercicio o `null`;
- `lessonsIndexUrl(lang)` → `'data/lessons/<lang>/index.json'`;
- `loadLessons({ fetch, lang })` → `[{ id, lesson, error }]` en el orden del índice.
  - `error` es `null`, `'missing'` (no se pudo leer) o `'invalid'` (no pasó la validación).
  - Si falla el índice, lanza un error.

**Forma de los elementos.** Cada elemento lleva `id`, único en toda la lección; así el documento de revisión puede nombrarlo. Prefijos: `i` (idea), `t` (cómo pensarlo), `e` (ejemplo), `p` (trampa), `x` (ejercicio) y `s` (situación).
- `idea[]`: `{ id, text, sourceIds, review, reviewNote? }`
- `think[]`: `{ id, source, target, note, sourceIds, review, reviewNote? }`
- `examples[]`: `{ id, text, translation, sourceIds, review, reviewNote? }`. `sourceIds` puede ser `[]`.
- `pitfalls[]`: `{ id, wrong, right, explanation, sourceIds, review, reviewNote? }`
- `exercises[]`:
  - `order`: `{ id, type, prompt, tiles, answers, rule, sourceIds, review, reviewNote? }`;
  - `gap`: `{ id, type, prompt, before, after, answers, mistakes, rule, … }`;
  - `fix`: `{ id, type, prompt, wrong, answers, mistakes, rule, … }`.
- `situations[]`: `{ id, situation, models, focus, sourceIds, review, reviewNote? }`
- `pattern[]`: `{ label, options }`. `sources[]`: `{ id, title, publisher, year, pages, url }`.

- [ ] **Paso 1: pruebas que fallan.** Con una lección mínima válida escrita en la prueba (`fr-a1-99`):
  - la lección válida → `{ ok: true, errors: [] }`;
  - cada uno de estos casos da `ok: false`, con un error que nombra el `id` del elemento:
    - falta `title`;
    - `format` distinto;
    - `lang: 'fra'`;
    - `level: 'B1'`;
    - `areas: ['vocab']`;
    - `id` repetido;
    - `sourceIds` con una fuente que no existe;
    - `order` cuyas fichas no forman una respuesta (`tiles: ['Je', 'suis']`, `answers: ['Je suis là.']`);
    - `mistakes[].answer` igual a una respuesta aceptada (comparada con `normalizeAnswer`);
    - `fix` con `wrong` igual a una respuesta;
    - `review: true` sin `reviewNote`;
    - un tipo desconocido;
  - `answers` con apóstrofo tipográfico → error (el contenido usa `'` recto);
  - `loadLessons`, con un `fetch` falso:
    - índice con dos lecciones, una válida y otra con 404 → `[{ id, lesson, error: null }, { id, lesson: null, error: 'missing' }]`;
    - JSON roto → `'invalid'`;
    - índice con `format` incorrecto → lanza.
- [ ] **Paso 2:** ver que fallan.
- [ ] **Paso 3:** implementar. Para comprobar las fichas, `normalizeAnswer(tiles.join(' '))` debe ser igual a `normalizeAnswer(answer)` para cada respuesta.
- [ ] **Paso 4:** `npm test` y `npm run lint` pasan. Commit `feat: formato y carga de lecciones`.

### Task 2: Comprobación de respuestas, fichas y acentos (TDD)
**Files:** Create `js/lib/sentence-check.js`, `js/lib/exercise-ui.js`, `tests/sentence-check.test.js`, `tests/exercise-ui.test.js`. Modify `sw.js` (los dos archivos).

**Consumes:** `normalizeAnswer` y `foldAccents` (`answer-check.js`).

**Produces:**
- `wordDiff(typed, expected)` → `[{ word, status: 'same' | 'changed' | 'missing' | 'extra' }]`.
  - Se calcula palabra por palabra, con la subsecuencia común más larga sobre las palabras normalizadas.
  - `word` es la palabra tal como la escribió el usuario. Para `missing`, es la de la respuesta esperada.
  - Un `extra` seguido de un `missing` en la misma posición se une en un solo `changed`, que lleva la palabra del usuario y `expected`.
- `checkExercise(exercise, typed, { requireAccents })` → `{ correct, accentOnly, explanation, expected, diff }`.
  - `typed` es texto, también en `order` (la frase que forman las fichas).
  - `expected` es la respuesta aceptada más parecida: la de menos palabras distintas en `wordDiff`.
  - `explanation`:
    - si es correcta, `null`;
    - si es solo de acento, `'Ojo con el acento: <expected>'`;
    - si coincide con `mistakes[].answer`, su `explanation`;
    - si no, `rule`.
  - En `gap`, `typed` es solo el hueco, y `expected` y `diff` se calculan sobre la frase completa `before + hueco + after`, unida tal cual: el autor incluye los espacios en `before` y `after`. Por eso un hueco de elisión abarca la palabra entera (`J'habite`), no solo `J'`.
- `checkFree(situation, typed, { requireAccents })` → `{ correct, accentOnly, needsAi }`. `needsAi` es `true` si no coincide con ningún modelo y el texto no está vacío.
- `createTileBoard(tiles)` → `{ available(): [{ index, text }], placed(): [{ index, text }], place(index), remove(index), clear(), sentence(): string }`.
  - `index` es la posición en `tiles`.
  - `place` añade al final de lo colocado.
  - `remove` devuelve la ficha a su lugar original entre las disponibles.
  - `sentence()` une con espacios.
- `insertAt(value, start, end, text)` → `{ value, caret }`.

- [ ] **Paso 1: pruebas que fallan.**
  - **Correcta:** `"J'habite à Lyon."` frente a `"j’habite a lyon"`:
    - con `requireAccents: false` → correcta, con `accentOnly`;
    - con `true` → incorrecta, `accentOnly` y `'Ojo con el acento: …'`.
  - **Espacio fino:** `"Tu viens ?"` frente a `"Tu viens ?"` → correcta.
  - **Error previsto:** `gap` con `before: ''`, `after: ' à Lyon.'`, `answers: ["J'habite"]` y `mistakes: [{ answer: 'Je habite', explanation: 'Falta la elisión…' }]`. Escribir `'je habite'` → esa explicación, con `expected` igual a `"J'habite à Lyon."`.
  - **Error no previsto** → `rule`, y `diff` marca la palabra que cambia.
  - **Varias respuestas aceptadas:** se elige `expected` como la más parecida.
  - **`wordDiff`:** igual, cambia, falta, sobra, y `œ` frente a `oe` (cuenta como cambio de acento; ver `foldAccents`).
  - **Entradas límite:** respuesta vacía → incorrecta y `diff` todo `missing`; 1000 letras → no se cuelga y es incorrecta.
  - **`checkFree`:** coincide con el segundo modelo → correcta, `needsAi: false`; distinta → `needsAi: true`; vacía → `needsAi: false` e incorrecta.
  - **`createTileBoard`:** colocar 3, quitar la del medio, `sentence()`, `clear()`, `place` de un índice ya colocado no hace nada, y fichas de texto repetido (`'le'` dos veces) se distinguen por `index`.
  - **`insertAt`:** `('cafe', 3, 4, 'é')` → `{ value: 'café', caret: 4 }`; en medio, con selección y con valor vacío.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas y linter. Commit `feat: comprobación de frases, fichas y acentos`.

### Task 3: Progreso y repaso de frases (TDD)
**Files:** Create `js/lib/build-storage.js`, `js/lib/build-review.js`, `tests/build-storage.test.js`, `tests/build-review.test.js`. Modify `sw.js` (los dos archivos).

**Consumes:** `toStorageError` (`storage.js`), `review`, `NEW_SM2`, `NEW_LEITNER` y `dueOf` (`scheduler.js`), `addDays` (`dates.js`), y `findExercise` (Tarea 1).

**Produces:**
- `BUILD_KEY = 'app-frances-build'`;
- `validateBuildDoc(doc): boolean`, también usada por la copia de seguridad.
  - `progress` y `cards` son objetos;
  - cada tarjeta tiene su `id` como clave, `kind` ∈ `exercise` o `own`, y `sm2` y `leitner` válidos con las mismas reglas que `validCard` de `backup.js`;
  - `own` tiene `original`, `corrected` y `situation` de texto, y `errors` como lista.
- `createBuildStore(backend, { now, makeId })` →
  - `load()` → `{ corruptBackupKey }`;
  - `getState()` → `{ progress, cards }` (copia);
  - `recordAttempt({ lessonId, exerciseId, correct, today })` → `{ cardCreated }`:
    - fija `startedAt` la primera vez;
    - si acierta, fija `lastCorrectAt`;
    - si falla, suma a `fails` y, con `fails ≥ 2` y sin tarjeta `ex:…`, la crea;
  - `completeLesson(lessonId)` → fija `completedAt` si era `null`;
  - `addOwnCard({ situation, original, corrected, errors, today })` → el `id`;
  - `reviewCard(cardId, correct, today, nowIso)`: usa `review()`; no toca `fails`;
  - `removeCard(cardId)`: solo tarjetas `own`;
  - `watchExternalChanges(target, onChange)`.
  - Cada escritura sigue el patrón de `study-storage.js`: si `setItem` falla, lanza `StorageError` y la memoria no cambia. Si los datos están dañados, se copian a `app-frances-build-corrupt-<ISO>` y se empieza vacío.
- **Tarjeta nueva:** `{ id, kind, …, createdAt, introducedOn: today, lastReviewedAt: null, sm2: { ...NEW_SM2, due: mañana }, leitner: { ...NEW_LEITNER, due: mañana } }`. `ex:` guarda `lessonId` y `exerciseId`.
- `buildReviewQueue({ cards, lessons, algorithm, today })` → `cardId[]`.
  - Entran las vencidas (`due ≤ today`), ordenadas por `due` y luego por `lastReviewedAt`.
  - Las falladas hoy van al final, con el mismo criterio `failedOn` de `queue.js`.
  - Se omiten las `ex:` cuyo ejercicio no existe en `lessons` (lista de lecciones válidas).
- `countDueToday({ cards, lessons, algorithm, today })` → el largo de la cola.
- `lessonStatus(lesson, progress)` → `{ state: 'new' | 'started' | 'done', correct, total }`.
  - `total` = número de `exercises`.
  - `correct` = ejercicios con `lastCorrectAt`.
  - `done` si `correct === total`.
  - `started` si hay `startedAt`.

- [ ] **Paso 1: pruebas que fallan.**
  - **Nacimiento de tarjetas:**
    - primer fallo → sin tarjeta;
    - segundo fallo, con un acierto en medio → tarjeta `ex:fr-a1-01:x3`, que vence mañana y tiene `introducedOn` hoy;
    - tercer fallo → no hay segunda tarjeta y `cardCreated: false`.
  - **`addOwnCard`:** guarda `original`, `corrected`, `errors` y `situation`, y vence mañana.
  - **`reviewCard`:** con `sm2` y con `leitner`, acierto → estado igual a `review(card, 'good', …)` y fallo → `'again'`; `fails` no cambia.
  - **`removeCard`:** con un `ex:` no hace nada; con un `own:` lo borra.
  - **Errores de almacenamiento:** `setItem` que lanza `QuotaExceededError` → `StorageError` con `code: 'quota'` y la memoria intacta. Datos dañados → copia aparte y doc vacío.
  - **500 tarjetas:** se guardan y se leen, y `buildReviewQueue` las ordena.
  - **Cola:**
    - orden por fecha;
    - falladas hoy al final;
    - `ex:` de un ejercicio borrado → fuera de la cola y del contador;
    - `own` siempre entra si vence.
  - **`lessonStatus`:** `new`, `started` y `done`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas y linter. Commit `feat: progreso y repaso de frases`.

### Task 4: Copia de seguridad v4 con frases (TDD)
**Files:** Modify `js/lib/backup.js`, `js/screens/home.js` (pasa `build` a `buildBackup`) y `tests/backup.test.js`.

**Consumes:** `BUILD_KEY` y `validateBuildDoc` (Tarea 3).

**Produces:**
- `buildBackup({ words, study, texts, build, now })` → `version: 4` con `build: { progress, cards }`;
- `readBackup` → `backup.build` (en v1 a v3 es `null`);
- `restoreBackup` escribe `BUILD_KEY` solo si `build` no es `null`;
- `restoreWarning({ texts, build })`:
  - v4: «Se reemplazarán tus palabras, tu progreso, tus historias y tus frases.»;
  - v3: «Se reemplazarán tus palabras, tu progreso y tus historias (esta copia no trae tus frases: las tuyas se mantienen).»;
  - v1 y v2: «Se reemplazarán tus palabras y tu progreso (esta copia no trae historias ni frases: las tuyas se mantienen).»;
  - todas siguen con « No se puede deshacer. Si quieres conservarlos, guarda antes una copia.»

- [ ] **Paso 1: pruebas que fallan.**
  - Ida y vuelta v4 idéntica.
  - Una v3 se lee con `build: null`, y restaurarla deja intacto `app-frances-build`.
  - Una v4 con una tarjeta `kind: 'x'` → `damaged`.
  - Una v5 → aviso «más nueva».
  - Si falla la escritura de `BUILD_KEY`, se deshacen las cuatro claves.
  - Los tres textos exactos de `restoreWarning`.
  - Ajustar las pruebas existentes que fijan `version: 3` para que sigan comprobando lo mismo con la v4; no se debilitan.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar (Inicio carga el almacén de frases y lo pasa al guardar). **Paso 4:** pruebas y linter. Commit `feat: copia de seguridad v4 con frases`.

### Task 5: Servidor — ruta `/sentence`, validación, contador y normalización (TDD)
**Files:**
- Create: `server/src/sentence-validate.js`, `server/src/sentence-normalize.js` y sus pruebas en `server/tests/`.
- Modify: `server/src/handler.js`, `server/src/config.js` (`sentenceLimit`), `server/wrangler.jsonc` (`SENTENCE_LIMIT: "50"`), y `server/tests/handler.test.js` y `config.test.js`.

**Consumes:** `straighten` (`lookup-validate.js`), `HAS_MARKUP` (`story-normalize.js`), `reserveMessage` y `ProviderError`.

**Produces:**
- `validateSentenceInput(body)` → `{ ok, value: { lang, explainLang, level, situation, focus, sentence } }`;
- `normalizeSentence(raw, sentence)` → `{ correct, corrected, errors, suggestion }`, o lanza `ProviderError('bad_output')`:
  - descarta los errores en que `original` y `corrected` son iguales (mismo `comparable` que `normalize.js`);
  - `correct = errors.length === 0`; si es correcta, `corrected = sentence`;
  - `original` que no está en `straighten(sentence).toLowerCase()` → `bad_output`;
  - `explanation` o `suggestion` de más de 300 letras, o con `HAS_MARKUP` → `bad_output`;
  - `kind` fuera de la lista, campos que faltan o de más → `bad_output`;
- el handler acepta `/sentence` (`POST` y `OPTIONS`), reserva con el prefijo `'sentence'` y llama a `provider.sentence(value)`. Responde 200 con `{ ...result, remainingSentences }` o 429 `{ error: 'sentence_limit' }`;
- `readConfig` exige `SENTENCE_LIMIT` (entero ≥ 1).

- [ ] **Paso 1: pruebas que fallan.**
  - **Entrada:**
    - `sentence` vacía, de 301 letras o con `\n` → inválida;
    - de 300 letras, o con acentos y `’` → válida;
    - `level: 'A1.2'`, `lang: 'en'` o `explainLang: 'fr'` → inválida;
    - `situation` o `focus` vacíos o de 301 letras → inválida.
  - **Salida:**
    - un error sin cambio se descarta, y si era el único → `correct: true` y `corrected` igual a la frase;
    - `original` ausente de la frase → `bad_output`;
    - `<b>` en `explanation` → `bad_output`;
    - `kind: 'style'` → `bad_output`;
    - `suggestion: ''` es válida.
  - **Handler:**
    - la llamada 51 del día → 429 `sentence_limit`, sin llamar al proveedor;
    - `count:`, `lookup:` y `story:` no cambian;
    - sin código → 401;
    - falta `SENTENCE_LIMIT` → 500 `config`;
    - `/chat`, `/lookup` y `/story` siguen igual.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas, linter y `cd server && WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run --outdir "$(mktemp -d)"`. Commit `feat: ruta /sentence con contador aparte y salida validada`.

### Task 6: Adaptador `sentence()`, instrucciones y prueba de 12 frases (TDD, sin red)
**Files:**
- Modify: `server/src/providers/claude.js`, `server/src/prompt.js`, `server/tests/claude.test.js`, `server/tests/prompt.test.js`.
- Create: `server/eval/sentence-cases.json`, `server/eval/compare-sentence.mjs`, `server/eval/score-sentence.js`, `server/tests/score-sentence.test.js`.

**Produces:**
- `createClaudeAdapter(...).sentence({ level, situation, focus, sentence })` → `normalizeSentence(raw, sentence)`;
- `buildSentencePrompt(level)` y `SENTENCE_SCHEMA` (`corrected`, `errors[{ original, corrected, kind (enum), explanation }]` y `suggestion`, todos obligatorios y con `additionalProperties: false`);
- mensaje del usuario: `Situación: <situation>\nPatrón de la lección: <focus>\nFrase del alumno: <sentence>`.

**Instrucciones** (en español; contenido fijado por el diseño):
- revisar solo la frase del alumno, de nivel `{level}`, buscando errores reales de gramática, sintaxis y ortografía: elisión, contracción, género, concordancia, acentos, conjugación y orden;
- no corregir el estilo;
- `original`, copiado tal cual de la frase;
- cada explicación, en 1 o 2 frases en español, tuteando;
- **aparte**, en `suggestion`: si la frase no responde a la situación o no usa el patrón, decirlo en una frase con un ejemplo; si no, `''`;
- **nunca poner en `errors` algo que solo es «no usaste el patrón»**;
- texto plano, sin HTML ni Markdown.

- [ ] **Paso 1: pruebas que fallan.**
  - **Petición:** lleva `SENTENCE_SCHEMA`, `effort: 'low'`, las instrucciones con el nivel y el mensaje del usuario con sus tres líneas.
  - **Salida:** válida → se normaliza; los errores del SDK se convierten igual que en `chat`.
  - **`buildSentencePrompt('A2')`** contiene «A2» y la regla de `suggestion`.
  - **`scoreSentence(item, output)`** → `{ errorFound, correctedOk, noInvented, suggestionOk }`, según `item.expect`:
    - `'error'`: `errorFound` si hay errores, y `correctedOk` si `corrected` normaliza igual que alguna de `item.accepted`;
    - `'correct'`: `noInvented` si no hay errores;
    - `'correct-suggest'`: `noInvented`, y `suggestionOk` si `suggestion` no está vacía.
  - **`meetsCriterion(scores, rejected)`:**
    - las 6 de error, encontradas y bien corregidas;
    - las 6 correctas, sin errores inventados;
    - al menos 2 de 3 sugerencias;
    - `rejected === 0`.
- [ ] **Paso 2:** ver que fallan.
- [ ] **Paso 3:** implementar. `sentence-cases.json` tiene 12 casos `{ situation, focus, sentence, expect, accepted? }`:
  - 6 con errores, uno por lección (`accepted` entre paréntesis):
    - `Je aime le café.` (`J'aime le café.`);
    - `Je suis 20 ans.` (`J'ai 20 ans.`);
    - `Je vais à le marché.` (`Je vais au marché.`);
    - `Nous mangez une pomme.` (`Nous mangeons une pomme.`);
    - `Je ne aime pas le thé.` (`Je n'aime pas le thé.`);
    - `Est-ce que il parle français ?` (`Est-ce qu'il parle français ?`);
  - 3 correctas con el patrón;
  - 3 correctas sin el patrón (`correct-suggest`).

  Cada caso lleva la `situation` y el `focus` de su lección. Las correctas las escribe el implementador; las dudas van con REVISAR en un campo `note`. `compare-sentence.mjs` imprime la tabla y el veredicto, y lee la clave como `compare-story.mjs`. **No se ejecuta contra la API.**
- [ ] **Paso 4:** pruebas y linter. Commit `feat: corrección de frases en el adaptador de Claude y prueba de 12 casos`.

### Task 7: Cliente de `/sentence`, rutas y mensajes (TDD)
**Files:**
- Create: `js/lib/sentence.js`, `tests/sentence.test.js`.
- Modify: `js/lib/router.js`, `js/lib/messages.js`, `tests/router.test.js`, `tests/messages.test.js` y `sw.js` (`js/lib/sentence.js`).

**Consumes:** `postJson` y `chatUrl` (`chat.js`).

**Produces:**
- `sentenceUrl(hostname)` → la misma base que `chatUrl`, con `/sentence`;
- `sendSentence({ url, code, body, fetch, isOnline, timeoutMs })` → `{ ok: true, result: { correct, corrected, errors, suggestion, remaining } }` o `{ ok: false, error }`. Si falta un campo o tiene otro tipo → `bad_output`;
- router: `SCREENS` suma `{ id: 'build', path: 'construir', title: 'Construir frases' }`, y `PARAM_PATHS` suma `'construir'`. `routeParam('#/construir/repaso')` → `'repaso'`;
- `MESSAGES.sentenceLimit`: «Llegaste al límite de correcciones de hoy.» / «El límite se reinicia a medianoche, hora de Chile.», y `chatMessage('sentence_limit')`;
- `MESSAGES.sentenceOffline`: «Necesitas conexión para que Claude revise tu frase.» / «Compara tu frase con las respuestas modelo.».

- [ ] **Paso 1: pruebas que fallan.**
  - **Router:** `#/construir` → `'build'` sin parámetro; `#/construir/fr-a1-01` → `'build'` con `'fr-a1-01'`; `#/construir/repaso` → `'repaso'`; `#/leer/<id>` sigue igual.
  - **`sendSentence`:** sin conexión → `offline` sin llamar a `fetch`; 429 `sentence_limit`; JSON roto; `errors` que no es lista → `bad_output`.
  - **Mensajes:** los textos exactos de `sentenceLimit` y `sentenceOffline`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas y linter. Commit `feat: cliente de /sentence, rutas de Construir y mensajes`.

### Task 8: Contenido — índice y lecciones 1 a 3, con verificación
**Files:**
- Create: `data/lessons/fr/index.json`, `data/lessons/fr/fr-a1-01.json`, `fr-a1-02.json`, `fr-a1-03.json`, `docs/contenido/construir-frases.md`, `tests/lessons-content.test.js`.
- Modify: `sw.js` (los cuatro JSON).

**Consumes:** `validateLesson` (Tarea 1) y `textProblems` (`tests/helpers/content-checks.js`).

**Contenido** (tabla «Contenido de las lecciones 1 a 6» del diseño):
- 1 · La frase básica;
- 2 · *Être*, *avoir*, *c'est*, *il y a*;
- 3 · Los artículos, con los partitivos marcados `review: true` y la nota «Límite A1-A2: el Inventaire los pone en A1 como expresión de cantidad; el referencial A2, en A2».

En cada lección:
- 4 a 6 ejemplos;
- 8 a 10 ejercicios, con al menos 2 de cada tipo;
- 1 o 2 situaciones con 2 a 4 modelos;
- al menos una trampa;
- `think` con contraste español-francés.

**Fuentes y verificación (obligatorio, regla por regla):**
1. **Inventaire:** https://www.eaquals.org/wp-content/uploads/Inventaire_ONLINE_full.pdf. Anexo D, págs. 49–52 del documento: el nivel se marca con color, así que hay que mirar la página. Anexo E, págs. 56–58. Anexo F, págs. 62–67.
2. **Niveau A2 pour le français**, capítulo 5: https://bop.fipf.org/wp-content/uploads/2017/03/refa343342.pdf (págs. 101–112).
3. **Banque de dépannage linguistique (OQLF):** https://vitrinelinguistique.oqlf.gouv.qc.ca/ (artículo concreto de cada regla de ortografía, elisión o contracción).

Cada `sourceIds` apunta a una de estas tres fuentes, con su página o URL de artículo en `sources[].pages` o `sources[].url`. **Si una regla no se confirma en ninguna, `review: true`** con la nota de qué faltó. **Nunca se adivina:** una palabra o traducción dudosa → `review: true`. El francés usa apóstrofo recto (`'`), espacio normal antes de `? ! :` y artículos en todos los sustantivos.

**Documento** `docs/contenido/construir-frases.md`:
- encabezado «Estado: Pendiente de revisión del usuario.»;
- la lista de fuentes;
- por lección, una tabla `| id | Tipo | Francés | Español o explicación | Fuente | REVISAR |`, con una fila por elemento;
  - «Francés» contiene el texto francés principal: `text`, `target`, `right`, la primera de `answers` o `models[0]`;
  - REVISAR vale `sí` o queda vacío.

- [ ] **Paso 1: pruebas que fallan** (`tests/lessons-content.test.js`, que recorre las lecciones que lista el índice):
  - cada lección pasa `validateLesson`;
  - el índice lista solo archivos que existen, y su `id` coincide con el nombre del archivo;
  - cuentas: 4 a 6 ejemplos; 8 a 10 ejercicios con al menos 2 de cada tipo; 1 o 2 situaciones con 2 a 4 modelos;
  - `textProblems` vacío en todo texto;
  - **elisión:** ninguna respuesta, ejemplo, modelo ni `right` contiene `\b(je|me|te|se|le|la|de|ne|que) [aeiouéèêàâîôûœh]` (sin distinguir mayúsculas). La lista de excepciones de *h aspirada* debe ir vacía o justificada palabra por palabra (por ejemplo, `le haricot`);
  - **el documento coincide con los JSON:** para cada elemento hay una fila con su `id`, su texto francés y REVISAR igual a `review`; no sobran filas.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** escribir el contenido verificando cada regla. **Paso 4:** pruebas y linter. Commit `feat: lecciones 1 a 3 de Construir frases`.

### Task 9: Contenido — lecciones 4 a 6, con verificación
**Files:** Create `data/lessons/fr/fr-a1-04.json`, `fr-a1-05.json`, `fr-a1-06.json`. Modify `data/lessons/fr/index.json`, `docs/contenido/construir-frases.md` y `sw.js`.

**Contenido:**
- 4 · Verbos en -er en presente, con las terminaciones que se escriben y no suenan;
- 5 · La negación (solo *ne… pas* y *ne… jamais*, *n'* y *pas de*);
- 6 · Preguntas simples (entonación, *est-ce que* y palabras interrogativas; inversión solo en fórmulas fijas).

Mismas reglas de cuentas, fuentes, verificación y documento que la Tarea 8.

- [ ] **Paso 1:** ampliar la cuenta de `lessons-content.test.js`: el índice tiene exactamente 6 lecciones en orden `fr-a1-01` … `fr-a1-06`. Ver que falla.
- [ ] **Paso 2:** escribir el contenido y su parte del documento. **Paso 3:** pruebas y linter. Commit `feat: lecciones 4 a 6 de Construir frases`.

### Task 10: Pantalla «Construir» — lista, lección y práctica (frontend-design + DESIGN.md)
**Files:**
- Create: `js/screens/build.js`.
- Modify: `js/app.js`, `index.html`, `css/styles.css`, `sw.js` (`js/screens/build.js`), `DESIGN.md`, `README.md`, `tests/index-html.test.js` y `tests/styles.test.js`.

**Consumes:** las Tareas 1 a 3 y 7; `speak`, `loadVoices` y `pickFrenchVoice` (`speech.js`); y el ajuste `requireAccents` de `studyStore.getState().settings`.

**Produces:** `initBuild({ buildStore, studyStore, lessons, synth, fetch, isOnline, hostname, getCode })` → `{ onShow(param, moveFocus), onHide() }`. Tarea 11 completa el repaso y las situaciones dentro del mismo archivo.

**Textos exactos:**
- Lista: «Lección N», «Nueva», «En curso: X/Y», «Terminada», «Tiene partes REVISAR» y «Esta lección no se pudo cargar».
- Secciones: «La idea», «El bloque», «Cómo pensarlo», «Ejemplos», «Trampa común», «Practicar» y «Fuentes».
- Botones: «Practicar», «Comprobar», «Siguiente», «Borrar todo» y «Escuchar». Cada letra de la fila de acentos tiene `aria-label` «Insertar <letra>».
- Resultado: «Correcto.», «No es correcta.», «La respuesta es: …», «Tu respuesta:», y «cambia», «falta» y «sobra» (texto solo para el lector de pantalla).
- Contador: «Ejercicio X/Y».
- Zonas del ejercicio `order`: «Tu frase» y «Fichas». Anuncio: «Agregaste: <ficha>. Tu frase: <frase>» y «Quitaste: <ficha>».
- Al terminar: «Terminaste la práctica de esta lección.»
- Aviso al nacer una tarjeta: «Este ejercicio irá a tu repaso.»

- [ ] **Paso 1: diseño.** Usar la skill **frontend-design** con DESIGN.md:
  - el color de línea de «Construir» (contraste ≥ 3:1 como elemento gráfico en claro y oscuro, y su prueba en `styles.test.js`);
  - las fichas del bloque y del ejercicio `order`;
  - la fila de acentos;
  - la diferencia por palabras (`<mark>` más negrita, nunca solo color);
  - la etiqueta REVISAR como en Leer.

  Agregar la sección «Construir frases (Etapa 12)» a DESIGN.md. El enlace «Construir» va en la barra **solo a partir de 900 px**; por debajo se oculta con `display: none`. Medir a 360 px que la barra sigue con 7 botones visibles y sin cortes.
- [ ] **Paso 2: pruebas que fallan** (`index-html.test.js`):
  - la sección `screen-build` con su título enfocable;
  - el enlace `#/construir` en la navegación con la clase que lo oculta en el móvil;
  - la zona de estado con `role="status"` y la región `aria-live` del ejercicio `order`;
  - los campos de `gap` y `fix` con `lang="fr"`, `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"` y `spellcheck="false"`, y su etiqueta.
- [ ] **Paso 3: implementar.**
  - `app.js` carga `loadLessons({ fetch, lang: 'fr' })` y el almacén de frases, y crea la pantalla. Si el índice no carga, la pantalla avisa con `MESSAGES.storageUnavailable` y Inicio sigue funcionando.
  - **Lista:** las filas son enlaces a `#/construir/<id>`, con estado según `lessonStatus`.
  - **Lección:** las secciones en orden; REVISAR escrito con su `reviewNote`; ejemplos con «Escuchar» (`speak`), y `lang="fr"` en todo texto francés.
  - **Práctica:**
    - ejercicios en el orden del archivo;
    - un fallo vuelve **una vez** al final de esa práctica;
    - cada intento llama a `recordAttempt`; si `cardCreated`, muestra el aviso;
    - al acertar todos llama a `completeLesson`;
    - foco: al empezar, en el enunciado; al comprobar, en el resultado.
  - **`order`:** con `createTileBoard`; solo botones, sin arrastrar.
  - **`gap` y `fix`:** campo de texto más fila de acentos (`insertAt`, devolviendo el foco y el cursor al campo).
  - **Errores de almacenamiento:** `storageMessage(error)`; la práctica sigue sin guardar.
  - **README:** sección «Construir frases».
- [ ] **Paso 4:** `npm test` y `npm run lint` pasan. Recorrido con `npm start` a 360 y 1280 px, en modo claro y oscuro, y **solo con teclado**:
  - abrir una lección y escuchar un ejemplo;
  - resolver un `order` con teclado;
  - fallar dos veces un ejercicio y ver el aviso de repaso;
  - insertar una `è` con la fila de acentos;
  - recargar en `#/construir/fr-a1-02`;
  - modo avión después de la primera carga.

  Commit `feat: pantalla Construir con lecciones y práctica`.

### Task 11: Situación libre, repaso e Inicio
**Files:** Modify `js/screens/build.js`, `js/screens/home.js`, `js/app.js`, `index.html`, `css/styles.css`, `DESIGN.md`, `README.md` y `tests/index-html.test.js`.

**Consumes:** `checkFree` (Tarea 2); `addOwnCard`, `reviewCard`, `removeCard`, `buildReviewQueue` y `countDueToday` (Tarea 3); y `sendSentence`, `sentenceUrl`, `chatMessage` y `MESSAGES.sentenceOffline` (Tarea 7).

**Textos exactos:**
- Aviso de envío: «Si tu frase no coincide con un modelo, se envía a Claude (Anthropic) para corregirla.»
- Mientras se revisa: «Revisando…».
- Resultado:
  - «Correcta.»;
  - «Corregida: …»;
  - los tipos, «Gramática», «Sintaxis» y «Ortografía»;
  - «Sugerencia», como título del recuadro aparte;
  - «Respuestas modelo»;
  - «Agregamos esta frase a tu repaso.».
- Repaso:
  - «Repaso: X/Y»;
  - «Corrige tu frase»;
  - «Quitar del repaso», con la confirmación «¿Quitar esta frase de tu repaso?» / «No se puede deshacer.» y los botones «Cancelar» · «Quitar»;
  - vacío: «No tienes nada que repasar hoy. Los ejercicios que falles 2 veces aparecerán aquí.»
- Inicio:
  - tarjeta «Construir frases»;
  - «Próxima lección: …» o «Terminaste todas las lecciones»;
  - «Repaso: N pendientes hoy»;
  - botones «Seguir lección» y «Repasar (N)». Repasar va con `aria-disabled="true"` si N = 0.

- [ ] **Paso 1: pruebas que fallan** (`index-html.test.js`):
  - el campo de varias líneas de la situación, con `lang="fr"`, etiqueta y los mismos atributos sin autocorrección;
  - la tarjeta de Inicio con sus botones;
  - la ventana de confirmar «Quitar».
- [ ] **Paso 2: implementar.**
  - **Situación:**
    1. `checkFree`;
    2. si `needsAi`: sin conexión → `sentenceOffline` y los modelos; sin código → `chatMessage('unauthorized')`, como Leer; si no, `sendSentence` con `{ lang: lesson.lang, explainLang: lesson.explainLang, level: lesson.level, situation, focus, sentence }`;
    3. con errores → `addOwnCard`;
    4. todo con `textContent`;
    5. foco en el resultado.
  - **Repaso (`#/construir/repaso`):**
    - cola de `buildReviewQueue` con las lecciones válidas y el algoritmo de los ajustes;
    - la tarjeta `ex:` muestra su ejercicio;
    - la tarjeta `own` es un `fix` con `wrong = original`, `answers = [corrected]` y la explicación de sus `errors` guardados, con la etiqueta REVISAR;
    - cada respuesta → `reviewCard`.
  - **Inicio:** la tarjeta se actualiza al mostrar Inicio y cuando otra pestaña cambia el almacén.
- [ ] **Paso 3:** `npm test` y `npm run lint` pasan. Recorrido con un servidor falso en `127.0.0.1:8787` que responde fijo a `/sentence`:
  - con error y sugerencia;
  - correcta;
  - con `<script>` en la explicación: se ve como texto;
  - 429.

  Y además:
  - sin conexión: muestra los modelos y no envía nada;
  - la tarjeta propia aparece mañana: cambiar `today` con el reloj del sistema o con un estado preparado en `localStorage`;
  - Quitar del repaso;
  - Inicio a 360 px.

  Commit `feat: frase libre con Claude, repaso de frases y tarjeta en Inicio`.

### Task 12: Prueba real, publicación y teléfono (el controlador, con el usuario)
- [ ] **Paso 1 (con permiso):** `cd server && node eval/compare-sentence.mjs`, que cuesta menos de un centavo.
  - Si no se cumple `meetsCriterion`, se ajustan las instrucciones y se repite, hasta 3 veces; después se consulta al usuario.
  - El controlador lee las explicaciones a mano.
- [ ] **Paso 2 (con confirmación):** `npm run deploy --prefix server`. Comprobar `/sentence` sin código: debe responder 401.
- [ ] **Paso 3 (con confirmación):** push de la rama y PR a `main`. Tras el merge, comprobar que Pages sirve `v22`.
- [ ] **Paso 4: el usuario revisa las lecciones** en `docs/contenido/construir-frases.md` y en la app; lo que corrija va en commits aparte.
- [ ] **Paso 5: prueba del usuario en el teléfono.**
  - Una lección completa.
  - Fallar dos veces y ver la tarjeta mañana.
  - Una frase libre con error.
  - Modo avión.
  - TalkBack en un ejercicio `order`.
- [ ] **Paso 6:** informe de cierre con los 6 puntos de CLAUDE.md y la lista de decisiones tomadas.
