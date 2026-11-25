# Etapa 14 — Índice de lecciones como ruta: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir la lista de Construir frases en una ruta vertical que muestre:
- las 24 lecciones (9 disponibles y 15 «Próximamente»);
- el estado en texto, con el resultado de la última práctica y la fecha;
- un botón «Continuar»;
- el progreso v2 en la copia de seguridad v5, con migración.

**Architecture:**
- **Índice de lecciones v2** (`data/lessons/fr/index.json`), validado y leído por `js/lib/lessons.js`.
- **Lógica pura de la ruta** en `js/lib/lesson-route.js` (`lessonState`, `nextLesson`, `formatDay`).
- **Progreso por lección v2:** `lastPractice` en `js/lib/build-storage.js`, con migración, y la copia v5 en `js/lib/backup.js`.
- **Pantalla:** `js/screens/build.js` y su HTML y CSS.

**Tech Stack:** JS en módulos sin dependencias nuevas, `localStorage`, `node --test` y ESLint.

**Spec:** `docs/superpowers/specs/2026-11-25-etapa-14-indice-lecciones-design.md`

## Global Constraints
- **Regla del usuario (decisión 10): no se hace ningún commit de código** hasta mostrarle las salidas reales de las pruebas y recibir su visto bueno.
  - Los agentes **no hacen commit**. Al aprobar una tarea, el controlador la marca con `git add`, sin commit, y la tarea siguiente se revisa con `git diff`.
  - Los commits se hacen al final, con el visto bueno del usuario.
- TDD: primero la prueba, verla fallar y luego el código mínimo. Nunca se debilita una prueba.
- Sin push, sin deploy y sin dependencias nuevas.
- Todo texto se pinta con `textContent`.
- Nombres en inglés; comentarios breves y textos de la interfaz en español.
- **Índice v2:** `{ format: 'app-frances-lecciones', version: 2, lang: 'fr', lessons: [{ id, lang, level, title, status }] }`.
  - `status` ∈ `available` o `planned`; `level` ∈ `A1` o `A2`.
  - `id` con el patrón actual `^[a-z]{2}-a[12]-\d{2}$`.
  - La versión 1 ya no se acepta.
- **Lecciones planificadas, en este orden, después de `fr-a1-09`:**
  - fr-a1-10 «Posesivos y demostrativos»
  - fr-a1-11 «Verbos pronominales»
  - fr-a1-12 «El imperativo»
  - fr-a1-13 «Venir de e il faut + infinitivo»
  - fr-a1-14 «Preposiciones de lugar y de tiempo»
  - fr-a1-15 «Conectores: et, ou, mais, parce que, pour»
  - fr-a2-01 «Passé composé con avoir»
  - fr-a2-02 «Passé composé con être»
  - fr-a2-03 «Pronombres de complemento directo (le, la, les)»
  - fr-a2-04 «Los pronombres y y en»
  - fr-a2-05 «El imperfecto (iniciación)»
  - fr-a2-06 «El futuro simple»
  - fr-a2-07 «Comparativo y superlativo»
  - fr-a2-08 «Qui, que, où para unir frases»
  - fr-a2-09 «Ortografía avanzada»
- **Progreso:**
  - `app-frances-build` con `schemaVersion: 2`;
  - `progress[id].lastPractice = { firstTry, total, date }`, con enteros `0 ≤ firstTry ≤ total`, `total ≥ 1` y `date` `AAAA-MM-DD`; es opcional.
- **Copia de seguridad:** `BACKUP_VERSION = 5`. Lee las versiones 1 a 5; una v4 migra `build` a v2.
- **Textos de estado:**
  - «Próximamente»;
  - «No se pudo cargar»;
  - «Sin empezar»;
  - «En curso: X de Y»;
  - «Completada · F de T a la primera · DD/MM/AAAA»;
  - «Completada · DD/MM/AAAA».
- **Botón:** «Continuar: Lección N · Título». Sin pendientes: «Completaste todas las lecciones disponibles».
- `sw.js`: `CACHE_VERSION = 'v24'` (la sube la Tarea 1). Cada archivo nuevo va en `PRECACHE_URLS`.

## Review Focus
1. **Restaurar una copia v4 hecha antes de esta etapa:** el progreso y las tarjetas se conservan, migrados a v2, y nada se pierde (Tarea 3).
2. **Abrir la app con progreso v1 guardado:** se migra al cargar. Si no se puede guardar la migración, la app sigue con los datos en memoria y avisa (Tarea 3).
3. **Una lección planificada nunca entra en la cola del repaso, en «Continuar» ni en «Seguir lección» de Inicio,** ni se puede abrir escribiendo `#/construir/fr-a1-10` (Tareas 1, 2 y 4).
4. **Repetir una lección completada** reemplaza `lastPractice` al terminar. Abandonarla a medias no lo cambia (Tarea 3).
5. **El lector de pantalla no anuncia las planificadas como enlaces,** y sí anuncia el estado en cada fila (Tarea 4).

---

### Task 1: Índice de lecciones v2 y lector
**Files:**
- Modify: `data/lessons/fr/index.json`, `js/lib/lessons.js`, `tests/lessons.test.js`, `tests/lessons-content.test.js` y `sw.js` (`v24`).
- Modify (para ignorar las planificadas): `js/screens/build.js` (la lista actual solo muestra las `available`, hasta la Tarea 4) y `js/screens/home.js`.

**Produces:**
- `INDEX_VERSION = 2` y `LESSON_STATUSES = ['available', 'planned']`;
- `validateLessonIndex(index): { ok, errors: string[] }`;
- `loadLessons({ fetch, lang })` → `[{ id, lang, level, title, status, lesson, error }]` en el orden del índice.
  - Las `planned` vuelven con `lesson: null` y `error: null`, sin descargar nada.
  - Las `available` se comportan como hoy (`'missing'` / `'invalid'`).
  - Una `available` cuyo archivo tiene otro `title` o `lang` que el índice → `'invalid'`.

- [ ] **Paso 1: pruebas que fallan.**
  - **`validateLessonIndex`:**
    - acepta uno válido;
    - rechaza la versión 1, un `id` repetido, un `lang` distinto del índice, un `status` desconocido, un `title` vacío, un `level` `'B1'` y un `id` fuera del patrón.
  - **`loadLessons`**, con un `fetch` falso:
    - no pide los archivos de las `planned`;
    - devuelve sus campos;
    - un título distinto entre el índice y el archivo → `'invalid'`.
  - **Contenido real** (`lessons-content.test.js`):
    - el índice pasa la validación;
    - 24 entradas exactamente en el orden de Global Constraints;
    - las 9 primeras `available` y las 15 restantes `planned`;
    - cada `available` tiene archivo y su `title` coincide;
    - ninguna `planned` tiene archivo.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. La pantalla y la tarjeta de Inicio filtran `status === 'available'`; el resto no cambia. **Paso 4:** `npm test` y `npm run lint` pasan. **Sin commit.**

### Task 2: Lógica de la ruta
**Files:** Create `js/lib/lesson-route.js` y `tests/lesson-route.test.js`. Modify `js/screens/home.js` (usa `nextLesson`) y `sw.js` (precarga).

**Consumes:** `lessonStatus(lesson, progress)` (`build-review.js`) y las entradas de la Tarea 1.

**Produces:**
- `formatDay('2026-11-25')` → `'25/11/2026'`;
- `lessonState(entry, progress)` → `{ kind, text }`, con `kind` ∈ `planned`, `error`, `new`, `started` o `done`, y los textos exactos de Global Constraints.
  - «En curso» usa `correct` y `total` de `lessonStatus`.
  - «Completada» usa `lastPractice` si existe; si no, `progress.completedAt`.
- `nextLesson(entries, progressMap)` → la primera entrada `available`, con `lesson` y no `done`, o `null`.
- `lessonNumber(entries, id)` → su posición en la ruta, empezando en 1.

- [ ] **Paso 1: pruebas que fallan.**
  - **`lessonState`:** los 6 casos con sus textos exactos, por ejemplo:
    - «Completada · 8 de 10 a la primera · 25/11/2026»;
    - «Completada · 24/11/2026», sin `lastPractice`.
  - **`nextLesson`:**
    - salta las completadas, las `planned` y las que no cargaron;
    - devuelve `null` si todas están completas.
  - **`lessonNumber`:** `fr-a2-01` → 16.
  - **`formatDay`.**
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. Inicio usa `nextLesson` para «Próxima lección» y «Seguir lección». **Paso 4:** pruebas y linter. **Sin commit.**

### Task 3: Progreso v2, `lastPractice` y copia de seguridad v5
**Files:** Modify `js/lib/build-storage.js`, `js/lib/backup.js`, `js/screens/build.js` (registrar la práctica al terminarla), `js/screens/home.js` (el texto de restaurar, si cambia), `js/lib/messages.js` (aviso si no se pudo guardar la migración), y sus pruebas (`tests/build-storage.test.js`, `tests/backup.test.js`, `tests/messages.test.js`).

**Produces:**
- `createBuildStore(...).recordPractice({ lessonId, firstTry, total, today })`: guarda o reemplaza `lastPractice` con `date: today`. Si guardar falla, lanza `StorageError` y la memoria no cambia.
- `load()` → `{ corruptBackupKey, migrationError }`.
  - Un documento v1 válido se reescribe como v2.
  - Si esa escritura falla, `migrationError` es el `StorageError` y los datos siguen en memoria. Es el mismo patrón que `createWordStore` en `js/lib/storage.js`.
- `validateBuildDoc` acepta `lastPractice` opcional y valida sus campos.
- `migrateBuildDoc(doc)` → el doc v2, sin otros cambios. La usan el almacén y la copia.
- **Copia de seguridad:**
  - `BACKUP_VERSION = 5`;
  - `buildBackup` escribe `build` v2;
  - `readBackup` acepta las versiones 1 a 5 y migra el `build` de una v4;
  - `restoreBackup` escribe `schemaVersion: 2`.
- **En la pantalla:** al terminar una práctica completa, `build.js` llama a `recordPractice` con `firstTry` (ejercicios acertados al primer intento en esa práctica) y `total` (ejercicios de la lección). Una práctica abandonada no llama a nada.

- [ ] **Paso 1: pruebas que fallan.**
  - **`recordPractice`:** guarda y reemplaza. Si `setItem` lanza, `StorageError` y la memoria intacta.
  - **Migración:**
    - un v1 se carga, queda v2 y conserva `progress` y `cards`;
    - con `setItem` que falla al migrar → `migrationError` y los datos en memoria.
  - **Validación:**
    - `lastPractice` con `firstTry > total`, `total: 0` o una fecha `'25/11/2026'` → inválido;
    - sin `lastPractice` → válido.
  - **Copia:**
    - una v5 hace ida y vuelta con `lastPractice`;
    - una v4 se lee y su `build` queda v2;
    - una v3 deja intacto `app-frances-build`;
    - una v6 da el aviso «más nueva»;
    - si falla una escritura, se deshacen todas.
    - Las pruebas que fijan `version: 4` pasan a 5 con las mismas aserciones.
  - **Mensaje:** el texto exacto del aviso de migración, igual al patrón de Palabras: «No se pudo actualizar tu progreso de frases.» / «La app sigue funcionando; vuelve a abrirla más tarde.».
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. El aviso se muestra en Construir, junto al de `buildLoadNotice`. **Paso 4:** pruebas y linter. **Sin commit.**

### Task 4: La ruta en pantalla (frontend-design + DESIGN.md)
**Files:** Modify `js/screens/build.js` (la lista pasa a ser ruta), `index.html`, `css/styles.css`, `DESIGN.md` (sección «Índice de lecciones (Etapa 14)»), `README.md`, `tests/index-html.test.js` y `tests/styles.test.js`.

**Consumes:** `lessonState`, `nextLesson`, `lessonNumber` (Tarea 2), las entradas de la Tarea 1 y el progreso de la Tarea 3.

- [ ] **Paso 1: diseño.** Usar la skill frontend-design con DESIGN.md:
  - línea vertical turquesa `--line-build`, discontinua en el tramo planificado;
  - estaciones según el estado:
    - completada: llena con ✓;
    - en curso: con un punto;
    - sin empezar: vacía;
    - planificada: punteada;
  - tramos con su título «A1» y «A2».
  - El texto atenuado de las planificadas debe tener un contraste ≥ 4,5:1 en claro y en oscuro; agregar su prueba en `styles.test.js`.
- [ ] **Paso 2: pruebas que fallan** (`index-html.test.js`):
  - el contenedor de la ruta;
  - el botón `#build-continue`, con el texto «Continuar» como base;
  - el texto de «sin pendientes»;
  - «Repasar (N)» sigue arriba.
- [ ] **Paso 3: implementar.**
  - Un `<h2>` («A1», «A2») y un `<ol>` por tramo.
  - En cada `<li>`, la estación con `aria-hidden="true"`, el texto «Lección N · Título» y el estado.
  - **Las `available`:** toda la fila es un `<a href="#/construir/<id>">` de al menos 56 px, con foco visible. La siguiente pendiente lleva `aria-current="step"`.
  - **Las `planned`:** texto atenuado, sin enlace y sin `aria-disabled`.
  - **Continuar:** `#build-continue` dice «Continuar: Lección N · Título» y abre `#/construir/<id>`. Sin pendiente, se oculta y aparece «Completaste todas las lecciones disponibles».
  - **`#/construir/<id-planificada>`** vuelve a la lista, como un `id` desconocido.
- [ ] **Paso 4:** `npm test`, `npm run lint` y `cd server && node --test` pasan. Recorrido en Chromium sin interfaz:
  - 360 y 1280 px, en modo claro y oscuro;
  - solo con teclado;
  - sin conexión;
  - restaurar una copia v4 preparada;
  - repetir una lección completada y ver el resultado nuevo con la fecha.

  Capturas solo en la carpeta temporal de la sesión. **Sin commit.**

### Task 5: Resultados al usuario y commits (el controlador, con el usuario)
- [ ] **Paso 1:** ejecutar `npm test`, `npm run lint` y `cd server && node --test`, y mostrarle al usuario la salida real y el resumen de cambios.
- [ ] **Paso 2 (con su visto bueno):** hacer los commits por área, en español:
  - índice v2;
  - lógica de la ruta;
  - progreso v2 y copia v5;
  - pantalla y diseño.
- [ ] **Paso 3 (con confirmación):** push y PR. Tras el merge, comprobar que Pages sirve `v24`.
- [ ] **Paso 4:** prueba del usuario en el teléfono e informe de cierre.
