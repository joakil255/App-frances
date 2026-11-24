# Etapa 10 — Consultar y guardar palabras desde el chat: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Las palabras de las respuestas de Claude se pueden tocar y abren una tarjeta con la traducción en contexto, la forma base, el artículo y el género, y un botón para escuchar.
- La palabra se puede guardar en el vocabulario sin duplicar formas de una misma palabra.
- Las palabras guardadas se subrayan en el chat.

**Architecture:**
- El modelo de palabras pasa a la versión 2, con `lang` y `lemma`. La regla es `lemma === lemmaOf(fr, gender)`, con una migración local.
- La copia de seguridad y la exportación JSON pasan a la versión 2 y siguen leyendo la 1.
- El Worker agrega `POST /lookup`, con un contador aparte, y el adaptador agrega `lookup()` con salida validada.
- En la app:
  - lógica pura en `js/lib/lookup.js` (corte en palabras, frase, consulta, decisión de guardar) y `js/lib/lookup-cache.js`;
  - pantalla en `js/screens/word-card.js`, conectada desde `js/screens/chat.js`.

**Tech Stack:** JS en módulos sin dependencias nuevas, `Intl.Segmenter`, `localStorage`, Cloudflare Worker + KV, `@anthropic-ai/sdk` 1.13.0 (ya aprobada), `node --test` y ESLint.
**Spec:** `docs/superpowers/specs/2026-11-24-etapa-10-palabras-chat-design.md` + `DESIGN.md`

## Global Constraints
- **TDD estricto:** primero la prueba, verla fallar y luego el código mínimo. Nunca se debilita ni se borra una prueba.
- **Git solo local:** rama `etapa-10-palabras-chat`, commits pequeños en español terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Sin `git push`, sin `wrangler deploy` y sin tocar GitHub Pages sin la confirmación del usuario.**
- **Sin dependencias nuevas.** Los datos van **solo a Anthropic**. Los agentes no hacen llamadas reales a Claude ni a Cloudflare: eso lo hace el controlador con el usuario (Tarea 7).
- Todo texto de Claude o del usuario se pinta con `textContent`; nunca `innerHTML`. Textos visibles en español; código en inglés; comentarios breves en español.
- **Regla invariable:** toda palabra guardada cumple `lemma === lemmaOf(fr, gender)` y tiene `lang === 'fr'`.
- **Claves y versiones:**
  - `app-frances` → `{ schemaVersion: 2, words }`;
  - copia de la v1 en `app-frances-v1-<ISO>`;
  - `BACKUP_VERSION = 2`, que también lee la 1;
  - exportación JSON del vocabulario `version: 2`, que también lee la 1;
  - `app-frances-lookups` → `{ schemaVersion: 1, entries }`, con 500 entradas como máximo y fuera de la copia de seguridad.
- **Servidor:**
  - `POST /lookup`, con cuerpo `{ lang: 'fr', word, sentence }`;
  - `word` cumple `/^[\p{L}'’-]{1,40}$/u`;
  - `sentence` tiene de 1 a 1000 letras y contiene `word`, sin distinguir mayúsculas ni el tipo de apóstrofo;
  - clave KV `lookup:AAAA-MM-DD` y variable `LOOKUP_LIMIT=200`;
  - error `lookup_limit` (429).
- **Salida de la consulta:** `{ contextTranslation, lemma, lemmaTranslation, partOfSpeech, gender, baseWithArticle, sentenceTranslation }`.
  - `partOfSpeech` ∈ `noun`, `proper_noun`, `verb`, `adjective`, `adverb`, `pronoun`, `article`, `preposition`, `conjunction`, `number`, `interjection`, `expression`, `other`.
  - `gender` ∈ `m`, `f`, `null`.
- `sw.js`: `CACHE_VERSION = 'v19'`, y cada archivo nuevo de la app va en `PRECACHE_URLS` en la tarea que lo crea.

## Review Focus
1. **Migración con el almacenamiento lleno:** lo guardado en v1 no cambia, la app funciona con las palabras migradas en memoria y avisa (Tarea 1, prueba con un `setItem` que lanza).
2. **Guardar desde el chat** «manges» cuando existe «manger», o «école» cuando existe «l'école»: se bloquea (Tarea 5, pruebas de `findInVocabulary`).
3. **Consulta sin conexión:** si está en la caché, se muestra; si no, aparece `chatOffline` y no se llama a la red (Tarea 5, pruebas de `resolveLookup`).
4. **Restaurar una copia v1 hecha antes de esta etapa:** se restaura con `lang` y `lemma` calculados, y las tarjetas de repaso siguen enlazadas (Tarea 2).
5. **Respuesta de Claude con `<script>` o `<b>`:** cada palabra y cada separador quedan como texto (Tarea 5, `tokenize` conserva el texto exacto; Tarea 6, la prueba de seguridad revisa `word-card.js` y `chat.js`).

---

### Task 1: Modelo de palabras v2 y migración (TDD)
**Files:** Modify `js/lib/words.js`, `js/lib/storage.js`, `tests/words.test.js`, `tests/storage.test.js`, `js/screens/vocabulary.js` (mostrar el aviso de migración fallida con `storageMessage`).

**Produces:**
- `lemmaOf(fr: string, gender: 'm' | 'f' | null): string`, en `js/lib/words.js` y sin dependencias del navegador (el Worker lo importa en la Tarea 3);
- `validateWord(...).word` incluye `lang` y `lemma`. Un `input.lang` distinto de `'fr'` da el error `{ lang: 'Idioma no admitido.' }`;
- `upgradeWord(word): word`, que agrega `lang: 'fr'` y `lemma` sin tocar nada más;
- `createWordStore(...).load()` devuelve `{ words, corruptBackupKey, migrationError }`, donde `migrationError` es un `StorageError` o `null`.

- [ ] **Paso 1: pruebas que fallan.**
  - `words.test.js`:
    - `lemmaOf('la maison','f') === 'maison'`;
    - `lemmaOf("L’école",'f') === "école"`;
    - `lemmaOf('les vacances','f') === 'vacances'`;
    - `lemmaOf('un peu',null) === 'un peu'`;
    - `lemmaOf('la plupart',null) === 'la plupart'`;
    - `lemmaOf("s'appeler",null) === "s'appeler"`;
    - `lemmaOf('Manger',null) === 'manger'`;
    - con NFC, con espacios de más y con texto vacío;
    - `validateWord` agrega `lang: 'fr'` y el `lemma`, y rechaza `lang: 'en'`;
    - el formulario sigue permitiendo «le livre» y «la livre».
  - `storage.test.js`:
    - `'migra v1 a v2 sin cambiar ids ni otros campos'`;
    - `'guarda la copia v1 intacta en app-frances-v1-…'`;
    - `'no vuelve a migrar un documento v2'`;
    - `'migra 1000 palabras'`;
    - `'si guardar falla, lo guardado sigue en v1 y load devuelve las palabras migradas y migrationError'`;
    - `'un documento sin schemaVersion se trata como v1'`;
    - `'la lista inicial se siembra en v2'`;
    - la prueba de datos dañados sigue igual.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** `npm test` y `npm run lint` pasan. Commit `feat: palabras v2 con idioma y forma base, y migración`.

### Task 2: Copia de seguridad v2 e importación/exportación (TDD)
**Files:** Modify `js/lib/backup.js`, `js/lib/transfer.js`, `tests/backup.test.js`, `tests/transfer.test.js`.
**Consumes:** `lemmaOf`, `upgradeWord` y `validateWord` (Tarea 1).

- [ ] **Paso 1: pruebas que fallan.**
  - **Copia de seguridad:**
    - `buildBackup` escribe `version: 2` y palabras con `lang` y `lemma`;
    - `readBackup` acepta la 1 (calcula `lang` y `lemma`) y la 2, y con la 3 da el aviso «más nueva»;
    - una v2 con `lang` distinto de `'fr'` es `damaged`;
    - el ciclo guardar → restaurar da datos idénticos;
    - una copia v1 restaurada conserva las tarjetas (`cardIdOf`) enlazadas.
  - **Exportación e importación:**
    - `exportJson` escribe `version: 2` con `lang` y `lemma`;
    - `readImport` acepta las versiones 1 y 2;
    - `planImport` de un CSV calcula `lemma`;
    - el mazo `data/a1-deck.json` (versión 1) se importa con `lemma`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas y linter. Commit `feat: copia de seguridad y exportación v2 con forma base`.

### Task 3: Servidor — ruta `/lookup`, validación, contador y normalización (TDD)
**Files:**
- Create: `server/src/lookup-validate.js`, `server/src/lookup-normalize.js`, `server/tests/lookup-validate.test.js`, `server/tests/lookup-normalize.test.js`.
- Modify: `server/src/handler.js`, `server/src/limit.js`, `server/src/config.js`, `server/wrangler.jsonc` (`LOOKUP_LIMIT: "200"`), `server/tests/handler.test.js`, `server/tests/limit.test.js`, `server/tests/config.test.js`.

**Consumes:** `lemmaOf`, importado con `import { lemmaOf } from '../../js/lib/words.js'`.

**Produces:**
- `validateLookupInput(body)` → `{ ok, value: { lang, word, sentence } }`;
- `normalizeLookup(raw)` → la salida limpia, o lanza `ProviderError('bad_output')`;
- `reserveMessage(kv, date, limit, prefix = 'count')`, con prefijo `lookup` para las consultas;
- `readConfig(...).config.lookupLimit`;
- el handler acepta `POST`/`OPTIONS` en `/lookup` y llama a `providers[...].lookup(value)`. La respuesta 200 es la salida más `remainingLookups`.

- [ ] **Paso 1: pruebas que fallan.**
  - **Validación:** `word` vacío, con espacio, de 41 letras o que no está en la frase → inválido. `«école»` en `«Je vais à l’école.»` → válido. `lang` distinto de `'fr'` → inválido.
  - **Normalización:**
    - `noun` con `la maison`/`f` → válido;
    - `les vacances`/`f` y `l'école`/`m` → válidos;
    - `le` con `f` → `bad_output`;
    - sustantivo sin género → `bad_output`;
    - `baseWithArticle` que no da el `lemma` → `bad_output`;
    - `proper_noun` `Paris` con lemma `paris` y género `null` → válido;
    - `verb` con género `m` → `bad_output`;
    - el `lemma` con mayúsculas o apóstrofo tipográfico se normaliza;
    - campos de más o faltantes → `bad_output`.
  - **Handler:**
    - `/lookup` sin código → 401, otro origen → 403;
    - el contador `lookup:` sube y no toca `count:`;
    - el 201 del día → 429 `lookup_limit`, sin llamar al proveedor;
    - el proveedor recibe `{ lang, word, sentence }`;
    - `/chat` sigue igual (las pruebas existentes pasan).
  - **Configuración:** `LOOKUP_LIMIT` falta o es inválido → `ok: false`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. Ejecutar `cd server && WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run --outdir "$(mktemp -d)"` para comprobar que el Worker empaqueta `js/lib/words.js`. **Paso 4:** pruebas y linter. Commit `feat: ruta /lookup con contador aparte y salida validada`.

### Task 4: Adaptador `lookup()`, instrucciones y prueba de 10 palabras (TDD, sin red)
**Files:**
- Modify: `server/src/providers/claude.js`, `server/src/prompt.js`, `server/tests/claude.test.js`.
- Create: `server/eval/lookup-cases.json`, `server/eval/compare-lookup.mjs`, `server/eval/score-lookup.js`, `server/tests/score-lookup.test.js`.

**Consumes:** `normalizeLookup` (Tarea 3) y `ProviderError`.

**Produces:**
- `createClaudeAdapter(...).lookup({ lang, word, sentence })` → la salida normalizada;
- `buildLookupPrompt()` y `LOOKUP_SCHEMA` en `prompt.js`.

**Instrucciones**, en español y con la salida exacta del esquema:
- traducir la palabra en esa frase;
- dar su forma base:
  - el infinitivo de un verbo;
  - el masculino singular de un adjetivo;
  - el singular de un sustantivo, salvo que solo se use en plural;
- dar `baseWithArticle` con `le`, `la`, `l'` o `les` si es sustantivo;
- `au`, `aux`, `du` y `des` contraídos son `preposition` y su forma base es ellos mismos;
- traducir la frase completa;
- nivel A1 y traducciones cortas.

- [ ] **Paso 1: pruebas que fallan.**
  - `claude.test.js`, con un `fetch` falso:
    - la petición lleva `output_config.format` con `LOOKUP_SCHEMA`, `effort: 'low'` y un `messages` con la palabra y la frase;
    - una salida válida se normaliza;
    - los errores HTTP se convierten igual que en `chat`;
    - `refusal` → `refused`.
  - `score-lookup.test.js`:
    - `scoreLookup(case, output)` → `{ lemmaOk, posOk }`, sin distinguir mayúsculas ni tipo de apóstrofo;
    - con los 10 casos de la tabla del diseño, en `lookup-cases.json`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. `compare-lookup.mjs`:
  - lee la clave como `compare.mjs` y nunca la imprime;
  - imprime cada caso, el total y si se cumple el criterio (al menos 9 de 10 y cero rechazos).

  **No se ejecuta contra la API.**
- [ ] **Paso 4:** pruebas y linter. Commit `feat: consulta de palabras en el adaptador de Claude y prueba de 10 casos`.

### Task 5: Lógica de consulta en la app y caché (TDD)
**Files:**
- Create: `js/lib/lookup.js`, `js/lib/lookup-cache.js`, `tests/lookup.test.js`, `tests/lookup-cache.test.js`.
- Modify: `js/lib/messages.js`, `tests/messages.test.js`, `sw.js` (`v19` y los dos archivos).

**Consumes:** `lemmaOf`, `duplicateKey` y `normalizeFrenchWord` (Tarea 1), y `chatUrl` y `sendChat` como modelo.

**Produces:**
- `tokenize(text, Segmenter = globalThis.Intl?.Segmenter): Array<{ text, word: string | null, sentence: string }>`.
  - Los textos unidos dan exactamente `text`.
  - `word` es la palabra que se consulta, sin la parte elidida: `l'`, `d'`, `j'`, `m'`, `t'`, `s'`, `n'`, `c'`, `qu'`, `jusqu'`, `lorsqu'`, `puisqu'`, con apóstrofo recto o tipográfico. Es `null` si el segmento no tiene letras.
  - Sin `Segmenter`, todo queda en un solo token con `word: null`.
- `lookupUrl(hostname)` → `chatUrl(hostname)` con `/lookup` en lugar de `/chat`.
- `sendLookup({ url, code, body, fetch, isOnline, timeoutMs = 100000 })` → `{ ok: true, result, remainingLookups } | { ok: false, error }`, con las mismas reglas de error que `sendChat`.
- `resolveLookup({ cache, lang, word, sentence, isOnline, send })` → primero la caché. Sin conexión y sin caché → `{ ok: false, error: 'offline' }` sin llamar a `send`. Con éxito, guarda en la caché.
- `findInVocabulary(words, { lang, lemma, fr })` → la palabra existente con el mismo `lang` y (`lemma` igual o `duplicateKey(fr)` igual), o `null`.
- `wordFromLookup(result, sentence)` → la entrada para `saveWord`:
  - `lang: 'fr'`, `fr: baseWithArticle`, `es: lemmaTranslation` y `gender`;
  - `exampleFr` = la frase y `exampleEs` = `sentenceTranslation` solo si **las dos** caben en 200; si no, las dos vacías;
  - `category: 'Conversación'` y `needsReview: false`.
- `isSavedToken(words, cache, lang, word, sentence)` → `true` si `lemmaOf(word, null)` o el `lemma` en caché de esa consulta coincide con un `lemma` del vocabulario.
- `createLookupCache(backend, { max = 500, now })` → `{ get(lang, word, sentence), set(lang, word, sentence, result) }`. La clave es `lang|palabra en minúsculas con apóstrofo recto|frase con normalizeText`; descarta por `usedAt` más antiguo; `get` actualiza `usedAt`.
- `MESSAGES.lookupLimit` («Llegaste al límite de consultas de hoy.» / «Puedes seguir conversando; las consultas se reinician a medianoche, hora de Chile.») y `chatMessage('lookup_limit')`.

- [ ] **Paso 1: pruebas que fallan.**
  - **`tokenize`:**
    - «Je vais à l'école aujourd'hui.» da `word` «école» y «aujourd'hui»;
    - «Qu’est-ce» da «est» y «ce»;
    - los números y el emoji tienen `word: null`;
    - un texto con `<script>` y `<b>` se recompone exacto;
    - la `sentence` es la oración que contiene la palabra;
    - sin `Segmenter`, un solo token.
  - **`findInVocabulary`:**
    - «manges», cuya consulta da `lemma` «manger», encuentra «manger»;
    - «école» encuentra «l'école»;
    - con mayúsculas o apóstrofo tipográfico también encuentra;
    - con `lang` `'en'` no encuentra.
  - **`wordFromLookup`:** con una frase de 201 letras, sin ejemplo; con todo corto, con ejemplo. La entrada pasa `validateWord`.
  - **`resolveLookup`:** con caché y sin conexión, devuelve la caché; sin caché y sin conexión, `offline` sin llamar a `send`; con éxito, guarda en la caché.
  - **`sendLookup`:** 429 `lookup_limit` → `error: 'lookup_limit'`; JSON roto → `bad_output`.
  - **Caché:**
    - guarda y lee;
    - el tope de 500 descarta la más antigua;
    - datos dañados → vacía, sin lanzar;
    - un `setItem` que lanza no rompe `set`.
  - **`isSavedToken`:** por la palabra misma y por el `lemma` en caché.
  - **Mensajes:** el texto exacto de `lookupLimit` y `chatMessage('lookup_limit')`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas (incluida la precarga) y linter. Commit `feat: lógica de consulta de palabras y caché`.

### Task 6: Pantalla — palabras tocables, tarjeta, guardar y subrayado (frontend-design + DESIGN.md)
**Files:**
- Create: `js/screens/word-card.js`.
- Modify: `js/screens/chat.js`, `js/app.js`, `index.html`, `css/styles.css`, `sw.js` (`js/screens/word-card.js`), `DESIGN.md`, `README.md`, `tests/index-html.test.js`.

**Consumes:**
- todo `js/lib/lookup.js` y `createLookupCache` (Tarea 5);
- `store.saveWord` y `getWords` del almacén de palabras;
- `playFrench`;
- `setBeforeSpeak` y `showNotice` de `initChat`.

**Produces:** `initWordCard({ wordStore, cache, fetch, isOnline, hostname, getCode, synth, beforeSpeak })` → `{ open(token, buttonEl), refresh() }`. `chat.js` pinta las respuestas de Claude con `tokenize`, como botones `.chat-word`, y llama a `open`.

**Textos exactos de la tarjeta:**
- título: la palabra tocada;
- «En esta frase: …»;
- «Forma base: …», seguida de la traducción;
- el tipo en español: sustantivo, nombre propio, verbo, adjetivo, adverbio, pronombre, artículo, preposición, conjunción, número, interjección, expresión u otra;
- el género: «masculino» o «femenino»;
- los botones «Escuchar», «Guardar», «Ya está en tu vocabulario» (desactivado), «Guardada» y «Cerrar»;
- mientras espera, «Buscando…».

- [ ] **Paso 1:** usar la skill **frontend-design** con DESIGN.md:
  - la tarjeta es un `<dialog id="word-card">` modal, que en el móvil es una hoja abajo;
  - los botones-palabra mantienen el ritmo del texto y tienen un área táctil grande, con foco visible;
  - el subrayado de las palabras guardadas no depende solo del color.

  Documentar todo en DESIGN.md.
- [ ] **Paso 2: pruebas que fallan** (`index-html.test.js`): existe `#word-card` con título enlazado por `aria-labelledby`, los botones con su texto exacto y la zona de «Buscando…» con `role="status"`.
- [ ] **Paso 3: implementar.**
  - **Respuestas de Claude:**
    - texto con `tokenize`;
    - cada `word` no nulo es un `<button type="button" class="chat-word">`;
    - si la respuesta está guardada, se le agrega la clase `chat-word-saved` y su nombre accesible termina en «, en tu vocabulario».
  - **Con «Escuchar primero»,** las palabras de una respuesta tapada no se pueden tocar hasta que se muestra.
  - **Abrir la tarjeta:**
    - primero `beforeSpeak()`, que corta el micrófono;
    - después `resolveLookup`;
    - si hay error, se muestra `chatMessage(error)` en la tarjeta.
  - **Guardar:**
    - si `findInVocabulary` encuentra la palabra → «Ya está en tu vocabulario»;
    - si no, `saveWord(wordFromLookup(...))`. Si es válida → «Guardada», y se refresca el subrayado de todo el chat;
    - si la validación falla, se muestra el error.
  - **Cerrar:** con Escape, con «Cerrar» o tocando fuera; el foco vuelve al botón-palabra.
  - **`app.js`:** conecta la caché con `createLookupCache(backend)`, el almacén de palabras y el código de acceso guardado. Cuando cambia el vocabulario (evento `storage` o un guardado), refresca el subrayado.
  - **README:** subsección «Consultar palabras» dentro de «Conversar», con el límite de 200 consultas, la caché y el guardado sin duplicados.
- [ ] **Paso 4:** `npm test` (incluidas seguridad y precarga) y `npm run lint` pasan. Recorrido con `npm start` y un servidor falso en `127.0.0.1:8787` que responda `/chat` y `/lookup` con respuestas fijas, a 360 y 1280 px, en modo claro y oscuro:
  - tocar una palabra abre la tarjeta y la cierra devolviendo el foco;
  - guardar subraya la palabra en todo el chat;
  - una forma conjugada de una palabra guardada → «Ya está en tu vocabulario»;
  - sin conexión: la caché funciona, y sin caché aparece el aviso;
  - con «Escuchar primero», una respuesta tapada no se puede tocar;
  - la palabra guardada aparece en Vocabulario y en Estudiar como nueva.

  Commit `feat: tarjeta de palabras en Conversar con guardar y subrayado`.

### Task 7: Prueba real, publicación y teléfono (el controlador, con el usuario)
- [ ] **Paso 1 (con permiso):** `cd server && node eval/compare-lookup.mjs`, que cuesta menos de un centavo.
  - Si no se cumple el criterio de publicación, se ajustan las instrucciones (vuelve a revisión) hasta 3 veces.
  - Si sigue sin cumplirse, se consulta al usuario.
- [ ] **Paso 2 (con confirmación):** `npm run deploy --prefix server` y comprobar `/lookup` sin gastar: sin código debe dar 401.
- [ ] **Paso 3 (con confirmación):** push de la rama y PR a `main`. Tras el merge del usuario, comprobar que Pages sirve `v19`.
- [ ] **Paso 4: prueba del usuario en el teléfono.**
  - Su vocabulario migró: las palabras siguen ahí y el repaso está igual.
  - Tocar palabras, guardar, ver el subrayado y la palabra en Estudiar.
  - Una consulta repetida sin conexión sale de la caché.
- [ ] **Paso 5:** informe de cierre (CLAUDE.md), con la lista de decisiones tomadas.
