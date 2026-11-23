# Etapa 6 — Contenido inicial A1: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mazo opcional de 100 palabras A1 nuevas (`data/a1-deck.json`), con su documento de revisión, comprobado automáticamente y que se añade desde Vocabulario con la importación de la Etapa 2.
**Architecture:** Un archivo JSON con el formato de exportación de la app; pruebas de contenido que lo leen con `readImport`/`planImport` de `js/lib/transfer.js`; `js/lib/deck.js` lo descarga (desde la caché sin conexión) y `js/screens/vocabulary.js` reutiliza la ventana de importar.
**Tech Stack:** JS (módulos) sin dependencias nuevas, `fetch`, service worker, `node --test`, ESLint.
**Spec:** `docs/superpowers/specs/2026-11-23-etapa-6-contenido-design.md` (reglas 1–12 y 7b) + `DESIGN.md`

## Global Constraints
- **TDD estricto:** las pruebas de cada tarea se escriben primero, se ven fallar y solo entonces se escribe el contenido o el código. Nunca se debilita una prueba para que pase.
- Francés correcto y natural (acentos, género, concordancia); español de Chile con «tú» y «ustedes». **Toda duda → `needsReview: true` + motivo en la lista REVISAR.** No adivinar.
- El contenido **no se declara validado**: el documento y el informe dicen «Pendiente de revisión del usuario».
- No se toca `js/data/initial-words.js` ni la carga automática de las 60.
- Sin dependencias nuevas; texto con `textContent`; textos visibles en español; código y nombres de archivo en inglés; comentarios breves en español.
- `sw.js`: `CACHE_VERSION = 'v12'` y `data/a1-deck.json` en `PRECACHE_URLS` (Tarea 3).

## Review Focus
1. Tocar dos veces seguidas «Añadir 100 palabras A1» → una sola ventana y una sola importación (el botón se desactiva mientras carga; Tarea 3, recorrido en navegador).
2. Sin conexión tras la primera carga → el botón funciona desde la caché (Tarea 3, recorrido con el servidor apagado).
3. Tras importar, las entradas con REVISAR muestran la etiqueta «Revisar» en Vocabulario y «Números» y «Lugares» aparecen en el filtro de categoría (Tarea 3, recorrido).
4. Tras importar, Estudiar sigue mostrando como mucho `newPerDay` nuevas por día (no se inunda con 100) (Tarea 3, recorrido).
5. Importar `data/a1-deck.json` a mano con **Importar** da el mismo resumen que el botón (Tarea 3, recorrido).

---

### Task 1: Plan y publicación de la rama
- [ ] Ya en `etapa-6-contenido` (desde `main` actualizado; diseño en `2870ce9`). Commit `docs: plan de la etapa 6`; `git push -u origin etapa-6-contenido`; Pages a la rama (`gh api -X PUT repos/joakil255/App-frances/pages -f 'source[branch]=etapa-6-contenido' -f 'source[path]=/'`).

### Task 2: Mazo A1 y documento de revisión (TDD de contenido)
**Files:** Create `data/a1-deck.json`, `docs/contenido/a1-deck.md`, `tests/a1-deck.test.js`, `tests/helpers/content-checks.js`.
**Consumes:** `readImport(text, fileName)`, `planImport(rows, existingWords)` de `js/lib/transfer.js`; `duplicateKey`, `normalizeText` de `js/lib/words.js`; `INITIAL_WORDS` de `js/data/initial-words.js`.
**Produces:** `data/a1-deck.json` (100 entradas, claves exactas `fr, es, exampleFr, exampleEs, category, gender, needsReview`) · `docs/contenido/a1-deck.md` · `textProblems(text): string[]` y `exampleWordCount(text): number` en `tests/helpers/content-checks.js`.

- [ ] **Escribir las pruebas.** `tests/helpers/content-checks.js`:
  - `exampleWordCount(text)`: número de trozos separados por espacios con al menos una letra o cifra (`/[\p{L}\p{N}]/u`).
  - `textProblems(text)`: lista de problemas (`'no NFC'` si `text !== text.normalize('NFC')`; `'U+FFFD'`; `'espacios'` si `normalizeText(text) !== text`; `'apóstrofo tipográfico'` si contiene `’` o `‘`).
  - Pruebas de los ayudantes: `exampleWordCount("Qu'est-ce que c'est ?")` → 3; `exampleWordCount('Bonjour, madame !')` → 2; `textProblems('e\u0301te\u0301')` («été» descompuesto) incluye `'no NFC'`; `textProblems('caf\uFFFD')` incluye `'U+FFFD'`; `textProblems(' le  chat')` incluye `'espacios'`; `textProblems('l\u2019ami')` incluye `'apóstrofo tipográfico'`; `textProblems('le café')` → `[]`.

  `tests/a1-deck.test.js` (lee `data/a1-deck.json` como `Buffer`):
  - **UTF-8:** `new TextDecoder('utf-8', { fatal: true }).decode(buffer)` no lanza; sin BOM (los 3 primeros bytes no son `EF BB BF`); `textProblems` vacío para cada campo de texto de cada entrada.
  - **Formato:** `format === 'app-frances-vocabulario'`, `version === 1`, `exportedAt` es una fecha ISO válida, `words` es un array.
  - **Regla 1:** cada entrada tiene exactamente las 7 claves; textos no vacíos; `gender` ∈ `['m', 'f', null]`; `needsReview` booleano.
  - **Regla 2:** `gender` no nulo → `fr` empieza por `le `, `la `, `les ` o `l'`; `le ` → `'m'`, `la ` → `'f'`. `gender` nulo → `fr` no empieza por `le `, `la `, `les `, `l'`, `un `, `une ` ni `des `.
  - **Regla 3:** categoría `Verbos` → `gender` nulo y `fr` termina en `er`, `ir`, `re` u `oir`.
  - **Regla 4:** `exampleWordCount(exampleFr)` entre 3 y 7; `exampleFr` empieza por mayúscula (`/^\p{Lu}/u`) y termina en `.`, `!` o `?`; no contiene `/\S[?!]/` (espacio antes de `?` y `!`); `exampleEs` no vacío.
  - **Regla 6:** ninguna palabra completa de `es` ni de `exampleEs` (en minúsculas, separando por todo lo que no es letra) está en `['vosotros', 'vosotras', 'patata', 'patatas', 'zumo', 'coche', 'coches', 'fresa', 'fresas', 'melocotón', 'aguacate', 'judías', 'piso', 'ordenador', 'móvil', 'gafas']` ni termina en `áis` o `éis`.
  - **Regla 7:** `duplicateKey(fr)` distintos dentro del mazo; ninguno coincide con `duplicateKey` de las 60 de `INITIAL_WORDS`.
  - **Regla 8:** conteo por `category` = `{ Saludos: 12, 'Números': 21, Familia: 12, Comida: 20, Verbos: 20, Lugares: 15 }` y total 100; los números en orden `zéro, un, deux, …, vingt`.
  - **Regla 10:** `readImport(texto, 'a1-deck.json').fatal === null`; `planImport(rows, [])` → `newWords` 100, `duplicates` 0, `invalid` 0; `planImport(rows, INITIAL_WORDS)` → 100, 0, 0.
  - **Reglas 11 y 12 (documento):** `docs/contenido/a1-deck.md` contiene «Pendiente de revisión del usuario»; la tabla «Entradas por categoría» da los mismos números que la regla 8; las filas de las tablas por categoría (`Francés | Español | Género | Ejemplo | Traducción | REVISAR`, género `m`/`f`/`—`, REVISAR `sí` o vacío) coinciden una a una con el JSON; el conjunto de `fr` de la sección «Lista REVISAR» (`Francés | Motivo`, motivo no vacío) es **igual** al de las entradas con `needsReview: true`.
- [ ] `node --test tests/a1-deck.test.js` → **FALLA** (no existe `data/a1-deck.json`); las pruebas de los ayudantes pasan.
- [ ] **Escribir el contenido** de `data/a1-deck.json` categoría por categoría (Saludos, Números 0–20, Familia, Comida, Verbos, Lugares), siguiendo las reglas 2–7b del diseño: vocabulario A1 muy frecuente, frases de 3 a 7 palabras en presente (o `aller + infinitivo`), sin repetir ni variar las 60, parejas masculino/femenino como dos entradas, español de Chile. Marcar `needsReview: true` en cada duda. JSON con sangría de 2 espacios, sin BOM y con salto de línea final; `exportedAt` = fecha de creación.
- [ ] **Escribir `docs/contenido/a1-deck.md`:** estado «Pendiente de revisión del usuario», tabla de entradas por categoría, una tabla por categoría y la «Lista REVISAR» con el motivo concreto de cada duda.
- [ ] `npm test` y `npm run lint` → todo pasa. Releer el contenido completo una vez más buscando errores de francés (acentos, género, concordancia, elisión) y de español de Chile; toda duda nueva → REVISAR. Commit `feat: mazo de 100 palabras A1 y documento de revisión`.

### Task 3: Botón «Añadir 100 palabras A1»
**Files:** Create `js/lib/deck.js`, `tests/deck.test.js`; Modify `js/screens/vocabulary.js`, `index.html`, `sw.js`, `tests/precache.test.js`, `tests/index-html.test.js`, `DESIGN.md`.
**Consumes:** `readImport`, `planImport`; `data/a1-deck.json` (Tarea 2).
**Produces:** `A1_DECK_URL = 'data/a1-deck.json'` · `A1_DECK_NAME = '100 palabras A1'` · `DECK_ERROR = 'No se pudo cargar el mazo. Conéctate a internet una vez y vuelve a intentarlo.'` · `loadDeck(fetchImpl, url = A1_DECK_URL): Promise<{ fatal, rows, ignoredColumns }>`.

- [ ] **Pruebas primero.** `tests/deck.test.js`: `fetchImpl` que lanza → `{ fatal: DECK_ERROR, rows: [], ignoredColumns: [] }`; respuesta `{ ok: false, status: 404 }` → mismo resultado; respuesta `ok` con el texto de `data/a1-deck.json` → mismo resultado que `readImport(texto, 'a1-deck.json')` (100 filas); `loadDeck` llama a `fetchImpl` con `'data/a1-deck.json'`. `tests/index-html.test.js`: dentro de `.vocab-actions` hay `<button type="button" class="button button-secondary" id="vocab-deck">Añadir 100 palabras A1</button>`. `tests/precache.test.js`: la comprobación de completitud incluye la carpeta `data` y la extensión `.json`. **Ver fallar.**
- [ ] Implementar `js/lib/deck.js`. En `vocabulary.js`: clic en `#vocab-deck` → desactivar el botón, `clearNotice()`, `loadDeck(window.fetch.bind(window))`, volver a activarlo; `fatal` → `showNotice('No se pudo añadir el mazo.', fatal)`; si no, `pendingPlan = planImport(rows, store.getWords())` y la misma ventana con título «Revisión de «100 palabras A1»». `showImportSummary` y `runImport` reciben el botón que abrió la ventana para devolverle el foco (Importar o el nuevo). `index.html`: el botón tras Exportar. `sw.js`: `v12` y `data/a1-deck.json`. `DESIGN.md`: en Vocabulario, el botón secundario «Añadir 100 palabras A1» (skill frontend-design para comprobar cómo encaja en la fila de acciones a 320 px y 1280 px).
- [ ] `npm test`, `npm run lint`, `npm start` y `curl -sI` de `data/a1-deck.json` → 200 con `Content-Type: application/json`.
- [ ] Recorrido en navegador (Firefox sin ventana, WebDriver BiDi), con capturas: con las 60 → «100 palabras nuevas para importar», «0 ya existen», «0 filas con errores»; importar → 160 palabras, filtros «Números» y «Lugares», etiquetas «Revisar»; volver a pulsar → «0 nuevas», «100 ya existen»; doble toque (Review Focus 1); sin conexión con el servidor apagado (2); Estudiar muestra como mucho 10 nuevas (4); **Importar** con el archivo a mano da el mismo resumen (5); 320 px y 1280 px; teclado (el foco vuelve al botón al cerrar la ventana). Commit `feat: botón para añadir el mazo A1 en Vocabulario`.

### Task 4: README, informe y cierre
- [ ] README: sección Vocabulario con el mazo (qué trae, cómo añadirlo, que está pendiente de tu revisión, enlace a `docs/contenido/a1-deck.md`), lista de comprobación del celular y estructura (`data/`, `js/lib/deck.js`, `docs/contenido/`).
- [ ] Commit, push, esperar Pages y comprobar `data/a1-deck.json` → 200; releer `git diff main`; revisión final de la rama; informe de `CLAUDE.md` con entradas por categoría y la lista REVISAR completa, sin declarar el contenido validado.
