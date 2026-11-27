# Etapa 16 — Segunda tanda, subtanda 1: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activar cinco lecciones nuevas de Construir frases (`fr-a1-10`, `fr-a2-01` a `fr-a2-04`) como datos, con fuentes oficiales y REVISAR donde no se confirme, más caché, pruebas y lista de revisión.

**Architecture:** Solo datos y pruebas: cada lección es un JSON en `data/lessons/fr/` con el formato de `fr-a1-09.json`, su sección en `docs/contenido/construir-frases.md`, su entrada `available` en `index.json` y su ruta en la precarga de `sw.js`. La mecánica (ejercicios sin IA, frase libre con `/sentence`, repaso de errores repetidos) no cambia.

**Tech Stack:** JSON, `node --test`, ESLint. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-11-27-etapa-16-segunda-tanda-1-design.md`

## Global Constraints

- **Sin commits** hasta que el usuario vea los resultados (decisión 4). Cada tarea deja sus cambios en el árbol de trabajo de la rama `etapa-16-segunda-tanda-1`; la revisión de cada tarea usa `git diff` (y `git status` para archivos nuevos) de los archivos de esa tarea.
- Formato y cuentas de cada lección: 4 a 6 ejemplos; 8 a 10 ejercicios con al menos 2 de cada tipo (`order`, `gap`, `fix`); 1 o 2 situaciones con 2 a 4 modelos; al menos una trampa y un «cómo pensarlo»; `explainLang: "es"`; ids `i*`, `t*`, `e*`, `p*`, `x*`, `s*` como en `fr-a1-09.json`.
- Cada elemento lleva `sourceIds` que existen en `sources` de la lección; lo no confirmado lleva `review: true` y `reviewNote` que dice qué fuente se consultó y qué falta.
- Francés correcto y natural (acentos, artículos, concordancia); vocabulario A1/A2; nunca rechazar una respuesta correcta (todas las variantes naturales en `answers`, o el enunciado fuerza una); ningún `mistakes[].answer` igual a una respuesta aceptada.
- Fuera de alcance en los ejemplos y ejercicios: verbos pronominales, imperativo, concordancia del participio con COD antepuesto, *le mien / celui*, *-ci / -là*, *mourir*.
- Verbos con *être* en `fr-a2-02`: *aller, venir, partir, arriver, entrer, sortir, rester, tomber, naître*.
- Si una fuente pone un punto en otro nivel: dejarlo fuera y anotarlo en el documento de revisión; si queda fuera el **tema central** de la lección, detenerse y preguntar al usuario.
- `CACHE_VERSION = 'v27'`. Títulos del índice sin cambios.
- Pruebas: `npm test` y `npm run lint` desde la raíz.

## Review Focus

1. **Respuestas correctas rechazadas** (orden alternativo natural, *Hier, j'ai…* / *J'ai… hier*) → cada `order` lista las variantes; la prueba de contenido pasa cada `answers` y cada `mistakes` por `checkExercise` (Tareas 2–6).
2. **Apóstrofo tipográfico (’) frente a recto (') en *l'*, *j'y*, *n'en*** → `checkExercise` acepta ambos; agregar un caso por lección con `’` en la prueba de contenido (Tareas 2–6).
3. **Concordancia en *être*** (*elle est allée*, *ils sont partis*, *nous sommes arrivés / arrivées*) → si el sujeto admite dos géneros, el enunciado lo fija o `answers` acepta ambos (Tarea 4).
4. **Ruta con hueco** (planificadas entre disponibles) → «Continuar» y la numeración correctas (Tarea 7).
5. **Copia con progreso de las lecciones nuevas** → ida y vuelta sin perder nada (Tarea 7).

---

### Task 1: Notas de fuentes

**Files:**
- Create: `/tmp/claude-1000/-home-joaquint255-APP-FRANCES-App-frances/be4ad0ff-9730-4cf7-946c-ff3231dc99b5/scratchpad/etapa16-fuentes.md` (no va al repositorio)

**Interfaces:**
- Produces: para cada una de las 5 lecciones, las citas textuales con página o URL que respaldan cada regla del spec (tabla «Contenido»), el nivel que da el Inventaire, y lo que no se encontró. Ids de fuente propuestos con el estilo de `fr-a1-09.json` (`inventaire-d`, `inventaire-f`, `niveau-a2`, `bdl-<tema>`).

- [ ] **Step 1:** Leer el Inventaire (anexos D y F, URL en `fr-a1-09.json`), el *Niveau A2* capítulo 5 y los artículos BDL de: déterminant possessif; déterminant démonstratif (*cet*); passé composé y choix de l'auxiliaire; accord du participe passé avec *être*; place du pronom personnel complément; pronoms *en* et *y*.
- [ ] **Step 2:** Escribir el archivo de notas: por lección, regla → cita → fuente (página/URL) → nivel; y una sección «No confirmado».
- [ ] **Step 3:** Si el Inventaire o el *Niveau A2* ponen el tema central de una lección fuera de A1/A2, detenerse y preguntar al usuario antes de seguir.

---

### Task 2: Lección `fr-a1-10` Posesivos y demostrativos

**Files:**
- Create: `data/lessons/fr/fr-a1-10.json`
- Modify: `data/lessons/fr/index.json` (status `available`), `docs/contenido/construir-frases.md` (sección «Lección 10 · Posesivos y demostrativos (fr-a1-10)», mismo formato de 6 columnas), `sw.js` (`data/lessons/fr/fr-a1-10.json` en `PRECACHE_URLS`)
- Test: `tests/lessons-content.test.js`, `tests/precache.test.js` si enumera las lecciones

**Interfaces:**
- Consumes: notas de la Tarea 1.
- Produces: en `tests/lessons-content.test.js`, la constante `AVAILABLE_IDS` (lista de ids disponibles en orden) que reemplaza `i < 9` en la prueba del índice; las Tareas 3–6 le agregan su id.

- [ ] **Step 1: Prueba que falla.** En `tests/lessons-content.test.js`, cambiar la prueba del índice para usar `AVAILABLE_IDS = ['fr-a1-01', …, 'fr-a1-09', 'fr-a1-10']`: `e.status === (AVAILABLE_IDS.includes(e.id) ? 'available' : 'planned')` y el archivo existe solo para esos; actualizar su título («…y solo las disponibles tienen archivo»). Agregar un caso con `’` en un ejercicio `gap` u `order` de esta lección (Review Focus 2).
- [ ] **Step 2:** `npm test -- tests/lessons-content.test.js` → FAIL (falta `fr-a1-10.json`).
- [ ] **Step 3:** Escribir la lección según el spec (tabla «Contenido», fila `fr-a1-10`) y las notas: idea (posesivo concuerda con lo poseído; *mon* ante vocal; *ce/cet/cette/ces*), patrón (bloques de posesivos y demostrativos), trampa para hispanohablantes (*su* = *son/sa/ses* o *leur/leurs*; *ma amie* ✗), ortografía en una trampa o `fix` (*cet* ante vocal o h muda). Áreas: `grammar`, `spelling`. Sección del documento, entrada del índice y precarga.
- [ ] **Step 4:** `npm test && npm run lint` → PASS.
- [ ] **Step 5:** Sin commit. Listar los archivos tocados en el informe.

---

### Task 3: Lección `fr-a2-01` Passé composé con *avoir*

Igual que la Tarea 2, con `fr-a2-01`, sección «Lección 16 · Passé composé con avoir (fr-a2-01)» y la fila `fr-a2-01` del spec: *avoir* + participio; *-er* → *-é*; irregulares frecuentes confirmados por las notas (de *fait, pris, vu, bu, lu, eu, été, dit, écrit*, solo los que tengan fuente; el resto fuera); *je n'ai pas mangé*; *hier, ce matin, la semaine dernière*. Trampa: *je mangé* ✗ (falta el auxiliar); *j'ai mangé* ≠ «he comido» solamente (también «comí»). Ortografía: *-é* del participio frente a *-er* del infinitivo. Áreas: `grammar`, `syntax`, `spelling`. Agregar `'fr-a2-01'` a `AVAILABLE_IDS` (prueba roja primero).

---

### Task 4: Lección `fr-a2-02` Passé composé con *être*

Igual que la Tarea 2, con `fr-a2-02`, sección «Lección 17 · Passé composé con être (fr-a2-02)»: *être* + participio con los 9 verbos de las Global Constraints; concordancia con el sujeto (*-e*, *-s*, *-es*); negación (*elle n'est pas venue*). Trampa: *elle a allé* ✗; *elle est allé* ✗. Review Focus 3: con *nous, vous, ils* o un nombre que no fija el género, el enunciado lo fija o `answers` acepta las dos formas. Áreas: `grammar`, `spelling`. Agregar `'fr-a2-02'` a `AVAILABLE_IDS`.

---

### Task 5: Lección `fr-a2-03` Pronombres COD *le, la, les*

Igual que la Tarea 2, con `fr-a2-03`, sección «Lección 18 · Pronombres de complemento directo (le, la, les) (fr-a2-03)»: reemplazan un complemento directo; antes del verbo conjugado; con negación (*je ne le vois pas*); delante del infinitivo (*je vais le voir*); elisión *l'*. Sin passé composé con pronombre. Trampa: *je vois le* ✗; *je le vais voir* ✗. Áreas: `grammar`, `syntax`. Agregar `'fr-a2-03'` a `AVAILABLE_IDS`.

---

### Task 6: Lección `fr-a2-04` Los pronombres *y / en*

Igual que la Tarea 2, con `fr-a2-04`, sección «Lección 19 · Los pronombres y / en (fr-a2-04)»: *y* = *à* + lugar (*j'y vais*); *en* = *de* + cosa y con cantidades (*j'en veux deux*, *il y en a trois*); misma posición que el COD; negación (*je n'y vais pas*, *je n'en veux pas*). *y/en* con verbos de régimen o passé composé solo si las notas lo confirman en A2; si no, fuera. Trampa: *je vais y* ✗; *je veux deux* sin *en* cuando se omite el sustantivo. Áreas: `grammar`, `syntax`. Agregar `'fr-a2-04'` a `AVAILABLE_IDS`.

---

### Task 7: Caché, ruta, copia de seguridad y puntaje de la prueba real

**Files:**
- Modify: `sw.js` (`CACHE_VERSION = 'v27'`), `server/eval/score-sentence.js` (`ERROR_CASES = 15` y su comentario de criterio), `server/eval/sentence-cases.json` (5 casos de error del spec, con `situation`, `focus`, `sentence`, `expect: "error"`, `accepted`)
- Test: `tests/precache.test.js` / `tests/index-html.test.js` (v27), `tests/lesson-route.test.js`, `tests/backup.test.js`, `server/tests/score-sentence.test.js`

- [ ] **Step 1: Pruebas que fallan**
  - caché: `CACHE_VERSION` es `'v27'`;
  - `lesson-route`: con el índice real (`AVAILABLE` = 1–10 y `fr-a2-01`–`04`) y progreso que completa `fr-a1-01`–`fr-a1-10`, `nextLesson` es `fr-a2-01`, `continueLabel` empieza por `Continuar: Lección 16 ·`; `openableLesson(entries, 'fr-a1-11')` es `null`; `routeRows` marca `fr-a1-11`–`15` como `planned` sin `href`;
  - `backup`: una copia v6 con `build.progress['fr-a2-02']` (con `lastPractice`) y una tarjeta `ex:fr-a2-02:x3` hace ida y vuelta igual; una v5 con progreso solo de `fr-a1-01` se restaura sin cambios;
  - `score-sentence`: `meetsCriterion` exige 15 errores corregidos.
- [ ] **Step 2:** `npm test` → FAIL en esas.
- [ ] **Step 3:** Cambiar `CACHE_VERSION`, `ERROR_CASES` y agregar los 5 casos: `Ma amie arrive.` → `Mon amie arrive.`; `Hier, je mangé une pomme.` → `Hier, j'ai mangé une pomme.`; `Elle est allé au cinéma.` → `Elle est allée au cinéma.`; `Je vois le.` → `Je le vois.`; `Je vais y demain.` → `J'y vais demain.` (cada `focus` nombra el tema de su lección).
- [ ] **Step 4:** `npm test && npm run lint` → PASS. Sin commit.

---

### Task 8: Recorrido y lista de revisión

- [ ] **Step 1:** Recorrido con un servidor falso (sin llamar al Worker real), a 360 y 1280 px, claro y oscuro, entrando a Construir **desde Inicio con toques** (la barra del móvil no tiene Construir): abrir cada lección nueva, resolver un ejercicio de cada tipo, fallar dos veces uno y verlo en el repaso, frase libre, «Continuar», sin conexión. Capturas en el scratchpad.
- [ ] **Step 2:** Lista de revisión del usuario en `/tmp/claude-1000/-home-joaquint255-APP-FRANCES-App-frances/be4ad0ff-9730-4cf7-946c-ff3231dc99b5/scratchpad/etapa16-lista-revision.md`: por lección, todo el francés nuevo (ejemplos, ejercicios con `answers` y `mistakes`, trampas, modelos), primero lo REVISAR con su nota y fuente.
- [ ] **Step 3:** `npm test && npm run lint` con la salida real.

---

### Task 9: Mostrar al usuario, prueba real y commits (con su permiso)

- [ ] **Step 1:** Mostrar al usuario el resumen, `git status`, las pruebas y la lista de revisión. **Esperar su visto bueno.**
- [ ] **Step 2:** Con su permiso: `cd server && node eval/compare-sentence.mjs` (menos de un centavo). Si falla un caso nuevo, ajustar instrucciones hasta 3 veces; republicar el servidor solo si cambian, con confirmación.
- [ ] **Step 3:** Commits pequeños en español: primero el spec y el plan; luego uno por lección (JSON + su línea del índice + su sección del documento + su línea de precarga, con `git add -p` para los archivos compartidos); los cambios de `tests/lessons-content.test.js` van con la última lección si no se pueden partir sin dejar un commit con pruebas rojas; por último la Tarea 7.
- [ ] **Step 4:** Push y PR solo con confirmación. Informe de cierre con los 6 puntos de CLAUDE.md.
