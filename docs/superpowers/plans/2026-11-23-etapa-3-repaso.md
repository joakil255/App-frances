# Etapa 3 — Flashcards con repetición espaciada: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla Estudiar con cola diaria y programador SM-2 simplificado + Leitner (elegibles), historial de repasos y ajustes, guardado en el teléfono.
**Architecture:** Funciones puras en `js/lib/dates.js`, `scheduler.js`, `queue.js`; almacén propio `js/lib/study-storage.js` (clave `app-frances-study`); interfaz en `js/screens/study.js`.
**Tech Stack:** JS (módulos) sin dependencias nuevas, `localStorage`, `speechSynthesis`, `node --test`, ESLint.
**Spec:** `docs/superpowers/specs/2026-11-23-etapa-3-repaso-design.md` (tabla de casos S, L, D, Q) + `DESIGN.md` (sección Etapa 3)

## Global Constraints
- **TDD estricto:** en cada tarea de lógica se escriben **todas** sus pruebas (los casos de la tabla del diseño, con sus valores exactos), se ven fallar, y solo entonces se escribe el código.
- Los módulos de `js/lib/` no usan DOM, `localStorage` ni `Date.now()`: reciben `today`/`now` como parámetros.
- Sin dependencias nuevas; texto del usuario con `textContent`; textos visibles en español; código en inglés.
- `sw.js`: `CACHE_VERSION = 'v7'` y cada archivo nuevo en `PRECACHE_URLS` en su propia tarea (la prueba de completitud lo exige).

## Review Focus
1. Sesión empezada antes de medianoche y respondida después → la cola usa el nuevo «hoy» (vuelven a entrar nuevas) (Tarea 5, Q4).
2. Editar el francés de una palabra → sus dos tarjetas conservan el progreso (se enlazan por `wordId`) (Tarea 5, Q10).
3. Ajustes con `newPerDay` `'7.5'`, `'-1'`, `''`, `'101'` → rechazados con el mensaje del diseño (Tarea 6).
4. Cuota llena al responder → aviso y la tarjeta no avanza ni en memoria ni guardada (Tarea 6).
5. Cerrar y reabrir la app a mitad de la sesión → misma cola restante, sin nuevas extra (Tarea 6).

---

### Task 1: Rama, documentos y Pages
- [ ] `git checkout -b etapa-3-repaso` desde `main` actualizado; commit `docs: diseño, DESIGN.md y plan de la etapa 3`; `git push -u origin etapa-3-repaso`; Pages a la rama (`gh api -X PUT …/pages -f 'source[branch]=etapa-3-repaso' -f 'source[path]=/'`).

### Task 2: Fechas (TDD)
**Files:** Create `js/lib/dates.js`; Test `tests/dates.test.js`.
**Produces:** `localDate(now: Date): string` (`AAAA-MM-DD` local) · `addDays(date: string, days: number): string` · `daysBetween(from: string, to: string): number`.
- [ ] Pruebas: D1 (`new Date(2026, 10, 23, 23, 59)` → `'2026-11-23'`; `new Date(2026, 10, 24, 0, 0)` → `'2026-11-24'`); D2 (`addDays('2026-10-24', 2)` → `'2026-10-26'`); fin de mes y de año (`'2026-11-30'`+1, `'2026-12-31'`+1); bisiesto (`'2028-02-28'`+1 → `'2028-02-29'`); `daysBetween('2026-10-01', '2026-11-23')` = 53; negativo (`daysBetween('2026-11-24', '2026-11-23')` = −1); 0 consigo misma.
- [ ] FALLA → implementar con `Date.UTC` → pasa; commit `feat: fechas locales para el repaso`.

### Task 3: SM-2 simplificado (TDD)
**Files:** Create `js/lib/scheduler.js`; Test `tests/scheduler-sm2.test.js`.
**Consumes:** `addDays`, `daysBetween`. **Produces:** `ANSWERS = ['again','hard','good','easy']` · `NEW_SM2 = { reps: 0, interval: 0, ease: 2.5, lapses: 0, due: null }` · `nextSm2(state, answer, today): state` (no muta; respuesta desconocida → `Error('Respuesta desconocida: <x>')`).
- [ ] Escribir S1–S16 de la tabla del diseño como pruebas (estado completo esperado, incluido `due`), más: respuesta desconocida lanza error; el estado recibido no cambia. **Ver fallar todas.**
- [ ] Implementar exactamente las reglas del diseño (facilidad redondeada a 2 decimales y acotada a [1,3; 3,0]; `Math.round`; mínimo `interval + 1`, máximo 365; bonificación de atraso solo en Bien/Fácil). → pasan; commit `feat: algoritmo SM-2 simplificado`.

### Task 4: Leitner, `review` y `previewDays` (TDD)
**Files:** Modify `js/lib/scheduler.js`; Test `tests/scheduler-leitner.test.js`.
**Produces:** `NEW_LEITNER = { box: 0, due: null }` · `LEITNER_DAYS = [1, 2, 4, 8, 16]` · `nextLeitner(state, answer, today): state` · `cardIdOf(wordId, direction): string` (`'<wordId>:<direction>'`) · `newCard(wordId, direction): Card` (`id = cardIdOf(...)`, `introducedOn: null`, `lastReviewedAt: null`, `sm2: NEW_SM2`, `leitner: NEW_LEITNER`) · `review(card, answer, today, nowIso): Card` (aplica los dos; `introducedOn` = `today` si era `null`; `lastReviewedAt = nowIso`; no muta) · `previewDays(card, algorithm, today): { again, hard, good, easy }` (días hasta `due`; 0 = hoy) · `dueOf(card, algorithm): string|null`.
- [ ] Pruebas: L1–L7; `review` de una tarjeta nueva actualiza `sm2` **y** `leitner` y fija `introducedOn`; repasarla otro día no cambia `introducedOn`; `review` no muta; `previewDays` para cada algoritmo coincide con `daysBetween(today, review(...).due)` de cada respuesta; `dueOf`. FALLA.
- [ ] Implementar → pasan; commit `feat: Leitner y repaso con los dos algoritmos`.

### Task 5: Cola diaria (TDD)
**Files:** Create `js/lib/queue.js`; Test `tests/queue.test.js`.
**Consumes:** `dueOf`, `cardIdOf`. **Produces:** `buildQueue({ words, cards, settings, today }): Array<{ cardId, wordId, direction, isNew }>` · `countDueOn({ words, cards, settings, date }): number` (repasos —no nuevas— con `due <= date`).
- [ ] Pruebas Q1–Q9 del diseño, más Q10: palabra con `fr` editado (mismo `id`) conserva su tarjeta y su `due`; orden por `due` y luego `lastReviewedAt`; nuevas en el orden de `words`; `countDueOn` para «mañana». FALLA → implementar → pasan; commit `feat: cola diaria de repaso`.

### Task 6: Almacén del estudio (TDD)
**Files:** Create `js/lib/study-storage.js`; Test `tests/study-storage.test.js`.
**Consumes:** `StorageError` de `js/lib/storage.js`; `buildQueue`, `review` (solo en la prueba de reabrir). **Produces:** `STUDY_KEY = 'app-frances-study'` · `DEFAULT_SETTINGS = { algorithm: 'sm2', direction: 'fr-es', newPerDay: 10 }` · `validateSettings(input): { ok, errors, settings }` (error de `newPerDay`: «Escribe un número entero entre 0 y 100.»; `algorithm`/`direction` fuera de los valores → error) · `createStudyStore(backend, { now })` → `{ load(): Promise<{ cards, history, settings, corruptBackupKey }>, getState(): { cards, history, settings }, recordReview(card, entry): Promise<void>, saveSettings(input): Promise<{ ok, errors? }>, watchExternalChanges(target, onChange) }`.
- [ ] Pruebas: primera carga → estado vacío con `DEFAULT_SETTINGS` (y se guarda); `recordReview` guarda tarjeta + entrada en **una** llamada a `setItem`; `saveSettings` válido e inválidos (`'7.5'`, `'-1'`, `''`, `'101'`, algoritmo `'x'`); datos dañados → copia `app-frances-study-corrupt-<ISO>`; cuota → `StorageError('quota')` y `getState()` sin cambios; `watchExternalChanges`; **reabrir**: repasar 3 de 5 tarjetas con `review`, crear otro almacén sobre el mismo `backend`, `load()` → mismas tarjetas, historial (3 entradas con `date`, `answer`, `algorithm`) y ajustes, y `buildQueue` da la misma cola restante sin nuevas extra. FALLA → implementar → pasan; commit `feat: almacén del estudio con historial y ajustes`.

### Task 7: Pantalla Estudiar
**Files:** Create `js/screens/study.js`, `js/screens/voice.js`; Modify `index.html`, `css/styles.css`, `js/app.js`, `js/screens/vocabulary.js`, `sw.js`; Test `tests/index-html.test.js`.
**Produces:** `playFrench({ synth, text, rate, notice })` en `voice.js` (elige voz, avisa sin voz o si el motor falla; los textos de aviso de la Etapa 2 se mueven aquí y `vocabulary.js` lo usa) · `initStudy({ wordStore, studyStore, synth, now })`.
- [ ] Pruebas del HTML primero: en `#screen-study` existen el resumen (`#study-due`, `#study-new`, `#study-start`, `#study-settings-open`), la tarjeta (`#study-card` con `#study-front`, `#study-back` y botón de altavoz), `#study-reveal`, cuatro botones `[data-answer="again|hard|good|easy"]`, el fin (`#study-done`), un aviso `role="alert"` y `<dialog id="study-settings">` con radios de dirección y algoritmo (con `fieldset`/`legend`) y `<input type="number" id="settings-new-per-day" min="0" max="100">` con etiqueta. FALLA.
- [ ] Implementar según el diseño y `DESIGN.md` (opción A; intervalos con `previewDays`; cola recalculada tras cada respuesta con `localDate(now())`; resumen refrescado al entrar en `#/estudiar`; atajos `Espacio`/`Intro`, `1`–`4`, `O` con las condiciones del diseño; sin palabras → mensaje). `app.js`: `initStudy` tras cargar las palabras. `sw.js` `v7`.
- [ ] `npm test` y `npm run lint` pasan; `curl` de los archivos nuevos → 200. Commit `feat: pantalla Estudiar`.

### Task 8: README, publicación y cierre
- [ ] README: sección Estudiar (algoritmos en palabras sencillas, «hoy», ajustes, atajos) y lista de comprobación del celular y del computador (recorrido, Otra vez vuelve hoy, cerrar y reabrir a mitad, cambio de dirección y de algoritmo, límite de nuevas, atajos, modo avión).
- [ ] Commit, push, esperar Pages y comprobar archivos → 200; pedir PageSpeed y la prueba en el celular; releer `git diff main`; revisión final; informe de `CLAUDE.md`.
