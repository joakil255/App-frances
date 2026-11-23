# Etapa 2 — Vocabulario: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lista de palabras editable con búsqueda, voz, lista inicial e importar/exportar JSON y CSV, guardada en el teléfono.
**Architecture:** Lógica pura en `js/lib/` (probada con `node --test`), capa de datos asíncrona sobre `localStorage` inyectable, interfaz en `js/screens/vocabulary.js` con `<dialog>`.
**Tech Stack:** JS (módulos) sin dependencias nuevas, `localStorage`, `speechSynthesis`, `node --test`, ESLint.
**Spec:** `docs/superpowers/specs/2026-11-23-etapa-2-vocabulario-design.md` (+ `DESIGN.md`, sección Etapa 2)

## Global Constraints
- Sin dependencias npm nuevas. Texto del usuario siempre con `textContent`/`value`; nunca `innerHTML`, `outerHTML`, `insertAdjacentHTML` ni `document.write`.
- Textos visibles en español; código en inglés; comentarios breves en español. Francés correcto; lo dudoso con `needsReview: true`.
- Todo color, letra y medida de la interfaz sale de `DESIGN.md`.
- `sw.js`: `CACHE_VERSION = 'v3'` y cada archivo nuevo en `PRECACHE_URLS` (la prueba de completitud lo exige).
- Commits con el email noreply ya configurado; mensajes en español.

## Review Focus
1. Un CSV editado en Excel en español (separador `;`, BOM, `\r\n`, comillas en campos) → se importa bien (Tarea 3).
2. Un CSV guardado como «CSV» de Windows (no UTF-8: aparecen `�`) → se rechaza con un mensaje que dice cómo arreglarlo, sin importar texto roto (Tarea 4).
3. El navegador no deja guardar (cuota llena o modo privado) → avisa y la lista que ves sigue igual a lo guardado (Tarea 5).
4. Editar una palabra cambiando solo mayúsculas («Le chat» → «le chat») → no la marca como duplicada de sí misma (Tarea 2).
5. Una celda que empieza por `=`, `+`, `-` o `@` → se exporta neutralizada y la ida y vuelta la deja igual (Tarea 4).

---

### Task 1: Rama, documentos y Pages
- [ ] `git checkout -b etapa-2-vocabulario` desde `main` actualizado; commit `docs: diseño, DESIGN.md y plan de la etapa 2`; `git push -u origin etapa-2-vocabulario`.
- [ ] Pages a la rama: `gh api -X PUT repos/joakil255/App-frances/pages -f 'source[branch]=etapa-2-vocabulario' -f 'source[path]=/'`.

### Task 2: Reglas de palabras (TDD)
**Files:** Create `js/lib/words.js`; Test `tests/words.test.js`.
**Interfaces — Produces:**
- `normalizeText(value: unknown): string` — `String(value ?? '')`, NFC, `trim`, espacios repetidos → uno.
- `validateWord(input, existingWords = [], ownId = null): { ok: boolean, errors: Record<string,string>, word }` — `word` = `{ fr, es, exampleFr, exampleEs, category, gender: 'm'|'f'|null, needsReview: boolean }` normalizado (`gender` `''`/`null` → `null`). Claves de error: `fr`, `es`, `exampleFr`, `exampleEs`, `gender`, `category`. Textos exactos: «Escribe la palabra en francés.» · «Escribe la traducción al español.» · «Máximo 200 caracteres.» · «Falta la traducción del ejemplo.» · «Falta el ejemplo en francés.» · «El género debe ser masculino, femenino o sin género.» · «Con género, escribe el artículo: le, la, l', les, un, une o des.» · `«${art}» es ${'femenino'|'masculino'}: cambia el género o el artículo.` · `«${fr}» ya está en tu lista.` (duplicada contra `existingWords`, ignorando la de `ownId`).
- `duplicateKey(fr): string` (normalizar, minúsculas, `’`→`'`; acentos se conservan) · `searchKey(text): string` (sin diacríticos, minúsculas, `’`→`'`) · `sortWords(words): Word[]` (francés sin artículo inicial, `localeCompare(…, 'fr', { sensitivity: 'base' })`) · `filterWords(words, { query = '', category = 'all', gender = 'all' }): Word[]` ordenado (`category`: `'all'`, `''` = sin categoría, o el nombre; `gender`: `'all'|'m'|'f'|'none'`) · `categoriesOf(words): string[]` (únicas, ordenadas, sin `''`).
- [ ] Pruebas: obligatorios vacíos y solo espacios; 200 vs 201 caracteres; ejemplo a medias en los dos sentidos; género sin artículo; `la`+m y `le`+f fallan; `l'`, `l’`, `les`, `des` valen con cualquier género; sin género no exige artículo; NFC (`é` compuesta = descompuesta); duplicada por mayúsculas/espacios/`’`; `a` ≠ `à`; editar la propia palabra cambiando mayúsculas no es duplicada; `searchKey('Être')` = `'etre'`; `filterWords` encuentra «être», «fenêtre», «tête» con `'etre'` y busca también en español; filtros de categoría (incluida sin categoría) y género; orden «l'eau» < «la maison» < «le pain»; 1.000 palabras filtradas en < 50 ms.
- [ ] `npm test` → FALLA; implementar; → pasa; commit `feat: reglas de validación, búsqueda y orden de palabras`.

### Task 3: CSV (TDD)
**Files:** Create `js/lib/csv.js`; Test `tests/csv.test.js`.
**Interfaces — Produces:** `parseCsv(text): { delimiter: ','|';', records: Array<{ line: number, fields: string[] }> }` (quita BOM; separador por la primera línea fuera de comillas, empate → `,`; `line` = línea donde empieza el registro, desde 1; lanza `CsvError` con `line` si unas comillas no se cierran) · `toCsv(rows: string[][]): string` (BOM, `,`, `\r\n` tras cada fila, comillas si el campo tiene `,` `;` `"` `\r` `\n`, `"` → `""`) · `class CsvError extends Error { line }`.
- [ ] Pruebas: campos simples; comillas con `,` y `;` dentro; `""`; salto de línea dentro de un campo (y `line` del registro siguiente correcto); `\r\n` y `\n`; BOM; detección de `;`; campo vacío final (`a,b,`); comillas sin cerrar → `CsvError` con su línea; acentos y emoji intactos; `parseCsv(toCsv(rows))` devuelve `rows`.
- [ ] FALLA → implementar → pasa; commit `feat: lector y escritor de CSV`.

### Task 4: Importar y exportar (TDD)
**Files:** Create `js/lib/transfer.js`; Test `tests/transfer.test.js`.
**Interfaces — Consumes:** `validateWord`, `duplicateKey` (T2); `parseCsv`, `toCsv`, `CsvError` (T3). **Produces:**
- `MAX_IMPORT_BYTES = 2 * 1024 * 1024`; `CSV_COLUMNS = ['frances','espanol','ejemplo_frances','ejemplo_espanol','categoria','genero','revisar']`.
- `exportJson(words, now: Date): string` · `exportCsv(words): string` (prefijo `'` en celdas que empiezan por `=`,`+`,`-`,`@`) · `exportFileName(kind: 'json'|'csv', now: Date): string` (`vocabulario-AAAA-MM-DD.<kind>`, fecha local).
- `readImport(text: string, fileName: string): { fatal: string|null, rows: Array<{ row: number, input: object }>, ignoredColumns: string[] }` — `input` con claves del modelo; `row` = línea en CSV, posición (desde 1) en JSON; filas vacías saltadas; `'` de neutralización quitado.
- `planImport(rows, existingWords): { newWords: Array<{ row, word }>, duplicates: Array<{ row, word, existingId }>, invalid: Array<{ row, reasons: string[] }> }`.
- Mensajes fatales exactos: «Solo se pueden importar archivos .json o .csv.» · «El archivo está vacío.» · «El archivo no tiene palabras.» · «El archivo no está en UTF-8. Guárdalo como «CSV UTF-8» y vuelve a intentarlo.» · `Faltan las columnas: ${lista}.` · «El archivo JSON no se puede leer.» · «Este JSON no es una exportación de la app.» · `Hay unas comillas sin cerrar en la línea ${n}.` Motivos de fila extra: «El género debe ser m, f o estar vacío.» · «La columna revisar debe ser sí, no o estar vacía.» · `Repite la fila ${n}.`
- [ ] Pruebas: cada mensaje fatal (vacío, solo espacios, solo cabecera, sin `frances`/`espanol`, `�`, extensión `.txt`, JSON roto, JSON con otro `format`); cabeceras `Francés`/`ESPAÑOL` y en otro orden; columna desconocida en `ignoredColumns`; `genero` `masculino`/`F`; `revisar` `sí`/`0`/`quizá`; fila inválida con motivos; duplicada contra la lista; repetida dentro del archivo; ida y vuelta JSON y CSV de 1.000 palabras con `«»`, `œ`, `ç`, `"`, `,`, `;`, saltos de línea y `=SUMA(1)` → mismas palabras; `planImport` de 1.000 filas en < 1 s; CSV de Excel con `;` y BOM importado.
- [ ] FALLA → implementar → pasa; commit `feat: importar y exportar vocabulario en JSON y CSV`.

### Task 5: Lista inicial y capa de datos (TDD)
**Files:** Create `js/data/initial-words.js`, `js/lib/storage.js`; Test `tests/initial-words.test.js`, `tests/storage.test.js`.
**Interfaces — Produces:** `INITIAL_WORDS: Array<{ id: 'seed-…', fr, es, exampleFr, exampleEs, category, gender, needsReview }>` · `STORAGE_KEY = 'app-frances'` · `class StorageError extends Error { code: 'quota'|'unavailable' }` · `createWordStore(backend, { initialWords, makeId = () => crypto.randomUUID(), now = () => new Date() })` → `{ load(): Promise<{ words, corruptBackupKey: string|null }>, saveWord(input, id = null): Promise<{ ok: true, word } | { ok: false, errors }>, deleteWord(id): Promise<void>, applyImport(plan, { replaceDuplicates }): Promise<{ added, replaced }> }`. Documento guardado: `{ schemaVersion: 1, words }`.
- [ ] Pruebas de la lista: 60 palabras, 10 por categoría (Saludos, Familia, Casa, Comida, Tiempo, Verbos); cada una pasa `validateWord`; ids únicos con prefijo `seed-`; sin duplicadas; Saludos y Verbos sin género.
- [ ] Pruebas de la capa (con un `localStorage` falso en memoria): primera carga siembra la lista; segunda carga no vuelve a sembrar aunque esté vacía; JSON dañado → copia en `app-frances-corrupt-<ISO>`, lista vacía y `corruptBackupKey`; `saveWord` crea (id, fechas), edita (conserva `id` y `createdAt`) y rechaza inválidas sin guardar; `deleteWord`; `applyImport` añade nuevas y, con `replaceDuplicates`, reemplaza conservando `id` y `createdAt`; `setItem` que lanza `QuotaExceededError` → `StorageError('quota')` y `load()` posterior devuelve lo anterior.
- [ ] Escribir la lista (francés A1 natural, artículos, frases cortas; dudas con `needsReview: true`). FALLA → implementar → pasa; commit `feat: lista inicial y capa de datos`.

### Task 6: Voz y regla de seguridad (TDD)
**Files:** Create `js/lib/speech.js`; Test `tests/speech.test.js`, `tests/security.test.js`.
**Interfaces — Produces:** `RATES = { normal: 1, slow: 0.6 }` · `pickFrenchVoice(voices): { voice, exact: boolean } | null` · `loadVoices(synth, timeoutMs = 2000): Promise<SpeechSynthesisVoice[]>` · `speak(synth, voice, text, rate): void` (cancela lo anterior; `lang = voice.lang` o `'fr-FR'`).
- [ ] Pruebas: prefiere `fr-FR` local sobre `fr-FR` remota y sobre `fr-CA`; acepta `fr_FR`; solo `fr-CA` → `exact: false`; ninguna francesa → `null`; `loadVoices` resuelve con `voiceschanged` y con lista vacía tras el tiempo; `speak` llama `cancel` y luego `speak` con texto, velocidad y voz. Seguridad: ningún `.js` de `js/` ni `sw.js` contiene `innerHTML`, `outerHTML`, `insertAdjacentHTML` o `document.write`.
- [ ] FALLA → implementar → pasa; commit `feat: voz francesa y regla de seguridad`.

### Task 7: Pantalla Vocabulario
**Files:** Create `js/screens/vocabulary.js`; Modify `index.html`, `css/styles.css`, `js/app.js`, `sw.js`; Test `tests/index-html.test.js`.
**Interfaces — Consumes:** todo lo anterior. **Produces:** `initVocabulary({ store, synth })` llamado desde `app.js`.
- [ ] Pruebas del HTML primero: en `#screen-vocabulary` existen buscador `type="search"` con `<label>`, filtros `#vocab-category` y `#vocab-gender` con etiqueta, botones Añadir/Importar/Exportar, `<input type="file" accept=".json,.csv">`, contador `role="status"`, `<ul id="vocab-list">`, y los `<dialog>` `#word-detail`, `#word-form` (con `fieldset` de género con tres `radio`), `#confirm-delete`, `#import-summary`, `#confirm-replace`. FALLA.
- [ ] Implementar según el diseño y `DESIGN.md` (fila opción B, ficha, formulario con errores por campo, confirmaciones, resumen, avisos de voz, de datos dañados y de guardado). Antes de leer un archivo, si `file.size > MAX_IMPORT_BYTES` → aviso «El archivo pasa de 2 MB.»; se lee con `file.text()`. `sw.js`: `v3` y archivos nuevos.
- [ ] `npm test` y `npm run lint` pasan; `npm start` + `curl` de los archivos nuevos → 200. Commit `feat: pantalla Vocabulario`.

### Task 8: README, publicación y cierre
- [ ] README: sección Vocabulario (formatos CSV/JSON, abrir el CSV en Excel en español, exportar como copia de seguridad) y **lista de comprobación manual para el celular** (la del diseño).
- [ ] Commit `docs: vocabulario y comprobación en el celular`; push; esperar Pages (`built`) y comprobar archivos nuevos → 200.
- [ ] Pedir al usuario PageSpeed (pagespeed.web.dev) y la comprobación en el celular; releer `git diff main`; informe de `CLAUDE.md`.
