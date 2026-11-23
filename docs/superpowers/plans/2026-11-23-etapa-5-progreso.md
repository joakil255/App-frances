# Etapa 5 — Progreso: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla Progreso con racha diaria, respuestas por día (14 días, SVG propio), acierto de Estudiar y Quiz (30 días) y palabras nuevas / en aprendizaje / dominadas con la lista de dominadas.
**Architecture:** Funciones puras en `js/lib/stats.js` que leen el historial y las tarjetas que ya guarda `js/lib/study-storage.js`; interfaz en `js/screens/progress.js`, que recalcula todo al mostrarse. Sin datos nuevos guardados.
**Tech Stack:** JS (módulos) sin dependencias nuevas, SVG creado con `createElementNS`, `localStorage`, `node --test`, ESLint.
**Spec:** `docs/superpowers/specs/2026-11-23-etapa-5-progreso-design.md` (definiciones 1–8, tablas P, M y W) + `DESIGN.md`

## Global Constraints
- **TDD estricto:** en cada tarea se escriben **todas** sus pruebas con los valores exactos de abajo, se ven fallar y solo entonces se escribe el código. Nunca se debilita una prueba para que pase.
- `js/lib/stats.js` no usa DOM, `localStorage` ni `new Date()`/`Date.now()`: recibe `today` (`'AAAA-MM-DD'`) como parámetro. Las fechas se calculan solo con `addDays` y `daysBetween` de `js/lib/dates.js`.
- Se usa la `date` guardada en cada entrada; **nunca** se recalcula desde `at`. Entrada sin `kind` = Estudiar; `kind: 'quiz'` = Quiz.
- Sin dependencias nuevas; todo texto con `textContent` (nunca `innerHTML`); textos visibles en español; código en inglés; comentarios breves en español.
- `sw.js`: `CACHE_VERSION = 'v10'` (Tarea 2) y cada archivo nuevo en `PRECACHE_URLS` en su propia tarea (la prueba de completitud lo exige).
- Progreso **no escribe** nada en los almacenes.

## Review Focus
1. Responder en Estudiar o Quiz y pasar a Progreso en la misma pestaña → los números ya incluyen esas respuestas (se recalcula en `hashchange`; Tarea 4, recorrido en navegador).
2. Dejar la app abierta pasada la medianoche y volver a Progreso → «hoy» es el nuevo día (se usa `now()` en cada cálculo, nunca una fecha guardada al iniciar; Tarea 4: en el recorrido se adelanta `Date` un día desde la consola de la página y se vuelve a entrar en Progreso).
3. Pantalla de 320 px con días de 3 cifras (p. ej. 120 respuestas) → los números y las letras del eje no se solapan y no hay desplazamiento horizontal (Tarea 4, recorrido a 320 px).
4. Una palabra dominada con `<b>` o `&amp;` en su texto → se ve tal cual en la lista (Tarea 4: `tests/security.test.js` ya prohíbe `innerHTML`; se añade al recorrido).
5. Borrar en Vocabulario una palabra dominada y volver a Progreso → desaparece de la lista y del conteo, y la suma sigue igual al total (W5 en la Tarea 3; recorrido en la Tarea 4).

---

### Task 1: Plan y publicación de la rama
- [ ] Ya en la rama `etapa-5-progreso` (creada desde `main` actualizado, diseño ya confirmado en `b2f093c`). Commit `docs: plan de la etapa 5` (este plan); `git push -u origin etapa-5-progreso`; Pages a la rama, como en etapas anteriores (`gh api -X PUT repos/joakil255/App-frances/pages -f 'source[branch]=etapa-5-progreso' -f 'source[path]=/'`).

### Task 2: Estadísticas del historial (TDD)
**Files:** Create `js/lib/stats.js`; Test `tests/stats.test.js`; Modify `sw.js` (`v10`, `js/lib/stats.js` en `PRECACHE_URLS`), `tests/sw.test.js` si fija la versión.
**Consumes:** `addDays(date, n)`, `daysBetween(from, to)` de `js/lib/dates.js`.
**Produces:**
- `PROGRESS_DAYS = 14` · `ACCURACY_DAYS = 30` · `MASTERED_DAYS = 14`
- `studiedDates(history): string[]`: fechas válidas distintas, de más antigua a más reciente.
- `anchorDate(history, today): string`: `max(today, última fecha válida)` con tope `addDays(today, 1)`.
- `streak(history, today): { days: number, studiedToday: boolean }`
- `dailyCounts(history, today, days = PROGRESS_DAYS): Array<{ date: string, count: number }>`: ancla − (days − 1) … ancla.
- `accuracy(history, today, days = ACCURACY_DAYS): { study: Rate, quiz: Rate }` con `Rate = { correct, total, percent: number | null }`.
- `dayLabel(date, today): string`: `'hoy'` si `date === today`; si no, inicial del día en español `['D','L','M','X','J','V','S'][díaDeLaSemana]` (día de la semana con `Date.UTC`).
- `chartSummary(counts): string`: «Respuestas por día en los últimos 14 días: estudiaste 9 de 14 días, 156 respuestas en total.» (singular: «1 respuesta»; `14` sale de `counts.length`).

- [ ] **Escribir las pruebas.** Ayudantes en la prueba: `study(date, answer = 'good')` → `{ at: date + 'T10:00:00.000Z', date, cardId: 'w1:fr-es', wordId: 'w1', direction: 'fr-es', answer, algorithm: 'sm2' }`; `quiz(date, correct = true)` → `{ kind: 'quiz', at: …, date, wordId: 'w1', mode: 'choice', correct, accentOnly: false }`; `run(from, n)` → una entrada de Estudiar por día durante `n` días desde `from`. Hoy = `'2026-11-23'` (lunes) salvo que se diga otra cosa.
  - P1 `[]` → `streak` `{ days: 0, studiedToday: false }`; `dailyCounts` 14 elementos, todos `count: 0`, el último `'2026-11-23'` y el primero `'2026-11-10'`; `accuracy` `{ study: { correct: 0, total: 0, percent: null }, quiz: { … null } }`; `studiedDates([])` → `[]`.
  - P2 tres entradas hoy → `{ days: 1, studiedToday: true }`; último `count` 3, el resto 0.
  - P3 una entrada `'2026-11-22'` → `{ days: 1, studiedToday: false }`.
  - P4 `run('2026-11-17', 7)` → `{ days: 7, studiedToday: true }`.
  - P5 `run('2026-11-16', 7)` (hasta el 22) → `{ days: 7, studiedToday: false }`.
  - P6 `run('2026-11-13', 7)` (13–19) + 22 + 23 (falta el 20 y 21) → `days: 2`.
  - P7 solo `'2026-11-21'` → `{ days: 0, studiedToday: false }`.
  - P8 hoy `'2026-11-02'`, entradas 10-30, 10-31, 11-01, 11-02 → `days: 4`; `dailyCounts` empieza en `'2026-10-20'`, contiene `'2026-10-31'` seguido de `'2026-11-01'`, 14 fechas distintas, cada una = la anterior + 1 día.
  - P9 hoy `'2027-03-01'` con 02-27, 02-28, 03-01 → 3; hoy `'2027-01-01'` con 2026-12-30, 2026-12-31, 2027-01-01 → 3.
  - P10 hoy `'2026-11-23'`, `run('2026-11-20', 5)` (hasta el 24) → `anchorDate` `'2026-11-24'`; `streak.days` 5, `studiedToday: true`; último de `dailyCounts` `'2026-11-24'`.
  - P10b actividad `run('2026-11-17', 7)` + una entrada `'2027-06-01'` → `anchorDate` `'2026-11-23'`; `streak.days` 7; último de `dailyCounts` `'2026-11-23'`; la entrada de 2027 no está en `accuracy`.
  - P11 hoy 2 de Estudiar + 3 de Quiz → `studiedDates` `['2026-11-23']`; último `count` 5; `days: 1`.
  - P12 entradas con `date` `undefined`, `''`, `'23-11-2026'`, `'2026-11-23T10:00'` y sin `date` → ignoradas en `studiedDates`, `streak`, `dailyCounts` y `accuracy`.
  - P13 Estudiar `again`, `hard`, `good`, `easy` el `'2026-10-25'` (dentro: ancla − 29) y un `again` el `'2026-10-24'` (fuera) → `study` `{ correct: 3, total: 4, percent: 75 }`; Quiz `true`, `false`, `true` → `{ correct: 2, total: 3, percent: 66 }`; 199 aciertos + 1 fallo → `percent: 99`.
  - P14 20 000 entradas repartidas en los 365 días hasta hoy (todos los días con alguna) → `streak.days` 365, suma de `dailyCounts` igual a las entradas de esos 14 días; `streak` + `dailyCounts` + `accuracy` juntos en menos de 200 ms (`performance.now()`).
  - `dayLabel('2026-11-23', '2026-11-23')` → `'hoy'`; `dayLabel('2026-11-22', …)` → `'D'`; `'2026-11-17'` → `'M'`; `'2026-11-18'` → `'X'`.
  - `chartSummary` con 9 días con respuestas que suman 156 → texto exacto de arriba; con un día de 1 respuesta → «… estudiaste 1 de 14 días, 1 respuesta en total.»; todo a 0 → «… estudiaste 0 de 14 días, 0 respuestas en total.»
- [ ] `node --test tests/stats.test.js` → **FALLA** (no existe el módulo).
- [ ] Implementar `js/lib/stats.js` según las definiciones 1–5 del diseño (fecha válida: `/^\d{4}-\d{2}-\d{2}$/`; porcentaje `Math.floor(correct * 100 / total)`). `sw.js`: `v10` y el archivo nuevo.
- [ ] `npm test` y `npm run lint` → todo pasa. Commit `feat: estadísticas del historial (racha, días y acierto)`.

### Task 3: Estado de las palabras (TDD)
**Files:** Modify `js/lib/stats.js`; Test `tests/stats.test.js`.
**Consumes:** `LEITNER_DAYS` de `js/lib/scheduler.js`; `sortWords(words)` de `js/lib/words.js`; tarjetas `{ id, wordId, direction, introducedOn, sm2: { interval, … }, leitner: { box, … } }` en `cards: { [id]: Card }` (ids `cardIdOf(wordId, direction)`).
**Produces:** `isCardMastered(card, algorithm): boolean` · `wordStates({ words, cards, algorithm }): { new: number, learning: number, mastered: number, masteredWords: Word[] }`.

- [ ] **Escribir las pruebas.** Ayudante `card(wordId, direction, { interval = 0, box = 1, introducedOn = '2026-11-01' })`.
  - M1 SM-2 intervalo 13 → `false`; M2 intervalo 14 → `true`; M3 tras `review(card, 'again', …)` de una tarjeta con intervalo 20 → `false` (con SM-2 y con Leitner); M4 Leitner caja 4 → `false`; M5 caja 5 → `true`; M6 algoritmo `'x'` → lanza error.
  - W1 `words: []` → `{ new: 0, learning: 0, mastered: 0, masteredWords: [] }`.
  - W2 palabra sin tarjetas → `new: 1`. Tarjeta con `introducedOn: null` → no cuenta como estudiada.
  - W3 `fr-es` intervalo 20, `es-fr` sin tarjeta → `mastered: 1`.
  - W4 `fr-es` intervalo 20, `es-fr` intervalo 3 → `learning: 1`.
  - W5 tarjeta dominada de una palabra que ya no está en `words` → no cuenta; `new + learning + mastered === words.length`.
  - W6 las cinco dominadas `le père`, `l'élève`, `la maison`, `l'école`, `l'enfant` → `masteredWords.map(w => w.fr)` = `["l'école", "l'élève", "l'enfant", 'la maison', 'le père']`.
  - W7 la misma lista con `algorithm: 'leitner'` y cajas 4 → `mastered: 0`.
- [ ] `node --test tests/stats.test.js` → **FALLA** (funciones no exportadas).
- [ ] Implementar según las definiciones 6–8 del diseño (`masteredWords` = `sortWords` de las dominadas).
- [ ] `npm test` y `npm run lint` → pasa. Commit `feat: estado de las palabras (nuevas, en aprendizaje, dominadas)`.

### Task 4: Pantalla Progreso
**Files:** Create `js/screens/progress.js`; Modify `index.html` (`#screen-progress`), `css/styles.css`, `js/app.js`, `sw.js` (archivo nuevo), `DESIGN.md` (sección «Pantalla Progreso (Etapa 5)»); Test `tests/index-html.test.js`, `tests/styles.test.js`.
**Consumes:** todo `js/lib/stats.js`; `localDate(now)`; `resolveRoute`; `StorageError`; `studyStore.load()`, `studyStore.getState()`, `studyStore.watchExternalChanges`, `wordStore.getWords()`, `wordStore.watchExternalChanges`.
**Produces:** `initProgress({ wordStore, studyStore, now = () => new Date() }): Promise<void>`.

- [ ] **Usar la skill frontend-design** con `DESIGN.md` y el boceto del diseño para fijar los estilos antes de escribir CSS.
- [ ] **Pruebas primero.** `index-html`: en `#screen-progress` existen `#progress-notice` (`role="alert"`, oculto); `#progress-empty` con el texto exacto del estado vacío; `#progress-streak` (número y texto); `#progress-chart` (contenedor del SVG) con su título «Respuestas por día · últimos 14 días»; un `<details>` con `<summary>Ver los datos día por día</summary>` y una `<table>` con `<th scope="col">` «Día» y «Respuestas»; `#progress-accuracy` con las filas «Estudiar» y «Quiz»; la sección «Tus palabras» con `#progress-words` y un `<details id="progress-mastered">`. Ya no está el texto de relleno «Aquí verás cuánto has avanzado.». `styles`: cada color nuevo del gráfico ≥ 3:1 contra `--bg` y `--surface` en claro y oscuro; cada color nuevo de texto ≥ 4,5:1. **Ver fallar.**
- [ ] Implementar `progress.js`: `render()` calcula con `today = localDate(now())` en cada llamada; textos del diseño (singular/plural de la racha, «—» y frases de acierto vacío, estado vacío sin historial, «Añade palabras en Vocabulario para empezar.», frase de 0 dominadas, «Ver las N palabras dominadas»); SVG con `role="img"` y `aria-label = chartSummary(counts)`, barras proporcionales al máximo, número encima de cada barra con respuestas, `dayLabel` debajo; tabla con las 14 filas; barra de proporción `aria-hidden="true"`. Arranque como Estudiar: `studyStore.load()` en `try` (si `StorageError` → aviso de siempre en `#progress-notice`), `render()`, `hashchange` a `progress` → `render()`, `watchExternalChanges` de los dos almacenes → `render()`. `app.js`: `.then(() => initProgress({ wordStore, studyStore }))` tras `initQuiz`. `sw.js`: archivo nuevo. `DESIGN.md`: sección nueva con colores y contrastes.
- [ ] `npm test` y `npm run lint` → pasa. `npm start` y `curl -sI` de `js/screens/progress.js` y `js/lib/stats.js` → 200.
- [ ] Recorrido en navegador (Firefox sin ventana, WebDriver BiDi, como en la Etapa 4), con capturas: sin datos (estado vacío); tras responder 3 en Estudiar y 2 en Quiz (Review Focus 1); medianoche simulada (2); 320 px con un día de 120 respuestas (3); palabra `<b>gras</b>` dominada (4); borrar una dominada (5); modo oscuro; escritorio ≥ 900 px; navegación con teclado (`Tab` llega a los dos `<details>` con foco visible). Commit `feat: pantalla Progreso`.

### Task 5: Verificación con un historial real, README y cierre
- [ ] **Coincidencia con el historial.** Script independiente en el scratchpad (`check-progress.mjs`, **no** importa `stats.js`; cuenta fechas con un `Set` y bucles simples) que lee el JSON de `app-frances-study` y `app-frances` y escribe racha, 14 días, acierto y estados. Cargar en el navegador un historial conocido con fechas relativas a hoy (racha de 5 hasta hoy, un hueco antes, días del mes anterior, Estudiar y Quiz con fallos, tarjetas dominadas con SM-2 y con Leitner), anotar la pantalla y comparar con la salida del script. Mostrar al usuario el JSON, la salida del script y el texto o la captura de la pantalla; cualquier diferencia se investiga (systematic-debugging) antes de seguir.
- [ ] README: sección Progreso con las definiciones (día estudiado, racha, cuándo se rompe, zona horaria y tope de mañana, acierto, palabra dominada a 14 días, efecto de cambiar de algoritmo) en español sencillo, y lista de comprobación del celular (modo avión, modo oscuro, lector de pantalla TalkBack en el gráfico) y del computador. Quitar «Progreso llegará en la próxima etapa.».
- [ ] Commit, push, esperar Pages y comprobar archivos → 200; releer `git diff main`; revisión final de la rama; informe de `CLAUDE.md` (6 puntos) con comandos y salidas reales.
