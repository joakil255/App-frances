# Etapa 11 — Lecturas con audio y cuestionarios: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sección «Leer» con estas partes:
- una biblioteca de historias de Claude a tu nivel, en REVISAR hasta aprobarlas;
- un lector que lee frase por frase con resaltado, pausa y velocidad;
- tocar una palabra abre la tarjeta de la Etapa 10;
- un cuestionario de comprensión de 4 preguntas por historia.

**Architecture:**
- **Almacén de textos** `js/lib/texts.js` y copia de seguridad v3.
- **Servidor:** ruta `POST /story` con contador aparte y salida validada, incluidas las preguntas, más `story()` en el adaptador.
- **Lógica pura de la app:** `js/lib/story.js`, `js/lib/sentence-player.js` y `js/lib/reading-quiz.js`.
- **Pantalla:** `js/screens/reader.js` (biblioteca, lector y cuestionario), que reutiliza la tarjeta de palabras generalizada.

**Tech Stack:** JS en módulos sin dependencias nuevas, `speechSynthesis`, `Intl.Segmenter`, `localStorage`, Cloudflare Worker + KV, `@anthropic-ai/sdk` 1.13.0 (ya aprobada), `node --test` y ESLint.
**Spec:** `docs/superpowers/specs/2026-11-24-etapa-11-lecturas-design.md` + `DESIGN.md`

## Global Constraints
- **TDD estricto:** primero la prueba, verla fallar y luego el código mínimo. Nunca se debilita ni se borra una prueba.
- **Git solo local:** rama `etapa-11-lecturas`.
  - Commits en español: el asunto en una línea, una línea en blanco y luego `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Usa `git commit -m "asunto" -m "Co-Authored-By: …"`.
  - **Sin `git push`, sin `wrangler deploy` y sin reescribir el historial.**
- **Sin dependencias nuevas.** Los datos van solo a Anthropic. Los agentes no llaman a Claude ni a Cloudflare.
- Todo texto de Claude o del usuario se pinta con `textContent`.
- **Textos:**
  - clave `app-frances-texts` → `{ schemaVersion: 1, texts }`;
  - niveles `A1.1`, `A1.2` y `A2`;
  - `status` ∈ `review` o `approved`;
  - `source.kind` `'generated'`, `name` `'Claude (Anthropic)'` y `license` `'Historia original generada para uso personal'`;
  - `quiz.lang` ∈ `es` o `fr`, con 4 preguntas de 3 o 4 opciones.
- **Copia de seguridad:** `BACKUP_VERSION = 3`. Lee las versiones 1, 2 y 3. Restaurar una v1 o v2 **no toca** las historias.
- **Servidor:**
  - `POST /story`, con cuerpo `{ lang: 'fr', level, topic (0–60), quizLang }`;
  - clave KV `story:AAAA-MM-DD` y `STORY_LIMIT=5`;
  - error `story_limit` (429).
- **Salida de la historia:** `{ title (1–80), body (80–300 palabras, ≤3000 letras, ≥4 frases, sin HTML ni Markdown), questions (4) }`.
- `sw.js`: `CACHE_VERSION = 'v20'`, y cada archivo nuevo de la app va en `PRECACHE_URLS` en la tarea que lo crea.

## Review Focus
1. **Restaurar una copia v2 hecha antes de esta etapa no borra las historias guardadas** (Tarea 2).
2. **Salir del lector mientras lee:** la voz se detiene, ya sea al cambiar de pantalla, al ir atrás, al ocultar la página o al abrir la tarjeta (Tarea 6, recorrido; `stop()` en la Tarea 5).
3. **Una pregunta cuya `evidence` no está en el texto, o con dos respuestas iguales:** el servidor la rechaza, y nunca llega a guardarse (Tarea 3).
4. **Android:** la pausa no corta la frase en curso a mitad de palabra ni pierde la posición. Se sigue desde la frase siguiente (Tarea 5, con un `speechSynthesis` falso).
5. **Guardar una palabra desde una historia en REVISAR:** queda con `needsReview: true` y categoría `Lectura` (Tarea 5).

---

### Task 1: Almacén de textos (TDD)
**Files:** Create `js/lib/texts.js`, `tests/texts.test.js`. Modify `sw.js` (`v20` y `js/lib/texts.js`).
**Consumes:** `toStorageError` y `normalizeText`.
**Produces:**
- `TEXTS_KEY`, `TEXT_LEVELS`, `QUIZ_LANGS` y `GENERATED_SOURCE`;
- `validateText(text): { ok, errors }`;
- `createTextStore(backend, { makeId, now })` → `{ load(): { texts, corruptBackupKey }, getTexts(), getText(id), addText(input), approve(id), deleteText(id), markRead(id), saveQuizResult(id, { correct, total }), watchExternalChanges(target, onChange) }`.
  - `getTexts` devuelve la lista de más nuevo a más viejo.
  - `addText` crea el texto con `status: 'review'`, `readAt: null` y `quizResult: null`.
  - Guardar falla con `StorageError` y no cambia la memoria (mismo patrón que `storage.js`).
- [ ] **Paso 1: pruebas que fallan.**
  - `validateText`: cada campo inválido según el diseño, incluidas las preguntas y que `evidence` esté en `body`.
  - El almacén: agrega, aprueba, borra, marca leída y guarda el resultado (repetirlo lo reemplaza).
  - Orden de la lista.
  - Datos dañados → copia aparte y lista vacía.
  - `setItem` que lanza → `StorageError` y la memoria intacta.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas y linter. Commit `feat: almacén de textos de lectura`.

### Task 2: Copia de seguridad v3 con historias (TDD)
**Files:** Modify `js/lib/backup.js`, `js/screens/home.js` (texto de la ventana de restaurar), `index.html` si el texto vive ahí, `tests/backup.test.js`, `tests/index-html.test.js` si cambia el texto.
**Consumes:** `TEXTS_KEY` y `validateText` (Tarea 1).
- [ ] **Paso 1: pruebas que fallan.**
  - `buildBackup({ words, study, texts, now })` → `version: 3` con `texts`.
  - `readBackup`:
    - acepta la 1 y la 2, devolviendo `texts: null` (= no traía historias);
    - acepta la 3;
    - con la 4 da el aviso «más nueva»;
    - un texto inválido → `damaged`.
  - `restoreBackup`:
    - con una v3 reemplaza las tres claves, y si una escritura falla deshace las tres;
    - con `texts: null` **no toca** `app-frances-texts`;
    - ida y vuelta idéntica.
  - La ventana de restaurar nombra las historias: «Se reemplazarán tus palabras, tu progreso y tus historias.» Con una copia vieja añade «(esta copia no trae historias: las tuyas se mantienen)».
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar; Inicio pasa `texts` al guardar la copia. **Paso 4:** pruebas y linter. Commit `feat: copia de seguridad v3 con historias`.

### Task 3: Servidor — ruta `/story`, validación, contador y normalización (TDD)
**Files:**
- Create: `server/src/story-validate.js`, `server/src/story-normalize.js` y sus pruebas en `server/tests/`.
- Modify: `server/src/handler.js`, `server/src/config.js` (`storyLimit`), `server/wrangler.jsonc` (`STORY_LIMIT: "5"`), y `server/tests/handler.test.js` y `config.test.js`.

**Produces:**
- `validateStoryInput(body)` → `{ ok, value: { lang, level, topic, quizLang } }`;
- `normalizeStory(raw)` → `{ title, body, questions }`, o lanza `ProviderError('bad_output')`;
- el handler acepta `/story` (`POST` y `OPTIONS`), reserva `story:` y llama a `providers[...].story(value)`. La respuesta 200 es la historia más `remainingStories`.

- [ ] **Paso 1: pruebas que fallan.**
  - **Entrada:** `topic` de 61 letras o con salto de línea, nivel desconocido o `quizLang` `'en'` → inválido.
  - **Salida:**
    - menos de 80 palabras o más de 300, menos de 4 frases, `<b>` o `**` → `bad_output`;
    - 3 o 5 preguntas → `bad_output`;
    - una pregunta con opciones repetidas, `answer` fuera de rango, `explanation` vacía o `evidence` que no está en `body` → `bad_output`;
    - `evidence` con otra mayúscula o con apóstrofo tipográfico → válida.
  - **Handler:**
    - la 6.ª historia del día → 429 `story_limit`, sin llamar al proveedor;
    - `count:` y `lookup:` no cambian;
    - sin código → 401;
    - `/chat` y `/lookup` siguen igual.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas, linter y `cd server && WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run --outdir "$(mktemp -d)"`. Commit `feat: ruta /story con contador aparte y salida validada`.

### Task 4: Adaptador `story()`, instrucciones y prueba de 3 historias (TDD, sin red)
**Files:**
- Modify: `server/src/providers/claude.js`, `server/src/prompt.js`, `server/tests/claude.test.js`.
- Create: `server/eval/story-cases.json`, `server/eval/compare-story.mjs`, `server/eval/score-story.js`, `server/tests/score-story.test.js`.

**Produces:** `createClaudeAdapter(...).story({ lang, level, topic, quizLang })` → `normalizeStory(...)`, y `buildStoryPrompt(level, quizLang)` y `STORY_SCHEMA` en `prompt.js`.

**Instrucciones** (en español; contenido según el diseño): historia en francés para un hispanohablante del nivel pedido, frases cortas, vocabulario frecuente, presente (en `A2` también passé composé), género y concordancia correctos, sin datos personales reales, sobre el tema si lo hay. Además, 4 preguntas de comprensión en el idioma `quizLang`, con:
- una sola opción correcta;
- distractores creíbles;
- `explanation` en español;
- `evidence` copiada tal cual del texto.

- [ ] **Paso 1: pruebas que fallan.**
  - **Petición:** lleva `STORY_SCHEMA`, `effort: 'low'` y las instrucciones con el nivel y el idioma de las preguntas.
  - **Salida:** válida → se normaliza. Los errores se convierten igual que en `chat`.
  - **`scoreStory(output)`** → `{ wordsOk, sentencesOk, noMarkupOk, questionsOk }`.
  - **Criterio de la prueba:** las 3 historias pasan las cuatro comprobaciones, con cero rechazos.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar.
  - `story-cases.json` tiene tres casos:
    - `A1.1`, «mon chat», preguntas en `es`;
    - `A1.2`, «le marché», en `es`;
    - `A2`, «un voyage», en `fr`.
  - `compare-story.mjs` imprime cada historia completa con sus preguntas, para revisarlas a mano. Lee la clave como `compare.mjs` y nunca la imprime. **No se ejecuta contra la API.**
- [ ] **Paso 4:** pruebas y linter. Commit `feat: historias en el adaptador de Claude y prueba de 3 casos`.

### Task 5: Lógica de la app: historia, reproductor y cuestionario (TDD)
**Files:**
- Create: `js/lib/story.js`, `js/lib/sentence-player.js`, `js/lib/reading-quiz.js` y sus pruebas en `tests/`.
- Modify: `js/lib/lookup.js` (`wordFromLookup`), `js/lib/router.js`, `js/lib/messages.js` y sus pruebas, y `sw.js` (los tres archivos).

**Consumes:** `postJson` y `chatUrl` (`js/lib/chat.js`), `tokenize`, y `RATES` y `speak` (`js/lib/speech.js`).

**Produces:**
- `storyUrl(hostname)` → la misma base con `/story`;
- `sendStory({ url, code, body, fetch, isOnline, timeoutMs })`, con las mismas reglas de error que `sendLookup`;
- `textFromStory(result, { level, topic, quizLang })` → la entrada para `addText`;
- `createSentencePlayer({ synth, voice, sentences, rate, onSentence, onEnd, onError, Utterance })` → `{ play(from = 0), pause(), resume(), stop(), setRate(rate), playing() }`.
  - Pausar deja que termine la frase actual y no habla más.
  - Continuar empieza en la siguiente.
  - `stop` cancela.
  - Un error de voz avisa una sola vez y se detiene.
  - `interrupted` y `canceled` no son errores.
- `createReadingQuiz(quiz)` → `{ current(): { index, question, options }, answer(i): { correct, answer, explanation, evidence }, next(): boolean, result(): { correct, total } }`. No deja responder dos veces la misma pregunta.
- `wordFromLookup(result, sentence, { category = 'Conversación', needsReview = false } = {})`.
- El router acepta `#/leer` y `#/leer/<id>` (`resolveRoute` devuelve `'reader'`, y `routeParam(hash)` devuelve el `id` o `null`). La pantalla nueva es `{ id: 'reader', path: 'leer', title: 'Leer' }`.
- `MESSAGES.storyLimit`: «Llegaste al límite de historias de hoy.» / «Puedes leer las que ya tienes; el límite se reinicia a medianoche, hora de Chile.» También `chatMessage('story_limit')`.

- [ ] **Paso 1: pruebas que fallan.**
  - **Reproductor**, con un `synth` falso que permite disparar `onstart`, `onend` y `onerror`: recorre en orden, pausa al terminar la frase, `resume`, `play(3)`, `stop`, velocidad, error único, una sola frase y lista vacía.
  - **Cuestionario:** avanza, puntúa, no deja responder dos veces y da el resultado.
  - **`textFromStory`:** el resultado pasa `validateText`.
  - **`wordFromLookup`:** con las opciones de lectura da `category: 'Lectura'` y `needsReview: true`; sin opciones, igual que antes.
  - **Router:** `#/leer/abc` → `'reader'` con `id` `'abc'`; `#/leer` → `'reader'` sin `id`; las demás rutas siguen igual.
  - **`sendStory`:** `story_limit` y JSON roto.
  - **Mensajes:** el texto exacto de `storyLimit`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** pruebas (incluida la precarga) y linter. Commit `feat: lógica de historias, reproductor por frases y cuestionario`.

### Task 6: Pantalla «Leer» (frontend-design + DESIGN.md)
**Files:**
- Create: `js/screens/reader.js`.
- Modify: `js/screens/word-card.js` (`refresh(root)`), `js/screens/chat.js` (llama a `refresh` con su registro), `js/app.js`, `index.html`, `css/styles.css`, `sw.js` (`js/screens/reader.js`), `DESIGN.md`, `README.md`, `tests/index-html.test.js`.

**Consumes:** todo lo de las Tareas 1 y 5, `initWordCard` (con `refresh(root)`), `playFrench`/`loadVoices`/`pickFrenchVoice`, y `beforeSpeak` y la parada del micrófono de la Etapa 9.

**Produces:** `initReader({ textStore, wordCard, fetch, isOnline, hostname, getCode, synth, onBeforeSpeak })` → `{ onShow(id), onHide() }`.

**Textos exactos:**
- Biblioteca vacía: «Aquí verás tus lecturas. Pide a Claude una historia a tu nivel.»
- Botones: «Nueva historia», «Escribir historia», «Escuchar», «Seguir», «Pausa», «Más lento», «Normal», «Marcar como leída», «Leída», «Aprobar», «Descartar», «Borrar historia», «¿Lo entendiste? Responder 4 preguntas», «Comprobar», «Siguiente», «Volver a intentar».
- Botón de cada frase: «▶», con nombre accesible «Leer desde esta frase».
- Mientras se genera: «Escribiendo…».
- Marca y aviso: «REVISAR» y «Esta historia aún no está revisada.».
- Ventana «Nueva historia»: «Nivel», «Tema (opcional)» y «Preguntas en:», con «Español» y «Francés».
- Respuestas del cuestionario: «Correcto.», «No es correcta. La respuesta es: …» y «Resultado: X de 4».
- Confirmación de borrar: «¿Borrar esta historia? No se puede deshacer.», con «Borrar» y «Cancelar».

- [ ] **Paso 1: barra con 7 botones.** Usar la skill **frontend-design** con DESIGN.md: elegir el color de línea de «Leer» (comprobar su contraste y agregar su prueba en `styles.test.js`). Medir la barra **a 360 px con 7 botones**.
  - **Si algún botón queda con menos de 44 px de ancho, o alguna etiqueta se corta, DETENTE**: informa NEEDS_CONTEXT con 2 o 3 alternativas, cada una con su boceto. El usuario decide.
- [ ] **Paso 2: pruebas que fallan** (`index-html.test.js`):
  - el enlace «Leer» en la navegación (`#/leer`);
  - la sección `screen-reader` con su título enfocable;
  - la ventana «Nueva historia» con sus campos etiquetados y el radio de idioma con «Español» marcado;
  - los botones con su texto exacto;
  - la zona de estado con `role="status"`;
  - la ventana de confirmar borrar.
- [ ] **Paso 3: implementar.**
  - **Biblioteca:** título, nivel, «REVISAR», «Leída» y «Preguntas: X/4».
  - **Nueva historia:**
    - recuerda el último `quizLang` en `localStorage` (`app-frances-reader`);
    - `sendStory` → `addText` → abre `#/leer/<id>`;
    - los errores van con `chatMessage`.
  - **Lector:**
    - frases con el botón «▶» y las palabras como botones (`tokenize`) que abren la tarjeta;
    - el reproductor resalta la frase con una clase y `aria-current="true"`;
    - se detiene con `onHide`, con `visibilitychange` a oculto, al abrir la tarjeta y cuando empieza el micrófono.
  - **Cuestionario:** se muestra debajo del texto; resalta la frase `evidence`; al terminar guarda con `saveQuizResult`.
  - **Al guardar palabras desde el lector:** `{ category: 'Lectura', needsReview: status === 'review' }`.
  - **Tarjeta:** `refresh(root)` subraya dentro del contenedor que se le pasa (`#chat-log` o el lector).
  - **README:** sección «Leer».
- [ ] **Paso 4:** `npm test` (incluidas seguridad y precarga) y `npm run lint` pasan. Recorrido con un servidor falso en `127.0.0.1:8787` (`/story`, `/lookup` y `/chat` con respuestas fijas) y un `speechSynthesis` falso, a 360 y 1280 px, en modo claro y oscuro:
  - crear una historia;
  - REVISAR → Aprobar;
  - escuchar, pausar, seguir y leer desde una frase;
  - salir de la pantalla y comprobar que la voz se detiene;
  - tocar una palabra y guardarla (queda «Lectura» con revisar);
  - el cuestionario completo con el resultado guardado;
  - borrar con confirmación;
  - el botón atrás vuelve a la biblioteca;
  - sin conexión: la historia guardada se lee y «Nueva historia» avisa.

  Commit `feat: pantalla Leer con lector y cuestionario`.

### Task 7: Prueba real, publicación y teléfono (el controlador, con el usuario)
- [ ] **Paso 1 (con permiso):** `cd server && node eval/compare-story.mjs`, que cuesta menos de un centavo.
  - El controlador revisa a mano el francés de las 3 historias y sus preguntas, y marca las dudas con REVISAR.
  - Si no se cumple el criterio, se ajustan las instrucciones y se repite, hasta 3 veces; después se consulta al usuario.
- [ ] **Paso 2 (con confirmación):** `npm run deploy --prefix server`. Comprobar `/story` sin código: debe responder 401.
- [ ] **Paso 3 (con confirmación):** push de la rama y PR a `main`. Tras el merge, comprobar que Pages sirve `v20`.
- [ ] **Paso 4: prueba del usuario en el teléfono.**
  - Crear una historia, escucharla y pausarla.
  - Tocar y guardar palabras.
  - Hacer el cuestionario en los dos idiomas.
  - Aprobar.
  - Volver atrás.
  - Usar el modo avión.
- [ ] **Paso 5:** informe de cierre con la lista de decisiones tomadas.
