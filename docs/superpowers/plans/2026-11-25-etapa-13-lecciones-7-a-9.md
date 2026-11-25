# Etapa 13 — Lecciones 7 a 9: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a Construir frases las lecciones 7 (adjetivos), 8 (*aller*, *faire* y futuro próximo) y 9 (*vouloir*, *pouvoir*, *devoir* y *je voudrais*) como datos verificados, más 3 casos nuevos en la prueba real de Claude.

**Architecture:** Solo contenido.
- Lecciones nuevas: archivos JSON en `data/lessons/fr/`, con el formato de la Etapa 12, validados por `js/lib/lessons.js`.
- Documento de revisión: `docs/contenido/construir-frases.md`, en sincronía con los JSON.
- Pruebas de contenido: `tests/lessons-content.test.js`.
- Prueba real: `server/eval/`.

No cambia la lógica ni las pantallas.

**Tech Stack:** JSON, `node --test` y ESLint. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-25-etapa-13-lecciones-7-a-9-design.md` (diseño corto) + `docs/superpowers/specs/2026-11-25-etapa-12-construir-frases-design.md` (formato y reglas de contenido).

## Global Constraints
- **TDD:** primero la prueba, verla fallar y luego el contenido o el código mínimo. Nunca se debilita una prueba.
- **Git solo local:** rama `etapa-13-lecciones-7-a-9`.
  - Commits en español, con `-m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
  - Sin push, sin deploy y sin llamar a Claude ni a Cloudflare.
- **Formato de lección:** el mismo de las lecciones 1 a 6.
  - Los `id` son `fr-a1-07`, `fr-a1-08` y `fr-a1-09`, con `level: 'A1'`.
  - Cuentas: 4 a 6 ejemplos; 8 a 10 ejercicios con al menos 2 de cada tipo (`order`, `gap`, `fix`); 1 o 2 situaciones con 2 a 4 modelos; al menos una trampa; `think` con contraste español-francés.
- **Francés:**
  - apóstrofo recto;
  - espacio normal antes de `? ! :`;
  - sustantivos siempre con artículo;
  - vocabulario A1 que esté en las lecciones 1 a 9;
  - todo dato sin fuente, incluida la pronunciación, va `review: true` con `reviewNote`.
- **Fuera de alcance:** las formas *bel, nouvel, vieil* y los femeninos irregulares (*belle, vieille, nouvelle*). *beau, vieux* y *nouveau* solo entran si una fuente los confirma como A1; si no, se dejan fuera (no se marcan REVISAR).
- **Fuentes:**
  - **Inventaire:** https://www.eaquals.org/wp-content/uploads/Inventaire_ONLINE_full.pdf. Anexo D, págs. 49–52; anexo E, págs. 56–57; anexo F, págs. 62–67. Página del PDF = página impresa + 2.
  - **Niveau A2 pour le français, cap. 5:** https://bop.fipf.org/wp-content/uploads/2017/03/refa343342.pdf.
    - Págs. 101–112.
    - p. 106: flexión de *aller, vouloir, pouvoir, devoir, faire*.
    - p. 108: GN V VInf.
    - p. 109: Adj N / N Adj.
  - **BDL (OQLF):** https://vitrinelinguistique.oqlf.gouv.qc.ca/.
  - Cada página citada se comprueba contra el texto de la fuente.
- **Respuestas aceptadas:** nunca se rechaza una respuesta correcta. Se aceptan las variantes naturales:
  - *Moi, je…*;
  - complemento al inicio o al final;
  - *ne… pas* donde corresponda;
  - si la lección enseña el futuro próximo, *je vais* + infinitivo y no el futuro simple.

  O bien el enunciado fuerza una sola forma y un `mistake` explica la otra.
- `sw.js`: `CACHE_VERSION = 'v23'` (la sube la Tarea 1). Cada JSON nuevo va en `PRECACHE_URLS`.

## Review Focus
1. **Concordancia con sustantivos que el alumno no sabe si son masculinos o femeninos:** cada ejercicio de adjetivos debe dar el artículo o el género en el enunciado, para que la respuesta no sea una adivinanza (Tarea 1; lo comprueba la revisión de contenido).
2. **Adjetivos que cambian de sentido según su posición, o que van antes:** no enseñar una regla absoluta («siempre después»). La lista de los que van antes debe salir de la fuente (Tarea 1).
3. **Futuro próximo frente a presente:** un ejercicio cuyo enunciado en español admite presente y futuro próximo no debe rechazar ninguno, salvo que el enunciado fuerce uno (Tarea 2).
4. ***je voudrais* frente a *je veux*:** las dos son francés correcto. Solo se marca *je veux* cuando el enunciado pide cortesía, y el `mistake` explica la diferencia sin decir que es incorrecto (Tarea 2).
5. **Pruebas del servidor:** el criterio de la prueba real sube a 10 errores, y sus pruebas siguen discriminando: un caso fallado entre los 10 hace fallar el criterio (Tarea 3).

---

### Task 1: Lección 7 — Los adjetivos
**Files:** Create `data/lessons/fr/fr-a1-07.json`. Modify `data/lessons/fr/index.json`, `docs/contenido/construir-frases.md`, `tests/lessons-content.test.js` (lista exacta del índice) y `sw.js` (`v23` y el JSON).

**Consumes:** `validateLesson` (`js/lib/lessons.js`), `checkExercise` (`js/lib/sentence-check.js`) y el formato y estilo de `fr-a1-01` … `fr-a1-06` y del documento.

**Contenido:**
- concordancia en género y número (*petit / petite / petits / petites*);
- los adjetivos terminados en *-e* no cambian en femenino (*rouge*);
- posición: en general después (*une voiture rouge*, *une amie chilienne*), y unos pocos cortos y frecuentes antes (*grand, petit, bon, jeune, joli, mauvais*), según la fuente.

Áreas: `grammar`, `syntax` y `spelling`.

- [ ] **Paso 1:** en `tests/lessons-content.test.js`, la lista exacta del índice pasa a `['fr-a1-01', …, 'fr-a1-07']`. Ver que falla.
- [ ] **Paso 2:** escribir la lección verificando cada regla. Agregar su sección al documento, con fuentes, filas, REVISAR y motivos.
- [ ] **Paso 3:** pasar todos los ejercicios por `checkExercise` con `requireAccents: true`:
  - cada respuesta aceptada → correcta;
  - cada `mistake` → su explicación;
  - las variantes correctas que se te ocurran → correctas.
- [ ] **Paso 4:** `npm test` y `npm run lint` pasan. Commit `feat: lección 7 de Construir frases (adjetivos)`.

### Task 2: Lecciones 8 y 9 — Verbos frecuentes, futuro próximo y *je voudrais*
**Files:** Create `data/lessons/fr/fr-a1-08.json` y `fr-a1-09.json`. Modify `data/lessons/fr/index.json`, `docs/contenido/construir-frases.md`, `tests/lessons-content.test.js` y `sw.js`.

**Consumes:** lo mismo que la Tarea 1. La lección 7 ya existe.

**Contenido:**
- **8 · *Aller*, *faire* y el futuro próximo:**
  - presente completo de *aller* y *faire*;
  - *aller* + infinitivo (*je vais manger*);
  - negación *je ne vais pas* + infinitivo;
  - *aller au / à la / à l'* (repasa la lección 3).
- **9 · Querer, poder y deber:**
  - presente completo de *vouloir, pouvoir, devoir*;
  - verbo + infinitivo (*je peux venir*);
  - *je voudrais* + sustantivo o infinitivo para pedir con cortesía, frente a *je veux*.

Áreas: `grammar` y `syntax`.

- [ ] **Paso 1:** la lista exacta del índice pasa a `['fr-a1-01', …, 'fr-a1-09']`. Ver que falla.
- [ ] **Paso 2:** escribir las dos lecciones verificando cada regla, con sus secciones del documento.
- [ ] **Paso 3:** pasada de `checkExercise`, como en la Tarea 1.
- [ ] **Paso 4:** `npm test` y `npm run lint` pasan. Commit `feat: lecciones 8 y 9 de Construir frases`.

### Task 3: Tres casos nuevos en la prueba real de Claude (sin red)
**Files:** Modify `server/eval/sentence-cases.json`, `server/eval/score-sentence.js` (`ERROR_CASES = 10`), `server/tests/score-sentence.test.js` y `README.md` (la línea de la prueba: 16 frases y 10 errores).

**Casos nuevos** (`expect: 'error'`), cada uno con la `situation` y el `focus` en español de su lección:
- `Ma sœur est petit.` → `accepted: ['Ma sœur est petite.']` (lección 7);
- `Je vais mange une pomme.` → `['Je vais manger une pomme.']` (lección 8);
- `Tu peux viens demain ?` → `['Tu peux venir demain ?']` (lección 9).

- [ ] **Paso 1: pruebas que fallan.**
  - hay 16 casos: 10 de error, 3 correctas y 3 correctas con sugerencia;
  - los 3 casos nuevos aparecen tal cual;
  - `meetsCriterion` con 10 errores bien → `true`;
  - con uno de los 10 fallado → `false`.
- [ ] **Paso 2:** ver que fallan. **Paso 3:** implementar. **Paso 4:** `cd server && node --test` y `npm run lint` pasan. **No ejecutar** `compare-sentence.mjs`. Commit `test: tres casos de las lecciones 7 a 9 en la prueba real`.

### Task 4: Prueba real, publicación y teléfono (el controlador, con el usuario)
- [ ] **Paso 1 (con permiso):** `cd server && node eval/compare-sentence.mjs`.
  - Si no se cumple el criterio, se ajustan las instrucciones en `server/src/prompt.js` y se repite, hasta 3 veces.
  - Si cambian las instrucciones, se vuelve a publicar el servidor, con confirmación: `npm run deploy --prefix server`, y se comprueba que `/sentence` sin código responda 401.
- [ ] **Paso 2:** revisión rápida en el navegador: abrir las lecciones 7, 8 y 9 a 360 px y resolver un ejercicio de cada una.
- [ ] **Paso 3 (con confirmación):** push de la rama y PR a `main`. Tras el merge, comprobar que Pages sirve `v23`.
- [ ] **Paso 4:** el usuario revisa las lecciones y las prueba en el teléfono.
- [ ] **Paso 5:** informe de cierre con los 6 puntos de CLAUDE.md y la lista de decisiones tomadas.
