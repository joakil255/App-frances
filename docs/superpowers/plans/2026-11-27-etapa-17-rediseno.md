# Etapa 17 — Rediseño en tres destinos: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar la app en una barra de 3 destinos (Aprende, Practica, Progreso) con la dirección visual B «Azulejo y andén», sin perder funciones ni datos.

**Architecture:** App estática (HTML + CSS + módulos ES) sin backend. El router (`js/lib/router.js`) gana pantallas de primer nivel y una pantalla «padre» para las de segundo nivel. La lógica nueva va en funciones puras con pruebas (`js/lib/today.js`, `js/lib/practice.js`); las pantallas nuevas (`js/screens/learn.js`, `js/screens/practice.js`, `js/screens/backup.js`) solo pintan con `textContent`. El trabajo va en 5 tandas, cada una en su rama desde la rama común `etapa-17-rediseno`, y un solo merge a `main` al final.

**Tech Stack:** JavaScript sin dependencias, `node --test`, ESLint, service worker propio, Chromium sin ventana para los recorridos.

**Spec:** `docs/superpowers/specs/2026-11-27-etapa-17-rediseno-design.md` (léelo entero antes de cada tanda; el prototipo de referencia es `docs/prototipos/rediseno-b-anden.html`).

## Global Constraints

- Sin dependencias nuevas, sin imágenes nuevas pesadas. Sin backend: `localStorage` como hoy.
- Todo texto de datos o de archivos se pinta con `textContent`, nunca `innerHTML`.
- Variables, funciones y archivos en inglés; comentarios breves en español; textos de la interfaz en español claro, segunda persona, frases cortas.
- Direcciones que no cambian: `#/vocabulario`, `#/estudiar`, `#/quiz`, `#/progreso`, `#/conversar`, `#/leer`, `#/leer/<id>`, `#/construir/<id>`, `#/construir/repaso`. Nuevas: `#/aprende`, `#/practica`. `#/`, `""`, `#` y direcciones desconocidas → Aprende. `#/construir` → `location.replace('#/aprende')`.
- `<main>` va antes que `<nav aria-label="Principal">` en el DOM; el CSS fija la barra abajo (< 900 px) o a la izquierda (≥ 900 px).
- Foco al `<h1>` de la pantalla al cambiar de pantalla (no en la primera carga).
- Objetivos táctiles ≥ 44 px (los botones principales, 48–56 px); texto ≥ 4,5:1; elementos gráficos ≥ 3:1; estados siempre en texto; `prefers-reduced-motion` respetado (no se añade movimiento); modo oscuro con los tokens de DESIGN.md.
- Numeración de lecciones continua, como hoy (A2 empieza en «Lección 16»).
- Una subida de `CACHE_VERSION` por tanda: v29 (T1), v30 (T2), v31 (T3), v32 (T4), v33 (T5). Todo archivo nuevo de `js/` entra en `PRECACHE_URLS`; uno borrado sale.
- TDD para la lógica: primero la prueba, verla fallar, luego el código mínimo. Ninguna prueba se borra ni se debilita para que pase; una prueba cuyo requisito cambió por el diseño se reescribe al requisito nuevo y se lista en el informe de la tanda.
- Cada tanda termina con `npm test` y `npm run lint` en verde, un recorrido a 360 px y a 1280 px (claro y oscuro) **llegando a cada pantalla tocando desde Aprende**, nunca escribiendo la dirección, y comprobando que hay forma visible de volver; revisión independiente; informe de 6 puntos (CLAUDE.md).

## Ramas y publicación

- Antes de T1: `git checkout main && git pull --ff-only && git checkout -b etapa-17-rediseno && git merge --no-ff etapa-17-rediseno-diseno` (trae spec, plan y prototipos) y `git push -u origin etapa-17-rediseno`.
- Cada tanda: `git checkout etapa-17-rediseno && git pull --ff-only && git checkout -b etapa-17-tN-<nombre>`; al terminar, push y PR **con base `etapa-17-rediseno`**; tras la revisión independiente y el visto bueno del usuario, merge de ese PR.
- Al final: PR `etapa-17-rediseno` → `main`. **Lo mergea el usuario.** Nunca push a `main`.

## Review Focus

1. PWA instalada con v28 que abre `#/` o un acceso a `#/construir` → debe mostrar Aprende y el botón Atrás no debe volver a `#/construir` (prueba de `redirectFor` en T2 + recorrido).
2. Lecciones que no cargan (primera carga sin conexión del índice, archivo dañado) → Aprende sigue mostrando palabras y frases; la estación Lección dice «Sin cargar» (prueba 7 de `todayPlan`, T2).
3. «Otra vez» en Estudiar deja la palabra en la cola de hoy → Progreso no la cuenta como hecha y Aprende sigue mandando a Estudiar (prueba de `dailyGoal`, T4).
4. Importar o exportar desde Progreso → el mensaje aparece en Progreso (no en Palabras, que no se ve) y las cifras de Progreso y Practica se actualizan (recorrido de T4).
5. Solo teclado: las lecciones planificadas del carrusel se alcanzan (región desplazable enfocable), y al cerrar una ventana abierta desde Progreso el foco vuelve a su botón (prueba de HTML en T2 + recorrido de T4).

---

## Tanda 1 — Navegación y estructura (rama `etapa-17-t1-navegacion`, ~2–3 h)

### Task 1: Router con pantallas de primer y segundo nivel

**Files:**
- Modify: `js/lib/router.js`
- Test: `tests/router.test.js`

**Interfaces:**
- Produces: `SCREENS: Array<{ id, path, title, parent? }>`; `TABS` (las de primer nivel, en orden); `resolveRoute(hash): string|null`; `routeParam(hash): string|null` (sin cambios); `tabFor(id): string` (el `parent` o el propio id).

- [ ] **Step 1: Reescribir las pruebas al requisito nuevo** (las de «ocho pantallas», «vacía lleva a Inicio» y «desconocida lleva a Inicio» cambian de requisito):

```js
test('SCREENS: primero los tres destinos y después las pantallas de segundo nivel', () => {
  assert.deepEqual(SCREENS.map((s) => s.id), ['learn', 'practice', 'progress', 'vocabulary', 'study', 'quiz', 'reader', 'chat', 'build']);
  assert.deepEqual(TABS.map((s) => [s.id, s.path, s.title]), [['learn', 'aprende', 'Aprende'], ['practice', 'practica', 'Practica'], ['progress', 'progreso', 'Progreso']]);
});
test('cada pantalla de segundo nivel pertenece a su destino', () => {
  for (const id of ['vocabulary', 'study', 'quiz', 'reader', 'chat']) assert.equal(tabFor(id), 'practice');
  assert.equal(tabFor('build'), 'learn');
  for (const id of ['learn', 'practice', 'progress']) assert.equal(tabFor(id), id);
});
test('dirección vacía, #/ y #/aprende llevan a Aprende', () => {
  for (const hash of ['', '#', '#/', '#/aprende', '#/APRENDE/']) assert.equal(resolveRoute(hash), 'learn', hash);
  assert.equal(resolveRoute('#/practica'), 'practice');
});
test('dirección desconocida lleva a Aprende', () => {
  assert.equal(resolveRoute('#/nada'), 'learn');
  assert.equal(resolveRoute('#/vocabulario/extra'), 'learn');
  assert.equal(resolveRoute('#/leer/a/b'), 'learn');
});
```
Las demás pruebas del archivo se conservan; en las que esperan `'home'` para una dirección inválida (`'#/leer/a/b'`, `'#/quiz/abc'`, `'#/construir/a/b'`) el valor esperado pasa a `'learn'`.

- [ ] **Step 2:** `node --test tests/router.test.js` → FALLA (`TABS`/`tabFor` no existen, `'home'` ≠ `'learn'`).
- [ ] **Step 3:** En `router.js`: `SCREENS` en el orden de la prueba con `parent: 'practice'` (vocabulary, study, quiz, reader, chat) y `parent: 'learn'` (build); `TABS = SCREENS.filter((s) => !s.parent)`; `''`, `'#'` y `'#/'` → `'learn'`; desconocida → `'learn'`; `tabFor(id)`.
- [ ] **Step 4:** `node --test tests/router.test.js` → PASA.
- [ ] **Step 5:** Commit `feat: router con tres destinos y pantallas de segundo nivel`.

### Task 2: HTML y arranque — barra de 3 destinos después del contenido, Practica y enlaces de volver

**Files:**
- Modify: `index.html`, `js/app.js`, `sw.js` (v29)
- Test: `tests/index-html.test.js`, `tests/precache.test.js`

**Interfaces:**
- Consumes: `SCREENS`, `TABS`, `tabFor`, `resolveRoute`, `routeParam` (Task 1).
- Produces (ids que usan las tandas siguientes): `#screen-learn`, `#screen-practice`; en Practica `#practice-words`, `#practice-study`, `#practice-reader` (vacíos hasta T3); clase `.back-link` (un `<p>` con un `.text-link`).

- [ ] **Step 1: Pruebas de HTML** — primero un ayudante al principio de `tests/index-html.test.js`, porque algunas pantallas llevan `<section>` dentro y una expresión `<section…>…</section>` se cortaría en la de dentro:

```js
// Todo lo que hay desde <section id="screen-ID"> hasta la siguiente pantalla (o </main>)
function sectionOf(id) {
  const start = html.indexOf(`<section id="screen-${id}"`);
  assert.ok(start >= 0, `falta screen-${id}`);
  const next = html.indexOf('<section id="screen-', start + 1);
  return html.slice(start, next === -1 ? html.indexOf('</main>') : next);
}
```
Las pruebas nuevas de este plan leen las pantallas con `sectionOf`. Después, las pruebas (reescriben «saltar al contenido», «un enlace por pantalla», «la barra dice Palabras», «la barra tiene Leer», «Construir solo en computador» y «#/construir con clase que lo oculta», porque la barra cambió de requisito):

```js
test('la navegación va después de <main> y tiene los tres destinos', () => {
  assert.ok(html.indexOf('<nav aria-label="Principal"') > html.indexOf('</main>'));
  assert.ok(!html.includes('Saltar al contenido'));
  const nav = html.match(/<nav aria-label="Principal"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map((m) => m[1]), ['#/aprende', '#/practica', '#/progreso']);
  for (const t of ['Aprende', 'Practica', 'Progreso']) assert.match(nav, new RegExp(`<span class="nav-label">${t}</span>`));
});
test('Practica enlaza las cinco pantallas de práctica, agrupadas por habilidad', () => {
  const practice = sectionOf('practice');
  assert.deepEqual([...practice.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]), ['Vocabulario', 'Leer y escuchar', 'Hablar']);
  for (const href of ['#/vocabulario', '#/estudiar', '#/quiz', '#/leer', '#/conversar']) assert.ok(practice.includes(`href="${href}"`), href);
  for (const id of ['practice-words', 'practice-study', 'practice-reader']) assert.match(practice, new RegExp(`id="${id}"`));
});
test('cada pantalla de práctica tiene un enlace visible para volver a Practica', () => {
  for (const id of ['vocabulary', 'study', 'quiz', 'chat', 'reader']) {
    const section = sectionOf(id);
    assert.match(section, /<p class="back-link"><a class="text-link" href="#\/practica"><span aria-hidden="true">‹<\/span> Practica<\/a><\/p>/, id);
  }
});
```
La prueba «cada pantalla tiene su sección con título enfocable» se conserva (ahora recorre los 9 `SCREENS`). La de Inicio (`screen-home`) pasa a leer `screen-learn`.
En `tests/precache.test.js`, la prueba de versión pasa a `'v29'` con el nombre «la caché sube a v29 (Etapa 17, navegación)».

- [ ] **Step 2:** `npm test` → FALLAN las pruebas nuevas.
- [ ] **Step 3: `index.html`.** Quitar el enlace «Saltar al contenido». Dentro de `.layout`: primero `<main id="main" tabindex="-1">`, después `<nav aria-label="Principal" class="nav">` con «Français» y 3 `<li>`: `<a class="nav-link line-learn" href="#/aprende"><span class="line-dot" aria-hidden="true"></span><span class="nav-label">Aprende</span></a>` (y `line-practice` `#/practica` Practica, `line-progress` `#/progreso` Progreso). `section#screen-home` → `section#screen-learn class="screen line-learn"` con `<h1>` «Aprende» y el **mismo contenido de hoy** (se rehace en T2). Nueva `section#screen-practice class="screen line-practice" hidden` con `<h1>` «Practica» y los tres grupos de la spec 6.2 (`<h2>` + `<ul class="practice-grid">` de `<li class="line-…">` con `<a class="practice-tile tile" href="…"><span class="practice-name">Palabras</span><span class="practice-count" id="practice-words"></span></a>`; Quiz y Conversar llevan su texto fijo de la spec). `«‹ Practica»` (`.back-link`) antes del `<h1>` de Palabras, Estudiar, Quiz y Conversar, y como primer elemento del bloque de la biblioteca en Leer.
- [ ] **Step 4: `js/app.js`.** `showScreen`: cada `.nav-link` recibe `aria-current="page"` si su pantalla es `id`, `aria-current="true"` si es `tabFor(id)`, y si no se le quita; `'home'` → `'learn'` en todo el archivo (`home?.refresh()` al mostrar Aprende).
- [ ] **Step 5:** `sw.js`: `CACHE_VERSION = 'v29'`. `npm test` y `npm run lint` → PASAN.
- [ ] **Step 6:** Commit `feat: barra de tres destinos después del contenido, pantalla Practica y enlaces de volver`.

### Task 3: Estilos de la barra B y de la baldosa

**Files:**
- Modify: `css/styles.css`
- Test: `tests/styles.test.js`

**Interfaces:**
- Produces: clases `.tile`, `.nav-label`, `.back-link`, `.line-learn`, `.line-practice` (punto de correspondencia), `.practice-grid`, `.practice-tile` (la banda y el texto de las cifras se terminan en T3).

- [ ] **Step 1: Pruebas** (sustituyen a «.nav-desktop-only se oculta en móvil…», que deja de existir):

```js
test('la pestaña activa: texto blanco sobre la placa azul (≥ 4,5:1) en claro y oscuro', () => {
  const color = propertyOf('.nav-link[aria-current] .nav-label', 'color');
  for (const [theme, bg] of Object.entries(PLAQUE)) assert.ok(contrast(color, bg) >= 4.5, theme);
});
test('el texto de las pestañas inactivas se lee sobre la barra clara (≥ 4,5:1)', () => {
  assert.ok(contrast(propertyOf('.nav-link', 'color'), propertyOf('.nav', 'background')) >= 4.5);
});
test('la barra mide 64 px de alto en el móvil', () => {
  assert.match(css, /\n\.nav-link\s*\{[^}]*min-height:\s*var\(--nav-height\)/);
  assert.match(css, /--nav-height:\s*64px/);
});
```
(`propertyOf` resuelve `var(--x)` del tema claro; el oscuro se comprueba con los valores de la spec 7: 8,2 y 8,5.)

- [ ] **Step 2:** `node --test tests/styles.test.js` → FALLA.
- [ ] **Step 3:** CSS según la spec 7: `.nav` fondo `--surface`, borde superior 2 px `--divider`; `.nav-link` color `--text-muted`, Barlow 500; activo Barlow 700 y `.nav-label` con fondo `--plaque`, texto `#FFFFFF`, radio 6 px, `padding: 2px 14px`; punto con anillo `--text`; `.line-learn { --line: #F2C230; }` (sustituye a `.line-home`); `.line-practice .line-dot` = correspondencia (blanco con `inset 0 0 0 4px #1C2433`); ≥ 900 px: `.layout` en grid, `.nav { grid-column: 1; grid-row: 1; }`, `main { grid-column: 2; grid-row: 1; }`, mismo aspecto claro con la placa en el activo; borrar `.nav-desktop-only` y `.skip-link`. `.tile` (spec 7) y `.back-link { margin: 0 0 var(--space-2); }`.
- [ ] **Step 4:** `npm test` y `npm run lint` → PASAN.
- [ ] **Step 5: Recorrido** a 360 × 740 y 1280 × 800, claro y oscuro: desde Aprende tocar Practica → Palabras → «‹ Practica» → Leer → «‹ Practica» → Progreso → Aprende; solo con Tab, lo mismo. Comprobar: ninguna página se desborda a lo ancho, la pestaña activa (y la del destino padre en Palabras/Leer) lleva la placa azul, el foco llega al `<h1>`, las lecciones de `#/construir` siguen accesibles desde la tarjeta de Aprende. Guardar capturas en el scratchpad.
- [ ] **Step 6:** Commit `style: barra clara de tres destinos y baldosa (dirección B)`. Informe de la tanda, revisión independiente, PR a `etapa-17-rediseno`.

---

## Tanda 2 — Aprende (rama `etapa-17-t2-aprende`, ~3–4 h)

### Task 4: `todayPlan` — la acción del día y la línea del día

**Files:**
- Create: `js/lib/today.js`
- Test: `tests/today.test.js`

**Interfaces:**
- Produces: `todayPlan({ hasWords, wordsDue, sentencesDue, lesson, lessonsReady }) → { title, action: { text, href } | null, followUp, showMore, stations: [{ name, state, text }] }` con `lesson = { id, number, title } | null` (la siguiente pendiente), `state ∈ 'done' | 'current' | 'todo'`, y estaciones siempre en el orden Palabras, Frases, Lección. Los números se escriben con `toLocaleString('es')`.

- [ ] **Step 1: Pruebas** (`L7 = { id: 'fr-a1-07', number: 7, title: 'Los adjetivos' }`):

```js
const st = (p) => p.stations.map((s) => [s.name, s.state, s.text]);
test('con palabras pendientes, la acción es repasar palabras', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 12, sentencesDue: 3, lesson: L7, lessonsReady: true });
  assert.equal(p.title, '12 palabras te esperan');
  assert.deepEqual(p.action, { text: 'Repasar 12 palabras', href: '#/estudiar' });
  assert.equal(p.followUp, 'Después: 3 frases y la lección 7, «Los adjetivos».');
  assert.equal(p.showMore, false);
  assert.deepEqual(st(p), [['Palabras', 'current', 'Ahora: 12 pendientes'], ['Frases', 'todo', '3 pendientes'], ['Lección', 'todo', 'Lección 7']]);
});
test('singular: 1 palabra, 1 frase', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 1, sentencesDue: 1, lesson: L7, lessonsReady: true });
  assert.equal(p.title, '1 palabra te espera');
  assert.equal(p.action.text, 'Repasar 1 palabra');
  assert.equal(p.followUp, 'Después: 1 frase y la lección 7, «Los adjetivos».');
  assert.deepEqual(st(p).slice(0, 2), [['Palabras', 'current', 'Ahora: 1 pendiente'], ['Frases', 'todo', '1 pendiente']]);
});
test('sin palabras pendientes, la acción es repasar frases', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 3, lesson: L7, lessonsReady: true });
  assert.equal(p.title, '3 frases te esperan');
  assert.deepEqual(p.action, { text: 'Repasar 3 frases', href: '#/construir/repaso' });
  assert.equal(p.followUp, 'Tus palabras ya están al día. Después: la lección 7, «Los adjetivos».');
  assert.deepEqual(st(p), [['Palabras', 'done', 'Al día'], ['Frases', 'current', 'Ahora: 3 pendientes'], ['Lección', 'todo', 'Lección 7']]);
});
test('palabras pendientes y 0 frases: Frases ya está al día', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 5, sentencesDue: 0, lesson: L7, lessonsReady: true });
  assert.equal(p.followUp, 'Después: la lección 7, «Los adjetivos».');
  assert.deepEqual(st(p)[1], ['Frases', 'done', 'Al día']);
});
test('sin repasos, la acción es continuar la lección', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 0, lesson: L7, lessonsReady: true });
  assert.equal(p.title, 'Tu repaso de hoy está completo');
  assert.deepEqual(p.action, { text: 'Continuar: Lección 7 · Los adjetivos', href: '#/construir/fr-a1-07' });
  assert.equal(p.followUp, 'Tus palabras y tus frases están al día.');
  assert.deepEqual(st(p)[2], ['Lección', 'current', 'Ahora: Lección 7']);
});
test('todo terminado: sin botón y con «Practicar algo más»', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 0, lesson: null, lessonsReady: true });
  assert.equal(p.action, null);
  assert.equal(p.followUp, 'Completaste todas las lecciones disponibles. Mañana tendrás más repaso.');
  assert.equal(p.showMore, true);
  assert.deepEqual(st(p)[2], ['Lección', 'done', 'Terminadas']);
});
test('lecciones sin cargar: Aprende sigue con palabras y frases', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 0, sentencesDue: 0, lesson: null, lessonsReady: false });
  assert.equal(p.action, null);
  assert.equal(p.followUp, 'Tus palabras y tus frases están al día. Las lecciones todavía no están disponibles.');
  assert.equal(p.showMore, true);
  assert.deepEqual(st(p)[2], ['Lección', 'todo', 'Sin cargar']);
  const q = todayPlan({ hasWords: true, wordsDue: 4, sentencesDue: 0, lesson: null, lessonsReady: false });
  assert.equal(q.action.href, '#/estudiar');
  assert.equal(q.followUp, 'Después de esto, tu repaso de hoy queda completo.');
});
test('sin palabras en la lista: Palabras dice «Sin palabras»', () => {
  const p = todayPlan({ hasWords: false, wordsDue: 0, sentencesDue: 2, lesson: L7, lessonsReady: true });
  assert.deepEqual(st(p)[0], ['Palabras', 'done', 'Sin palabras']);
  assert.equal(p.action.href, '#/construir/repaso');
});
test('cifras grandes y títulos con acentos y comillas', () => {
  const p = todayPlan({ hasWords: true, wordsDue: 15000, sentencesDue: 0, lesson: { id: 'fr-a1-02', number: 2, title: "Être, avoir, c'est, il y a" }, lessonsReady: true });
  assert.equal(p.title, '15.000 palabras te esperan');
  assert.equal(p.followUp, "Después: la lección 2, «Être, avoir, c'est, il y a».");
});
```

- [ ] **Step 2:** `node --test tests/today.test.js` → FALLA (módulo no existe).
- [ ] **Step 3:** Implementar `todayPlan` en `js/lib/today.js` (pura, sin DOM).
- [ ] **Step 4:** `node --test tests/today.test.js` → PASA.
- [ ] **Step 5:** Commit `feat: acción y línea del día de Aprende (todayPlan)`.

### Task 5: Pantalla Aprende — repaso de hoy y carrusel de lecciones

**Files:**
- Create: `js/screens/learn.js`
- Modify: `index.html`, `js/app.js`, `js/screens/home.js` (se queda solo con la copia de seguridad hasta T4), `css/styles.css`, `sw.js` (v30)
- Test: `tests/index-html.test.js`, `tests/styles.test.js`, `tests/precache.test.js`

**Interfaces:**
- Consumes: `todayPlan` (Task 4); `buildQueue` (`js/lib/queue.js`); `countDueToday` (`js/lib/build-review.js`); `nextLesson`, `lessonNumber`, `routeRows` (`js/lib/lesson-route.js`); `localDate`.
- Produces: `initLearn({ wordStore, studyStore, buildStore, getLessons, now = () => new Date() }) → { refresh() }`; `getLessons()` devuelve la lista cargada, `null` mientras no llega y `null` también si falló (en ese caso `lessonsReady = false`).

- [ ] **Step 1: Pruebas de HTML y CSS** (reescriben las de la tarjeta «Construir frases» de Inicio y la del enlace «Ver todas las lecciones», cuyo requisito cambió):

```js
test('Aprende tiene el repaso de hoy con la línea del día y su acción', () => {
  const learn = sectionOf('learn');
  assert.match(learn, /<section class="today tile" aria-labelledby="today-title">/);
  assert.match(learn, /<h2 id="today-title"[^>]*>[\s\S]*Repaso de hoy<\/h2>/);
  assert.match(learn, /<ol class="dayline" aria-label="Orden del día">/);
  assert.match(learn, /<a class="button button-primary today-action" id="today-action"/);
  assert.match(learn, /<a class="text-link" href="#\/practica">Practicar algo más<\/a>/);
});
test('las lecciones son un carrusel por nivel, enfocable y con nombre', () => {
  for (const level of ['a1', 'a2']) {
    assert.match(html, new RegExp(`<h3 id="learn-level-${level}"[^>]*>${level.toUpperCase()}</h3>`));
    assert.match(html, new RegExp(`<ol id="learn-route-${level}" class="carousel" tabindex="0" aria-labelledby="learn-level-${level}">`));
  }
});
```
En `styles.test.js`: la prueba del «tramo planificado discontinuo» pasa a «la baldosa de una lección planificada tiene borde discontinuo» (`propertyOf('.lesson-tile.planned', 'border-style') === 'dashed'`); la de `--text-planned` se conserva.

- [ ] **Step 2:** `npm test` → FALLAN.
- [ ] **Step 3: HTML.** En `#screen-learn`: quitar la frase «Bonjour…» y la tarjeta `.home-build`; poner la baldosa del repaso (spec 6.1, ids `today-title`, `today-main`, `today-action`, `today-next`, `today-more`; tres `<li data-station>` con `.stop` `aria-hidden`, `.stop-name` y `.stop-text`), el `<h2>` «Lecciones», y por nivel `<h3 id="learn-level-a1">A1</h3>`, el `<ol>` de la prueba y `<p class="hint learn-hint" id="learn-hint-a1"></p>`. El bloque de copia de seguridad se queda debajo hasta T4.
- [ ] **Step 4: `learn.js`.** `refresh()`: calcula `today = localDate(now())`; `wordsDue = buildQueue(...).length`; `sentencesDue = countDueToday(...)` (con `lessons ?? []`); `lesson` = `nextLesson` + `lessonNumber`; pinta `todayPlan` con `textContent` (estación de ahora con `aria-current="step"`, `data-state` para el CSS; `#today-action` oculto si `action === null`; `#today-more` visible si `showMore`); pinta cada carrusel desde `routeRows` filtrando por `level` — baldosa `<a class="lesson-tile tile" href>` para las que tienen `href`, `<p class="lesson-tile tile planned">` para las demás; dentro: estación (`.station` + estado, `aria-hidden`), «Lección N», título, `stateText` y, si `hasReview`, «Tiene partes **REVISAR**» con `.tag-review`; `aria-current="step"` en `current`. Después desplaza cada carrusel a su `current` con `scrollLeft` (sin `scrollIntoView`, sin `behavior: 'smooth'`). Pista: «Desliza para ver las N lecciones de A1.» si `matchMedia('(pointer: coarse)').matches`, si no «Usa las flechas o la barra para ver las N lecciones de A1.».
- [ ] **Step 5: `app.js` y `home.js`.** `app.js` crea `learn = initLearn({...})` cuando están listas las palabras y el estudio; `learn.refresh()` al mostrar Aprende, al llegar las lecciones y en `buildStore.watchExternalChanges`/`studyStore.watchExternalChanges`/`wordStore.watchExternalChanges`. `home.js` pierde `renderBuildCard` y sus imports; devuelve `{}`.
- [ ] **Step 6: CSS** según la spec 7 (repaso de hoy, `.dayline` con `[data-state]`, `.carousel` con `overflow-x: auto; scroll-snap-type: x mandatory`, `li { flex: 0 0 76% }`, `.lesson-tile`, `.lesson-tile.planned` discontinuo con `--text-planned`, `a.lesson-tile[aria-current="step"]` con borde turquesa); quitar las reglas de `.home-build*`.
- [ ] **Step 7:** `sw.js`: v30 y `js/screens/learn.js`, `js/lib/today.js` en `PRECACHE_URLS`; prueba de versión a `'v30'`. `npm test` y `npm run lint` → PASAN.
- [ ] **Step 8:** Commit `feat: Aprende con el repaso de hoy y el carrusel de lecciones`.

### Task 6: Construir sin lista propia — redirección y «‹ Aprende»

**Files:**
- Modify: `js/lib/router.js`, `js/app.js`, `js/screens/build.js`, `index.html`, `css/styles.css`
- Test: `tests/router.test.js`, `tests/index-html.test.js`

**Interfaces:**
- Produces: `redirectFor(hash): string|null`.

- [ ] **Step 1: Pruebas** (reescriben «arriba de la ruta: Continuar, Repasar…», «la ruta tiene un h2 y un ol por tramo», «cada lección tiene un enlace para volver a la ruta» y «el repaso tiene un enlace para volver a la ruta»):

```js
test('#/construir redirige a Aprende; lo demás no se redirige', () => {
  for (const hash of ['#/construir', '#/CONSTRUIR/', '#/construir/']) assert.equal(redirectFor(hash), '#/aprende', hash);
  for (const hash of ['#/construir/fr-a1-01', '#/construir/repaso', '#/', '', '#/leer', '#main']) assert.equal(redirectFor(hash), null, hash);
});
test('la lección y el repaso vuelven a Aprende, y Construir ya no tiene lista propia', () => {
  const build = sectionOf('build');
  assert.equal([...build.matchAll(/<a class="text-link" href="#\/aprende"><span aria-hidden="true">‹<\/span> Aprende<\/a>/g)].length, 2);
  assert.ok(!build.includes('href="#/construir"'));
  assert.ok(!build.includes('id="build-index"'));
});
```

- [ ] **Step 2:** `npm test` → FALLAN.
- [ ] **Step 3:** `redirectFor` en `router.js`. En `app.js`, `handleRoute` empieza con `const target = redirectFor(location.hash); if (target) { location.replace(target); return; }`. En `index.html` y `build.js`, quitar `#build-index` (Continuar, Repasar, «Completaste todas…», ruta) y su código (`routeItem`, `renderList`, botones), sin tocar lección ni repaso; los dos «‹ Todas las lecciones» pasan a «‹ Aprende» (`#/aprende`). Borrar el CSS de `.build-route*` y `.build-index-actions` que ya no usa nadie (las clases `.station*` se quedan: las usa el carrusel).
- [ ] **Step 4:** `npm test` y `npm run lint` → PASAN.
- [ ] **Step 5: Recorrido** 360 px y 1280 px, claro y oscuro, con las 4 situaciones (preparar los datos en `localStorage` antes de cargar): palabras pendientes, solo frases, nada pendiente, todo terminado. Desde Aprende: tocar la acción, volver con «‹ Aprende» o la barra; tocar una lección del carrusel y volver; deslizar el carrusel hasta una planificada; con Tab, llegar al carrusel y moverlo con flechas. Abrir `#/construir` y comprobar que muestra Aprende y que Atrás no vuelve a `#/construir`. Simular el índice de lecciones caído (bloquear `data/lessons/fr/index.json`) y ver «Sin cargar».
- [ ] **Step 6:** Commit `feat: #/construir lleva a Aprende y la lección vuelve con «‹ Aprende»`. Informe, revisión independiente, PR a `etapa-17-rediseno`.

---

## Tanda 3 — Practica (rama `etapa-17-t3-practica`, ~1,5–2 h)

### Task 7: Cifras de Practica (`practiceCounts`)

**Files:**
- Create: `js/lib/practice.js`
- Test: `tests/practice.test.js`

**Interfaces:**
- Produces: `practiceCounts({ wordCount, dueCount, newCount, textCount }) → { words, study, reader }` (strings).

- [ ] **Step 1: Pruebas:**

```js
test('Palabras cuenta con singular y plural', () => {
  assert.equal(practiceCounts({ wordCount: 160, dueCount: 0, newCount: 0, textCount: 0 }).words, '160 palabras');
  assert.equal(practiceCounts({ wordCount: 1, dueCount: 0, newCount: 0, textCount: 0 }).words, '1 palabra');
  assert.equal(practiceCounts({ wordCount: 0, dueCount: 0, newCount: 0, textCount: 0 }).words, 'Todavía no tienes palabras');
  assert.equal(practiceCounts({ wordCount: 12000, dueCount: 0, newCount: 0, textCount: 0 }).words, '12.000 palabras');
});
test('Estudiar: repasos y nuevas, solo lo que no es cero', () => {
  const s = (dueCount, newCount, wordCount = 10) => practiceCounts({ wordCount, dueCount, newCount, textCount: 0 }).study;
  assert.equal(s(12, 5), '12 para repasar y 5 nuevas');
  assert.equal(s(1, 1), '1 para repasar y 1 nueva');
  assert.equal(s(12, 0), '12 para repasar');
  assert.equal(s(0, 5), '5 nuevas');
  assert.equal(s(0, 0), 'Al día');
  assert.equal(s(0, 0, 0), 'Añade palabras para empezar');
});
test('Leer cuenta las historias', () => {
  const r = (textCount) => practiceCounts({ wordCount: 1, dueCount: 0, newCount: 0, textCount }).reader;
  assert.equal(r(3), '3 historias');
  assert.equal(r(1), '1 historia');
  assert.equal(r(0), 'Todavía no tienes historias');
});
```

- [ ] **Step 2:** `node --test tests/practice.test.js` → FALLA.
- [ ] **Step 3:** Implementar en `js/lib/practice.js`.
- [ ] **Step 4:** → PASA.
- [ ] **Step 5:** Commit `feat: cifras de la pantalla Practica (practiceCounts)`.

### Task 8: Pantalla Practica y estados vacíos con acción

**Files:**
- Create: `js/screens/practice.js`
- Modify: `index.html`, `js/app.js`, `js/screens/vocabulary.js`, `js/screens/study.js`, `js/screens/quiz.js`, `css/styles.css`, `sw.js` (v31)
- Test: `tests/index-html.test.js`, `tests/precache.test.js`

**Interfaces:**
- Consumes: `practiceCounts` (Task 7), `buildQueue`.
- Produces: `initPractice({ wordStore, studyStore, textStore, now = () => new Date() }) → { refresh() }`.

- [ ] **Step 1: Pruebas de HTML:**

```js
test('Palabras vacía ofrece el mazo A1 como acción principal y añadir una palabra', () => {
  const block = html.match(/<div id="vocab-start"[^>]*hidden[^>]*>([\s\S]*?)<\/div>/)[1];
  assert.match(block, /Todavía no tienes palabras\./);
  assert.match(block, /Empieza con 100 palabras frecuentes de nivel A1 o añade las tuyas\./);
  assert.match(block, /<button type="button" class="button button-primary" id="vocab-start-deck">Añadir 100 palabras A1<\/button>/);
  assert.match(block, /<button type="button" class="button button-secondary" id="vocab-start-add">Añadir palabra<\/button>/);
});
test('Estudiar y Quiz sin palabras llevan a Palabras', () => {
  for (const id of ['study-empty-go', 'quiz-empty-go']) assert.match(html, new RegExp(`<a class="button button-secondary" id="${id}" href="#/vocabulario">Ir a Palabras</a>`));
  assert.match(html, /<p id="quiz-empty"[^>]*hidden[^>]*>Añade palabras en Palabras para empezar\.<\/p>/);
});
```

- [ ] **Step 2:** `npm test` → FALLAN.
- [ ] **Step 3: `practice.js` y `app.js`.** `refresh()` calcula la cola de Estudiar de hoy (`buildQueue`, separando `isNew`) y pinta `#practice-words`, `#practice-study`, `#practice-reader` con `practiceCounts`. `app.js` lo llama al mostrar Practica y en los `watchExternalChanges` de palabras, estudio e historias.
- [ ] **Step 4: Palabras.** Añadir `#vocab-start` (texto y botones de la prueba) junto a `#vocab-empty`. En `render()`: sin palabras → `#vocab-start` visible, `#vocab-empty` oculto, `#vocab-add` y `#vocab-deck` ocultos; con palabras → al revés y `#vocab-empty` como hoy («Ninguna palabra coincide con la búsqueda.»). Extraer el manejador del mazo a `openDeck(source)` y el de añadir a `openForm(null, source)` y conectarlos también a `#vocab-start-deck`/`#vocab-start-add`. Si al cerrar una ventana el botón que la abrió está oculto (el bloque vacío desapareció), el foco va al `<h1>` de Palabras.
- [ ] **Step 5: Estudiar y Quiz.** `#study-empty-go` junto a `#study-empty` (mismo `hidden`). En Quiz, `#quiz-empty` + `#quiz-empty-go`, visibles solo con 0 palabras (los modos se ocultan en ese caso).
- [ ] **Step 6: CSS** de `.practice-grid` (2 columnas, 12 px; `.wide` o tercer elemento a lo ancho), `.practice-tile` (banda de 8 px de `--line` arriba, mínimo 112 px, nombre Barlow 700 1,25 rem, cifra serif `--text-muted`).
- [ ] **Step 7:** `sw.js` v31 con `js/lib/practice.js` y `js/screens/practice.js`; prueba de versión a `'v31'`. `npm test` y `npm run lint` → PASAN.
- [ ] **Step 8: Recorrido** 360 px y 1280 px, claro y oscuro: Aprende → Practica → cada baldosa y vuelta; cifras correctas tras estudiar una tarjeta; con todas las palabras borradas, el estado vacío de Palabras, «Añadir 100 palabras A1» abre la revisión del mazo y al importar vuelve la lista; Estudiar y Quiz vacíos llevan a Palabras.
- [ ] **Step 9:** Commit `feat: Practica con baldosas y cifras, y estados vacíos con acción`. Informe, revisión independiente, PR a `etapa-17-rediseno`.

---

## Tanda 4 — Progreso (rama `etapa-17-t4-progreso`, ~3–4 h)

### Task 9: `dailyGoal` — el objetivo «dejar el repaso en cero»

**Files:**
- Modify: `js/lib/today.js`
- Test: `tests/today.test.js`

**Interfaces:**
- Produces: `dailyGoal({ wordQueue, sentenceQueue, history, sentenceCards, today, dayOf = (iso) => localDate(new Date(iso)) }) → { wordsLeft, sentencesLeft, done, ratio, text, answersText }`. `wordQueue` = salida de `buildQueue` (`[{ cardId }]`); `sentenceQueue` = salida de `buildReviewQueue` (`[cardId]`); `history` = historial de estudio (entradas `{ date, cardId }` de Estudiar y `{ kind: 'quiz', date }` del Quiz); `sentenceCards` = objeto `id → { lastReviewedAt }`.

- [ ] **Step 1: Pruebas:**

```js
const T = '2026-11-27';
test('cuenta lo que queda y lo hecho hoy', () => {
  const g = dailyGoal({
    wordQueue: [{ cardId: 'a' }, { cardId: 'b' }], sentenceQueue: ['s1'],
    history: [{ date: T, cardId: 'c' }, { date: T, cardId: 'c' }, { date: T, cardId: 'd' }, { date: '2026-11-26', cardId: 'e' }, { kind: 'quiz', date: T }],
    sentenceCards: { s1: { lastReviewedAt: null }, s2: { lastReviewedAt: '2026-11-27T10:00:00.000Z' } },
    today: T, dayOf: (iso) => iso.slice(0, 10),
  });
  assert.deepEqual([g.wordsLeft, g.sentencesLeft, g.done], [2, 1, 3]);
  assert.equal(g.ratio, 0.5);
  assert.equal(g.text, 'Te quedan 2 palabras y 1 frase.');
  assert.equal(g.answersText, 'Llevas 4 respuestas hoy.');
});
test('«Otra vez»: la palabra respondida hoy que sigue en la cola cuenta como pendiente, no como hecha', () => {
  const g = dailyGoal({ wordQueue: [{ cardId: 'a' }], sentenceQueue: [], history: [{ date: T, cardId: 'a' }], sentenceCards: {}, today: T });
  assert.deepEqual([g.wordsLeft, g.done], [1, 0]);
  assert.equal(g.text, 'Te queda 1 palabra.');
});
test('textos: solo frases, varias frases, y la frase de completado', () => {
  const base = { wordQueue: [], history: [], sentenceCards: {}, today: T };
  assert.equal(dailyGoal({ ...base, sentenceQueue: ['x'] }).text, 'Te queda 1 frase.');
  assert.equal(dailyGoal({ ...base, sentenceQueue: ['x', 'y'] }).text, 'Te quedan 2 frases.');
  const done = dailyGoal({ ...base, sentenceQueue: [] });
  assert.equal(done.text, 'Repaso de hoy completado. No te queda nada pendiente.');
  assert.equal(done.ratio, 1);
  assert.equal(done.answersText, 'Hoy todavía no has respondido nada.');
});
test('la frase repasada cuenta en el día local, no en UTC', () => {
  const g = dailyGoal({ wordQueue: [], sentenceQueue: [], history: [{ date: T, cardId: 'z' }], sentenceCards: { s: { lastReviewedAt: '2026-11-28T02:00:00.000Z' } }, today: T, dayOf: () => T });
  assert.equal(g.done, 2);
  assert.equal(g.answersText, 'Llevas 1 respuesta hoy.');
});
test('ignora entradas del historial sin fecha válida', () => {
  const g = dailyGoal({ wordQueue: [], sentenceQueue: [], history: [{ cardId: 'q' }, null, { date: 'ayer', cardId: 'r' }], sentenceCards: {}, today: T });
  assert.equal(g.done, 0);
});
```

- [ ] **Step 2:** `node --test tests/today.test.js` → FALLAN las nuevas.
- [ ] **Step 3:** Implementar `dailyGoal` en `today.js` con estas reglas: `wordsLeft` = `cardId` distintos de `wordQueue`; `sentencesLeft` = `sentenceQueue.length`; hechas = `cardId` distintos de entradas de hoy sin `kind: 'quiz'` que no están en `wordQueue`, más tarjetas de frase con `lastReviewedAt` cuyo `dayOf` es hoy y que no están en `sentenceQueue`; `ratio = total === 0 ? 1 : done / total`; texto en singular («Te queda») solo si queda exactamente un elemento en total; `answersText` cuenta todas las entradas válidas de hoy (Estudiar y Quiz).
- [ ] **Step 4:** → PASAN.
- [ ] **Step 5:** Commit `feat: objetivo de hoy de Progreso (dailyGoal)`.

### Task 10: Progreso con objetivo y cifras en baldosas

**Files:**
- Modify: `index.html`, `js/screens/progress.js`, `js/app.js`, `css/styles.css`
- Test: `tests/index-html.test.js`

**Interfaces:**
- Consumes: `dailyGoal` (Task 9), `buildQueue`, `buildReviewQueue`.
- Produces: `initProgress({ wordStore, studyStore, buildStore, getLessons, now })` (añade `buildStore` y `getLessons`).

- [ ] **Step 1: Prueba de HTML** (amplía la de «Progreso tiene la racha y el gráfico»; las demás pruebas de Progreso se conservan):

```js
test('Progreso empieza con el objetivo de hoy, con su texto y el trayecto decorativo', () => {
  const progress = sectionOf('progress');
  assert.match(progress, /<section class="goal tile" aria-labelledby="goal-title">\s*<h2 id="goal-title"[^>]*>Objetivo de hoy: dejar el repaso en cero<\/h2>/);
  assert.match(progress, /<p id="goal-text"><\/p>/);
  assert.match(progress, /<div class="trip" aria-hidden="true">/);
  assert.match(progress, /<p id="goal-answers" class="hint"><\/p>/);
  assert.match(progress, /<a class="button button-secondary" id="progress-words-go" href="#\/vocabulario">Ir a Palabras<\/a>/);
});
```

- [ ] **Step 2:** `npm test` → FALLA.
- [ ] **Step 3:** HTML del objetivo al principio de `#screen-progress` (spec 6.3, con «Empiezas el día» / «Repaso en cero» `aria-hidden`), racha y acierto de Estudiar en dos `.tile` con los ids actuales (`progress-streak-number`, `progress-streak-label`, `progress-study-percent`, `progress-study-detail`) y el Quiz en una frase debajo con `progress-quiz-percent`/`progress-quiz-detail`; `#progress-words-go` junto a `#progress-words-empty` (mismo `hidden`). En `render()`: calcular colas y pintar `goal-text`, `goal-answers` y el ancho del avance (`style.width = ${ratio * 100}%`), siempre, haya historial o no. `app.js` pasa `buildStore` y `getLessons` y vuelve a pintar Progreso al llegar las lecciones y con `buildStore.watchExternalChanges`.
- [ ] **Step 4:** `npm test` y `npm run lint` → PASAN.
- [ ] **Step 5:** Commit `feat: Progreso con el objetivo de hoy y las cifras en baldosas`.

### Task 11: «Datos y copia» — copia de seguridad, importar/exportar y ajustes

**Files:**
- Create: `js/screens/backup.js` (sale de `home.js`, que se borra)
- Modify: `index.html`, `js/app.js`, `js/screens/vocabulary.js`, `js/screens/study.js`, `css/styles.css`, `sw.js` (v32)
- Test: `tests/index-html.test.js`, `tests/precache.test.js`

**Interfaces:**
- Produces: `initBackup({ wordStore, studyStore, textStore, buildStore, backend, now = () => new Date() })` (misma lógica que la parte de copia de `initHome`).

- [ ] **Step 1: Pruebas de HTML** (reescriben «Inicio mantiene su frase y tiene la copia de seguridad», «Vocabulario tiene los botones de añadir, importar y exportar» y «Vocabulario tiene el botón del mazo junto a Importar y Exportar»):

```js
test('«Datos y copia» es un desplegable cerrado al final de Progreso con copia, archivo y ajustes', () => {
  const fold = html.match(/<details id="data-fold" class="fold">([\s\S]*?)<\/details>/)[1];
  assert.match(fold, /<summary>Datos y copia<\/summary>/);
  assert.deepEqual([...fold.matchAll(/<h3[^>]*>([^<]+)<\/h3>/g)].map((m) => m[1]), ['Copia de seguridad', 'Tus palabras en un archivo', 'Ajustes']);
  for (const [id, text] of [['backup-save', 'Guardar copia'], ['backup-restore', 'Restaurar copia'], ['vocab-import', 'Importar palabras'], ['vocab-export', 'Exportar palabras'], ['data-settings-open', 'Ajustes del estudio']]) {
    assert.match(fold, new RegExp(`id="${id}"[^>]*>${text}</button>`), id);
  }
  assert.match(fold, /<div id="data-notice" class="notice" role="alert" hidden><\/div>/);
  assert.match(fold, /<p id="data-status" class="vocab-message" role="status"><\/p>/);
  assert.match(fold, /id="backup-file"/);
  assert.match(fold, /id="vocab-file"/);
});
test('Palabras ya no tiene Importar ni Exportar, y conserva Añadir y el mazo', () => {
  const vocab = sectionOf('vocabulary');
  assert.ok(!vocab.includes('id="vocab-import"') && !vocab.includes('id="vocab-export"'));
  assert.match(vocab, /id="vocab-add"/);
  assert.match(vocab, /id="vocab-deck"/);
});
test('Aprende ya no tiene la copia de seguridad', () => {
  const learn = sectionOf('learn');
  assert.ok(!learn.includes('backup-save'));
});
```

- [ ] **Step 2:** `npm test` → FALLAN.
- [ ] **Step 3: HTML.** Mover el bloque de copia de Aprende al `<details id="data-fold" class="fold">` al final de Progreso (`#home-notice` → `#data-notice`, `#home-status` → `#data-status`), con los textos de la spec 6.3; mover `#vocab-import`, `#vocab-export` y `#vocab-file` (textos «Importar palabras» / «Exportar palabras») y añadir `#data-settings-open`.
- [ ] **Step 4: `backup.js`.** Copiar la lógica de copia de `home.js` usando `#data-notice`/`#data-status`; al confirmar la restauración, `location.hash = '#/progreso'` antes de `location.reload()`; tras la recarga, si existe la marca `app-frances-restored`, abrir `#data-fold` y escribir «Se restauró la copia del …» en `#data-status`. Borrar `home.js`; `app.js` llama a `initBackup` donde antes llamaba a `initHome`.
- [ ] **Step 5: `vocabulary.js`.** Importar y exportar escriben en `#data-notice`/`#data-status` (funciones `showDataNotice`/`sayData` junto a las de Palabras); el mazo sigue usando las de Palabras. `runImport` elige el destino según `importSource` (dentro de `#data-fold` o no). Tras importar, Progreso y Practica se actualizan (llamar a sus `refresh`/`render` que `app.js` pasa como `onWordsChanged`).
- [ ] **Step 6: `study.js`.** La ventana de ajustes se abre desde `#study-settings-open` y `#data-settings-open`; al cerrarse, el foco vuelve al botón que la abrió.
- [ ] **Step 6b: Mensajes.** En `js/lib/messages.js`, los textos que mandan a «Inicio» («restáurala en Inicio», «Guarda una copia de seguridad en Inicio»…) pasan a nombrar «Progreso › Datos y copia»; ajustar sus pruebas en `tests/messages.test.js`.
- [ ] **Step 7: CSS** de `details.fold` (resumen de 56 px con «+»/«−» en un círculo, spec 6.3); quitar `.backup*` de Inicio que ya no se use.
- [ ] **Step 8:** `sw.js` v32: entra `js/screens/backup.js`, sale `js/screens/home.js`; prueba de versión a `'v32'`. `npm test` y `npm run lint` → PASAN.
- [ ] **Step 9: Recorrido** 360 px y 1280 px, claro y oscuro: Aprende → Progreso → abrir «Datos y copia» → guardar copia, restaurar esa copia (vuelve a Progreso con el desplegable abierto y el mensaje), importar un CSV con acentos (mensaje en Progreso; Palabras y Practica muestran la cifra nueva), exportar JSON y CSV, abrir Ajustes del estudio y cerrar con Esc (el foco vuelve a su botón); objetivo correcto tras repasar una palabra con «Otra vez» y otra con «Bien».
- [ ] **Step 10:** Commit `feat: «Datos y copia» en Progreso con copia, importar, exportar y ajustes`. Informe, revisión independiente, PR a `etapa-17-rediseno`.

---

## Tanda 5 — Pulido, accesibilidad y entrega (rama `etapa-17-t5-pulido`, ~1,5–2 h)

### Task 12: Comprobaciones de accesibilidad y documentación

**Files:**
- Modify: `css/styles.css` (solo si las medidas fallan), `DESIGN.md`, `README.md`, `docs/auditoria/accesibilidad.md`, `sw.js` (v33)
- Test: `tests/styles.test.js`, `tests/precache.test.js`

- [ ] **Step 1: Pruebas de contraste** de los pares nuevos de la spec 7 que aún no cubra una prueba (estaciones `--emphasis` sobre `--surface` ≥ 3:1; borde turquesa de la lección actual ≥ 3:1 en claro y oscuro; `.today-main` y `.practice-count` ≥ 4,5:1).
- [ ] **Step 2:** `node --test tests/styles.test.js` → deben PASAR sin tocar CSS; si alguna falla, corregir el color en CSS (nunca la prueba).
- [ ] **Step 3: Medidas en el navegador** (Chromium sin ventana, 360 × 740, claro y oscuro, en las 3 pantallas y en Palabras vacía): todo `a, button, summary, select, input` visible mide ≥ 44 × 44 px (los `.text-link` en línea, ≥ 44 px de alto); ninguna página se desborda a lo ancho; con `prefers-reduced-motion: reduce` no hay transiciones; los `<kbd>` de Estudiar no se ven con puntero táctil. Mostrar la salida.
- [ ] **Step 4: Documentación.** DESIGN.md: reescribir «Estructura» y añadir «Etapa 17 · Tres destinos» con lo de la spec 7 (baldosa, barra, correspondencia, línea del día, carrusel, objetivo, contraste comprobado); «Inicio: copia de seguridad (Etapa 7)» y «Índice de lecciones (Etapa 14)» se actualizan a sus lugares nuevos. README: pantallas, direcciones, y en la lista manual: instalar desde v28, actualizar a v33, abrir un acceso guardado a `#/construir`, y recorrer con TalkBack Aprende, Practica, Progreso y «Datos y copia». `docs/auditoria/accesibilidad.md`: O1 y O2 resueltas en la Etapa 17.
- [ ] **Step 5:** `sw.js` v33; prueba de versión a `'v33'`. `npm test` y `npm run lint` → PASAN.
- [ ] **Step 6: Recorrido final completo** (360 px y 1280 px, claro y oscuro, solo tocando desde Aprende y solo con teclado): cada pantalla y su vuelta; la PWA sin conexión tras la primera carga (cortar la red en Chromium y navegar por los 3 destinos y Palabras); actualización desde v28 (servir `main`, cargar, servir la rama, comprobar el aviso «Actualizar» y que tras pulsarlo se abre Aprende con los datos intactos).
- [ ] **Step 7:** Commit `docs: DESIGN.md, README y auditoría de la etapa 17; caché v33`. Informe, revisión independiente de la tanda y **revisión de la rama completa** `etapa-17-rediseno` frente a `main`; PR `etapa-17-rediseno` → `main` para que lo mergee el usuario.
