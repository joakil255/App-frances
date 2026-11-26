# Etapa 15 — Traducción en Leer: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada historia trae su traducción frase por frase, oculta por defecto y revelable con un toque, guardada con la historia y disponible sin conexión; las historias viejas pueden traducirse con `/translate`.

**Architecture:** El Worker devuelve `sentences: [{ text, translation }]` y arma `body` uniéndolas (sigue enviando `body` para la app vieja). La app guarda `sentences` y `translation: { lang, status, sentences }` en cada texto, y el lector usa esa lista sin volver a partir. Una ruta nueva `/translate` (límite propio de 10 al día) traduce una lista de frases de una historia vieja.

**Tech Stack:** JavaScript sin dependencias nuevas (módulos ES), `node --test`, ESLint, Cloudflare Worker con `@anthropic-ai/sdk` (ya instalado), `claude-haiku-5-5` con esfuerzo `low`.

**Spec:** `docs/superpowers/specs/2026-11-25-etapa-15-traduccion-lecturas-design.md`

## Global Constraints

- Sin dependencias nuevas.
- Todo texto de Claude o del usuario se pinta con `textContent`, nunca `innerHTML`.
- Nombres de código en inglés; comentarios breves en español; interfaz en español.
- `SUPPORT_LANGS = ['es']` en el servidor y en la app; nada fuera de esa lista supone español.
- Límites: de 4 a 60 frases por historia generada; de 1 a 60 frases por `/translate`; cada frase y cada traducción de hasta 600 letras; `body` de 80 a 300 palabras y hasta 3000 letras (como hoy).
- `TRANSLATE_LIMIT = "10"` en `server/wrangler.jsonc`; contador `translate:`; error 429 `translate_limit`.
- Copia de seguridad `BACKUP_VERSION = 6`; `CACHE_VERSION = 'v26'`.
- Ajuste en `app-frances-reader`: `{ quizLang, showTranslation }`, por defecto `showTranslation: false`; fuera de la copia de seguridad.
- Botones táctiles grandes, foco visible, contraste (DESIGN.md + skill frontend-design para la Tarea 6).
- TDD: primero la prueba, verla fallar, luego el código mínimo. Nunca debilitar una prueba.
- Commits pequeños en español, en la rama `etapa-15-traduccion-lecturas`. Nada de push sin confirmación.
- Pruebas: `npm test` y `npm run lint` desde la raíz (incluyen `server/tests`).

## Review Focus

1. **Historia vieja con saltos de línea o espacios dobles en `body`** → la reconstrucción sin espacios la acepta (prueba en Tarea 3).
2. **Frases pegadas sin espacio («fin.Début»)** → se valida y se traduce (pruebas en Tareas 3 y 5).
3. **Navegador sin `Intl.Segmenter` con historia de más de 600 letras** → «no se puede traducir» sin llamar a `fetch` (prueba en Tarea 5).
4. **Guardar `showTranslation` cuando `localStorage` lanza o tiene JSON dañado** → no rompe, queda `false`, no borra `quizLang` (prueba en Tarea 5).
5. **App vieja contra servidor nuevo** (sin `supportLang`, espera `body`) → `/story` responde con `body` (prueba en Tarea 1).

---

### Task 1: `/story` devuelve frases emparejadas

**Files:**
- Modify: `server/src/story-validate.js`, `server/src/story-normalize.js`, `server/src/prompt.js` (`STORY_INSTRUCTIONS`, `buildStoryPrompt`, `STORY_SCHEMA`), `server/src/providers/claude.js` (`story`)
- Test: `server/tests/story-validate.test.js`, `server/tests/story-normalize.test.js`, `server/tests/prompt.test.js`, `server/tests/claude.test.js`, `server/tests/handler.test.js`

**Interfaces:**
- Produces:
  - `SUPPORT_LANGS = ['es']` y `SUPPORT_LANG_NAMES = { es: 'español' }` exportados desde `server/src/story-validate.js`.
  - `validateStoryInput(body)` → `{ ok: true, value: { lang, level, topic, quizLang, supportLang } }`; `supportLang` ausente = `'es'`; no permitido = `{ ok: false }`.
  - `normalizeStory(raw)` con `raw = { title, sentences: [{ text, translation }], questions }` → `{ title, body, sentences, questions }`, donde `body = sentences.map(s => s.text).join(' ')`.
  - `buildStoryPrompt(level, quizLang, supportLang)`.
  - Respuesta de `/story`: `{ title, body, sentences, questions, remainingStories }`.

- [ ] **Step 1: Escribir las pruebas que fallan**
  - `story-validate`: `supportLang` ausente da `value.supportLang === 'es'`; `'en'` y `5` dan `{ ok: false }`.
  - `story-normalize` (reescribir `makeStory` con `sentences`: 5 pares de la frase de 20 palabras de hoy y `translation: 'Marie vive en París con su gato negro y le gusta mucho el café de la mañana.'`):
    - `Object.keys(normalizeStory(makeStory()))` es `['title', 'body', 'sentences', 'questions']` y `body` es las 5 frases unidas por un espacio;
    - rechazos (`bad_output`): `sentences` que no es arreglo, 3 pares, 61 pares, `text` vacío, `translation` vacía o de 601 letras, `translation` con `<b>` o `**`, `body` unido de menos de 80 palabras, evidencia que no está en el `body` unido;
    - acepta 60 pares si el `body` cabe (usa frases cortas de 5 palabras: 60 × 5 = 300 palabras).
  - `prompt`: `buildStoryPrompt('A1.2', 'es', 'es')` contiene `español` en la regla de `translation` y `STORY_SCHEMA.properties.sentences.items.required` es `['text', 'translation']`; ya no hay `body` en `STORY_SCHEMA.required`.
  - `claude` (con el `fetch` falso de hoy): `adapter.story({ level, topic, quizLang, supportLang })` devuelve `sentences` y `body`.
  - `handler`: con un proveedor falso, la respuesta de `/story` tiene `body`, `sentences` y `remainingStories`; una petición sin `supportLang` responde 200 (app vieja).

- [ ] **Step 2: Ejecutarlas y ver que fallan**
  Run: `npm test -- server/tests/story-validate.test.js server/tests/story-normalize.test.js server/tests/prompt.test.js server/tests/claude.test.js server/tests/handler.test.js`
  Expected: FAIL en las pruebas nuevas.

- [ ] **Step 3: Implementar**
  - `normalizeStory`: valida cada par con `isText` y `HAS_MARKUP`, largo de `translation` ≤ 600 letras (`[...s].length`), y de 4 a 60 pares (reemplaza `countSentences(body) < MIN_SENTENCES` por el largo del arreglo); luego arma `body` y aplica las reglas de hoy (palabras, letras, `HAS_MARKUP`) y `cleanQuestions(questions, body)`.
  - `STORY_INSTRUCTIONS`: el campo `"body"` pasa a `"sentences"`: «la historia, en orden, una sola frase por elemento; `"text"` es la frase en francés y `"translation"` su traducción natural y fiel al {supportLangName}, sin notas ni explicaciones». Conserva el resto de las reglas.
  - `claude.js`: `story({ level, topic, quizLang, supportLang })` pasa `supportLang` a `buildStoryPrompt`.

- [ ] **Step 4: Ejecutar todas las pruebas**
  Run: `npm test && npm run lint`
  Expected: PASS, 0 errores. Si `server/tests/score-story.test.js` o `contract.test.js` fallan, adáptalos al nuevo `raw` sin quitar comprobaciones.

- [ ] **Step 5: Commit**
  `git commit -m "feat(servidor): /story devuelve frases emparejadas con su traducción"`

---

### Task 2: Ruta `/translate`

**Files:**
- Create: `server/src/translate-validate.js`, `server/src/translate-normalize.js`
- Modify: `server/src/prompt.js` (`TRANSLATE_INSTRUCTIONS`, `buildTranslatePrompt`, `TRANSLATE_SCHEMA`), `server/src/providers/claude.js` (`translate`), `server/src/handler.js`, `server/src/config.js`, `server/wrangler.jsonc`
- Test: `server/tests/translate-validate.test.js`, `server/tests/translate-normalize.test.js`, `server/tests/config.test.js`, `server/tests/handler.test.js`, `server/tests/claude.test.js`, `server/tests/prompt.test.js`

**Interfaces:**
- Consumes: `SUPPORT_LANGS`, `SUPPORT_LANG_NAMES` (Tarea 1); `HAS_MARKUP` de `story-normalize.js`; `reserveMessage(kv, now, limit, 'translate')`.
- Produces:
  - `validateTranslateInput(body)` → `{ ok: true, value: { lang, level, supportLang, sentences } }` o `{ ok: false }`.
  - `normalizeTranslation(raw, count)` → `string[]` de largo `count`, o lanza `ProviderError('bad_output')`.
  - `adapter.translate({ level, supportLang, sentences })` → `string[]`.
  - `config.translateLimit: number`.
  - Respuesta: `{ translations, remainingTranslations }`; 429 `{ error: 'translate_limit' }`.

- [ ] **Step 1: Escribir las pruebas que fallan**
  - `translate-validate`: válido con `{ lang: 'fr', level: 'A1.2', supportLang: 'es', sentences: ['Léa habite à Lyon.'] }`; rechaza: no objeto, `lang` ≠ `'fr'`, nivel o `supportLang` no permitidos, `sentences` vacío, 61 frases, frase vacía o solo espacios, frase con `\n`, frase de 601 letras (`'é'.repeat(601)`; 600 pasa).
  - `translate-normalize`: `normalizeTranslation({ translations: ['a', 'b'] }, 2)` devuelve `['a', 'b']`; `bad_output` si el largo no coincide, si falta `translations`, si una está vacía, tiene `<i>` o `**`, o supera 600 letras.
  - `config`: sin `TRANSLATE_LIMIT` o con `'0'` → `{ ok: false }`; con `'10'` → `translateLimit === 10`.
  - `handler`: `/translate` con proveedor falso → 200 `{ translations, remainingTranslations: 9 }`; el 11.º del día → 429 `translate_limit`; tras 10 traducciones, `/story` y `/lookup` siguen respondiendo 200; entrada inválida → 400 `invalid_input`; salida del proveedor con largo distinto → 502 `bad_output`.
  - `claude`: `translate` envía las frases numeradas en el mensaje y devuelve el arreglo.

- [ ] **Step 2: Ejecutarlas y ver que fallan**
  Run: `npm test -- server/tests/translate-validate.test.js server/tests/translate-normalize.test.js server/tests/config.test.js server/tests/handler.test.js server/tests/claude.test.js`
  Expected: FAIL.

- [ ] **Step 3: Implementar**
  - `TRANSLATE_SCHEMA = { type: 'object', properties: { translations: { type: 'array', items: { type: 'string' } } }, required: ['translations'], additionalProperties: false }`.
  - `TRANSLATE_INSTRUCTIONS`: traductor de francés a {supportLangName} para un alumno de nivel {level}; recibirá frases numeradas; devuelve exactamente una traducción por frase, en el mismo orden, natural y fiel, texto plano sin notas. Mensaje del usuario: `sentences.map((s, i) => \`${i + 1}. ${s}\`).join('\n')`.
  - `handler.js`: `isTranslate = pathname === '/translate'` en la lista de rutas, validación, reserva `'translate'` con `config.translateLimit` y error `translate_limit`; la respuesta usa `normalizeTranslation(await provider.translate(input.value), input.value.sentences.length)`.
  - `wrangler.jsonc`: `"TRANSLATE_LIMIT": "10"`.

- [ ] **Step 4: Ejecutar todas las pruebas**
  Run: `npm test && npm run lint`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git commit -m "feat(servidor): ruta /translate con límite propio de 10 al día"`

---

### Task 3: Textos con frases y traducción

**Files:**
- Modify: `js/lib/texts.js`
- Test: `tests/texts.test.js`

**Interfaces:**
- Produces (desde `js/lib/texts.js`):
  - `SUPPORT_LANGS = ['es']`, `MAX_SENTENCES = 60`, `MAX_SENTENCE_LETTERS = 600`.
  - `sentencesMatchBody(sentences, body) → boolean`: une y compara sin ningún espacio, tras `normalize('NFC')`.
  - `validateText(text)` acepta `sentences` y `translation` opcionales (errores en `errors.sentences` y `errors.translation`).
  - `addText(input)` copia `input.sentences` e `input.translation` si vienen (recortando bordes de cada frase).
  - `approve(id)` también pone `translation.status = 'approved'` si hay traducción.
  - `addTranslation(id, { sentences, translation }) → text | null` (devuelve `null` sin guardar si el id no existe o el resultado no valida).
  - `approveTranslation(id) → text | null`; `discardTranslation(id) → text | null` (quita `sentences` y `translation`).
  - `needsReview(text) → boolean`: `text.status === 'review' || text.translation?.status === 'review'`.

- [ ] **Step 1: Escribir las pruebas que fallan**
  - `validateText` acepta el texto de hoy sin los campos nuevos.
  - Acepta `sentences` + `translation` válidos; rechaza `translation` sin `sentences`, largos distintos, frase vacía, `lang: 'en'`, `status: 'x'`, traducción de 601 letras, `sentences` que no reconstruyen el `body` (falta una frase).
  - `sentencesMatchBody(['Fin.', 'Début.'], 'Fin.Début.')`, con `body` de saltos de línea y espacios dobles, y con «l’école», «ç», «é» → `true`.
  - 60 frases pasan, 61 no.
  - `approve` aprueba la traducción; `addTranslation` en historia aprobada deja `translation.status === 'review'` y `needsReview` en `true`; `approveTranslation` y `discardTranslation` cambian y guardan; con un `backend.setItem` que lanza, la memoria no cambia (`getText` igual que antes).

- [ ] **Step 2: Ejecutarlas y ver que fallan**
  Run: `npm test -- tests/texts.test.js`
  Expected: FAIL.

- [ ] **Step 3: Implementar** en `js/lib/texts.js`, siguiendo el patrón de `update` y `persist` de hoy. `addTranslation` valida el texto resultante con `validateText` antes de guardar.

- [ ] **Step 4: Ejecutar**
  Run: `npm test && npm run lint`
  Expected: PASS.

- [ ] **Step 5: Commit**
  `git commit -m "feat: textos con frases y traducción, y su propia marca REVISAR"`

---

### Task 4: Copia de seguridad v6

**Files:**
- Modify: `js/lib/backup.js`
- Test: `tests/backup.test.js`

**Interfaces:**
- Consumes: `validateText` (Tarea 3).
- Produces: `BACKUP_VERSION = 6`; `readBackup` acepta versiones 1 a 6.

- [ ] **Step 1: Escribir las pruebas que fallan**: ida y vuelta v6 con un texto con `sentences` y `translation`; una v5 sin ellos se restaura; un texto con `translation` de largo distinto marca la copia como dañada; una v7 da el error «más nueva».
- [ ] **Step 2: Ver que fallan** — Run: `npm test -- tests/backup.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementar**: subir la constante y agregar `6` a la lista de versiones aceptadas; las condiciones `>= 3` y `>= 4` siguen valiendo (la de `version === 4` para `migrateBuildDoc` no cambia).
- [ ] **Step 4: Ejecutar** — Run: `npm test && npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: copia de seguridad v6 con traducciones"`

---

### Task 5: Lógica del lector: pedir, convertir y recordar

**Files:**
- Create: `js/lib/reader-prefs.js`
- Modify: `js/lib/story.js`, `js/lib/messages.js`
- Test: `tests/story.test.js`, `tests/reader-prefs.test.js`, `tests/messages.test.js`

**Interfaces:**
- Consumes: `postJson`, `chatUrl` (`chat.js`); `SUPPORT_LANGS`, `MAX_SENTENCES`, `MAX_SENTENCE_LETTERS`, `sentencesMatchBody` (Tarea 3).
- Produces:
  - `translateUrl(hostname)` (como `storyUrl`, con `/translate`).
  - `sendStory` valida también `sentences` (arreglo de `{ text, translation }` de cadenas).
  - `textFromStory(result, { level, topic, quizLang, supportLang })` agrega `sentences` y `translation: { lang: supportLang, status: 'review', sentences }`.
  - `readerSentences(text, Segmenter?) → string[]`: `text.sentences` si existe; si no, `splitSentences(text.body, Segmenter)`.
  - `translatableSentences(body, Segmenter?) → string[] | null`: `null` si hay 0 o más de 60 frases, una de más de 600 letras, o no cumplen `sentencesMatchBody`.
  - `sendTranslation({ url, code, body, fetch, isOnline }) → { ok: true, translations, remainingTranslations } | { ok: false, error }`; nunca lanza; `error: 'bad_output'` si el largo no coincide con `body.sentences.length`.
  - `createReaderPrefs(backend) → { load(): { quizLang, showTranslation }, save(change) }`; `save` mezcla con lo guardado; nunca lanza.
  - Mensajes: `translateLimit` («Llegaste al límite de traducciones de hoy.» / «Puedes leer tus historias; el límite se reinicia a medianoche, hora de Chile.»), código `translate_limit` → `translateLimit`; `translateNotPossible` («Esta historia no se puede traducir frase por frase.»); `translateOffline` («Necesitas conexión para generar la traducción.» / «Puedes leer la historia sin ella.»).

- [ ] **Step 1: Escribir las pruebas que fallan**
  - `textFromStory` arma `sentences` y `translation` con bordes recortados.
  - `readerSentences` con y sin `sentences`; texto de una frase.
  - `translatableSentences('Fin.Début.')` con el `Intl.Segmenter` real da 2 frases; con `Segmenter` `undefined` y un `body` de 601 letras da `null`; 61 frases dan `null`.
  - `sendTranslation` con `fetch` falso: largo correcto → `ok`; largo distinto → `bad_output`; `isOnline: false` → no llama a `fetch` (usa el comportamiento de `postJson`).
  - `createReaderPrefs`: por defecto `{ quizLang: 'es', showTranslation: false }`; `save({ showTranslation: true })` conserva `quizLang: 'fr'`; JSON dañado y `getItem`/`setItem` que lanzan no rompen.
  - `chatMessage('translate_limit')` devuelve el mensaje nuevo.

- [ ] **Step 2: Ver que fallan** — Run: `npm test -- tests/story.test.js tests/reader-prefs.test.js tests/messages.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementar.** `reader.js` deja de usar `loadQuizLang`/`saveQuizLang` en la Tarea 6.
- [ ] **Step 4: Ejecutar** — Run: `npm test && npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: pedir y guardar traducciones, y recordar el ajuste del lector"`

---

### Task 6: Pantalla del lector

**Files:**
- Modify: `js/screens/reader.js`, `index.html` (sección `#screen-reader`), `css/styles.css` (bloque `.reader-*`), `DESIGN.md` si agrega un patrón, `sw.js` (`CACHE_VERSION = 'v26'` y `./js/lib/reader-prefs.js` en `PRECACHE_URLS`), `js/app.js` si `initReader` necesita la ruta nueva o las preferencias
- Test: `tests/index-html.test.js`, `tests/precache.test.js`, `tests/security.test.js` (debe incluir el archivo nuevo)

**Interfaces:**
- Consumes: todo lo de las Tareas 3 y 5.

Usa la skill frontend-design y DESIGN.md antes de tocar estilos.

- [ ] **Step 1: Escribir las pruebas que fallan** en `tests/index-html.test.js`: existen `#reader-translation-bar` con la casilla `#reader-show-translation` (con `<label>`), `#reader-translation-review` (REVISAR + `#reader-approve-translation` y `#reader-discard-translation`), `#reader-translate` («Generar traducción») y `#reader-translate-note` (para «no se puede traducir»); `CACHE_VERSION` es `'v26'` y la precarga incluye `reader-prefs.js`.
- [ ] **Step 2: Ver que fallan** — Run: `npm test -- tests/index-html.test.js tests/precache.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementar el HTML y los estilos** (botón «Ver traducción» de al menos 44 px de alto, traducción con estilo distinto al francés y contraste AA en claro y oscuro).
- [ ] **Step 4: Implementar el comportamiento en `reader.js`**
  - `renderStory` usa `readerSentences(text)`; cada fila agrega, si hay traducción, un botón «Ver traducción»/«Ocultar traducción» con `aria-expanded` y `aria-controls` y la traducción oculta con `lang={translation.lang}`. Como un `<p>` no puede contener otro, la fila pasa a ser `<div class="reader-sentence">` y la traducción un `<p>` dentro; así el resaltado de la frase que suena (`is-current`) y la evidencia abarcan también la traducción.
  - La casilla lee y guarda `showTranslation` con `createReaderPrefs(localStorage)`; activada, muestra todas y oculta los botones por frase.
  - Biblioteca: REVISAR si `needsReview(t)`. Lector: `#reader-translation-review` visible si `text.translation?.status === 'review'` y `text.status === 'approved'`.
  - Sin traducción: `#reader-translate` visible si `translatableSentences(text.body)` no es `null`; si es `null`, `#reader-translate-note` con `translateNotPossible`. Al tocar: ocupado, `sendTranslation`, `addTranslation` con `guarded`, re-render; errores con `chatMessage`; sin red, `translateOffline`.
  - Cuestionario: `startQuiz` oculta todas las traducciones y deshabilita casilla y botones; `resetQuiz` y el final del cuestionario los restauran según el ajuste.
  - Nueva historia: `sendStory` con `supportLang: 'es'` y `textFromStory(..., { supportLang: 'es' })`.
- [ ] **Step 5: Ejecutar** — Run: `npm test && npm run lint`. Expected: PASS.
- [ ] **Step 6: Recorrido** con la skill `run` y un servidor falso, a 360 y 1280 px, claro y oscuro, entrando desde Inicio con toques: revelar una frase, activar el ajuste y recargar, cuestionario (traducciones ocultas y casilla deshabilitada), escuchar con traducciones visibles, tocar una palabra, traducir una historia vieja, aprobar la traducción, y todo sin conexión. Guardar capturas en el scratchpad y anotar lo visto.
- [ ] **Step 7: Commit** — `git commit -m "feat: traducción por frase en el lector y caché v26"`

---

### Task 7: Prueba real y medición de costo

**Files:**
- Modify: `server/eval/compare-story.mjs`, `server/eval/score-story.js` (y su prueba)
- Create: `server/eval/compare-translate.mjs`

El usuario ya dio permiso (25/11/2026) para 3 historias y 2 traducciones.

- [ ] **Step 1:** `score-story` agrega la comprobación «cada par tiene traducción y la cantidad coincide»; prueba en `server/tests/score-story.test.js` primero (ver fallar, implementar).
- [ ] **Step 2:** Ambos scripts envuelven el `fetch` del adaptador para leer `usage` de la respuesta (clonar la `Response`) e imprimir tokens de entrada y salida y el costo con 0,10 / 0,50 USD por millón. `compare-translate.mjs` traduce 2 historias de `story-cases.json` partidas con `Intl.Segmenter`.
- [ ] **Step 3:** Run: `node server/eval/compare-story.mjs` limitado a 3 casos y `node server/eval/compare-translate.mjs`. Mostrar la salida real al usuario.
- [ ] **Step 4:** Anotar en el spec, sección de costo, los tokens y el costo medidos. Commit — `git commit -m "test: prueba real de traducciones y costo medido"`

---

### Task 8: Cierre

- [ ] Releer el diff completo de la rama buscando errores, sobras y cosas no pedidas.
- [ ] `npm test && npm run lint` con la salida real.
- [ ] Pedir confirmación al usuario y entonces, en este orden: publicar el servidor (`cd server && npx wrangler deploy`), comprobar `/story` y `/translate` con una petición real, y luego push de la rama y PR.
- [ ] Informe de cierre de la etapa con los 6 puntos de CLAUDE.md.
