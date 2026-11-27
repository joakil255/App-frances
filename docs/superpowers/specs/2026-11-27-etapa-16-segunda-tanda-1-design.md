# Etapa 16 — Segunda tanda, subtanda 1 (posesivos, passé composé, COD, y/en): diseño (aprobado)

> **Estado:** **aprobado por el usuario el 27/11/2026.** No hay código ni commits. Las decisiones del usuario son del 27/11/2026. Lo marcado como **decisión del diseño** es una propuesta que el usuario puede corregir.

## Intención
Seguir la ruta de Construir frases con los tres primeros temas del orden pedido para la segunda tanda (Etapa 12): passé composé, pronombres de complemento directo con *y / en*, y posesivos y demostrativos. La mecánica ya funciona en el teléfono; esta etapa es **contenido**, como la Etapa 13.

## Decisiones del usuario (27/11/2026)
1. **Cinco lecciones, las del índice:** `fr-a1-10` Posesivos y demostrativos, `fr-a2-01` Passé composé con *avoir*, `fr-a2-02` Passé composé con *être*, `fr-a2-03` Pronombres de complemento directo (*le, la, les*), `fr-a2-04` Los pronombres *y / en*.
2. **La mini prueba inicial queda fuera** (no existe en la primera tanda; si se quiere, será una etapa aparte para todas las lecciones).
3. **Enfoque:** agregar las lecciones como datos con la mecánica actual.
4. **Sin commits hasta que el usuario vea los resultados**; después, commits pequeños (uno por lección).
5. Contrastar cada regla con fuentes oficiales; lo que no se confirme va **REVISAR** con la fuente en la nota.
6. Al terminar, una lista de todo el francés que debe revisar el usuario.

## Enfoques considerados
| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **Agregar las lecciones como datos con la mecánica actual** | Contenido, pruebas de contenido y caché | **Elegido** |
| Lecciones generadas por IA | Contradice el contenido fijo, revisable y con fuentes | Descartado |
| Tipos de ejercicio nuevos (p. ej. tabla de conjugación) | Código y pantallas nuevas que nadie pidió | Descartado |
| Migración de la copia de seguridad | El formato del progreso no cambia (va por id de lección): sería una migración vacía | Descartado; se reemplaza por pruebas (abajo) |

## Objetivos
- Cinco archivos en `data/lessons/fr/` con el formato y las cuentas de la primera tanda (las exige `tests/lessons-content.test.js`):
  - 4 a 6 ejemplos;
  - 8 a 10 ejercicios, al menos 2 de cada tipo (`order` fichas, `gap` hueco, `fix` corregir), corregidos sin IA;
  - 1 o 2 situaciones de frase libre (corregidas por Claude con `/sentence`) con 2 a 4 modelos;
  - idea, patrón, «cómo pensarlo», al menos una trampa para hispanohablantes, áreas y fuentes.
- **Ortografía** (decisión del diseño aprobada): sin sección nueva; las reglas de escritura van en «Trampa común» y en ejercicios `fix`, como en la primera tanda.
- `index.json`: esas cinco pasan de `planned` a `available`. `fr-a1-11` a `fr-a1-15` y `fr-a2-05` a `fr-a2-09` siguen «Próximamente».
- Sus secciones en `docs/contenido/construir-frases.md` (una tabla por lección con cada elemento, su fuente y REVISAR; la prueba existente comprueba que coincide con los JSON).
- `sw.js`: `CACHE_VERSION = 'v27'` y los cinco archivos en la precarga.
- Errores repetidos al repaso espaciado: sin cambios de código; ya funciona por `lessonId` y `exerciseId`.

## Contenido (decisión del diseño, a confirmar con las fuentes)

| Lección | Qué entra | Qué queda fuera (y por qué) |
|---|---|---|
| `fr-a1-10` Posesivos y demostrativos | *mon/ma/mes, ton/ta/tes, son/sa/ses, notre/nos, votre/vos, leur/leurs*; el posesivo concuerda con **lo poseído**, no con el poseedor (*sa voiture* = su auto de él o de ella); *mon* delante de vocal también en femenino (*mon amie*); *ce/cet/cette/ces* (*cet* delante de vocal o h muda) | Pronombres posesivos (*le mien*) y demostrativos (*celui*), *-ci / -là*: no son A1 |
| `fr-a2-01` Passé composé con *avoir* | *avoir* en presente + participio; participios en *-é* de los verbos en *-er*; unos pocos irregulares frecuentes (*fait, pris, vu, bu, lu, eu, été, dit, écrit*, a confirmar con la fuente); negación alrededor del auxiliar (*je n'ai pas mangé*); marcadores *hier, ce matin, la semaine dernière* | Concordancia del participio con COD antepuesto (*je l'ai vue*): B1; contraste con el imperfecto: lección `fr-a2-05` |
| `fr-a2-02` Passé composé con *être* | *être* + participio con los verbos de movimiento frecuentes (*aller, venir, partir, arriver, entrer, sortir, rester, tomber, naître, mourir*, subconjunto a confirmar); concordancia con el sujeto (*elle est allée, ils sont partis*); negación | Pronominales en passé composé (*je me suis levé*): sus lecciones (`fr-a1-11`) aún no existen; verbos que cambian de auxiliar (*monter, sortir* + COD): B1 |
| `fr-a2-03` Pronombres COD *le, la, les* (*l'*) | Reemplazan a un complemento directo; van **antes** del verbo conjugado (*je le vois*); con negación (*je ne le vois pas*); delante de un infinitivo (*je vais le voir*, repasa la lección 8); elisión *l'* | COD en passé composé (concordancia, B1); *me, te, nous, vous* como COD y los COI *lui, leur*: si la fuente los pone en A2, se proponen para una lección posterior; doble pronombre: B1 |
| `fr-a2-04` Los pronombres *y / en* | *y* = *à* + lugar (*j'y vais*); *en* = *de* + cosa, y con cantidades (*j'en veux deux*, *il y en a trois*); misma posición que el COD; con negación (*je n'y vais pas*) | *y / en* con verbos de régimen (*penser à*, *parler de*) y en passé composé: a confirmar en las fuentes; si no son A2, quedan fuera |

**Reglas de contenido** (aprendidas en las Etapas 12 y 13; las comprueban las revisiones):
- francés correcto y natural; sustantivos con artículo; frases cortas y vocabulario A1/A2;
- nunca rechazar una respuesta correcta: aceptar las variantes naturales o forzar una en el enunciado y explicar la otra (p. ej. *je ne l'ai pas* vs. *je l'ai pas*: solo la escrita estándar, y el enunciado lo dice);
- no enunciar reglas absolutas que tienen excepciones;
- todo dato sin fuente, incluida la pronunciación, va **REVISAR** con nota que diga qué fuente falta o qué fuente se consultó;
- después de escribir, pasar cada ejercicio por `checkExercise` (lo hace la prueba de contenido).

## Fuentes y verificación
Las mismas tres de la primera tanda, más las páginas que falten:
1. **Inventaire linguistique des contenus clés des niveaux du CECRL** (Eaquals y CIEP, 2015): anexo D (gramática) para el nivel de cada tema; anexo F para frases de ejemplo.
2. **Niveau A2 pour le français. Un référentiel**, capítulo 5 (gramática).
3. **Banque de dépannage linguistique** (OQLF): artículos de posesivos, demostrativos (*cet*), participio pasado y auxiliares, posición de los pronombres personales, *y* y *en*.

Cada regla y cada nivel se comprueban contra el texto de la fuente (página o URL). Si la fuente ubica un tema en otro nivel (por ejemplo, el passé composé en A1 en el Inventaire), se anota la diferencia en el documento de revisión y **no se cambia el nivel del índice** sin preguntar.

## Copia de seguridad
- El formato del progreso de Construir frases no cambia (va por id de lección), así que **no hay migración** (decisión aprobada).
- Pruebas nuevas: una copia v6 con progreso y tarjetas de repaso de las lecciones nuevas hace ida y vuelta; una copia v4/v5 sin ellas sigue restaurándose.

## Prueba real de Claude (decisión del diseño)
- Agregar 5 casos de error a `server/eval/sentence-cases.json`, uno por lección. Propuestos:
  - `Ma amie arrive.` → `Mon amie arrive.`;
  - `Hier, je mangé une pomme.` → `Hier, j'ai mangé une pomme.`;
  - `Elle est allé au cinéma.` → `Elle est allée au cinéma.`;
  - `Je vois le.` → `Je le vois.`;
  - `Je vais y demain.` → `J'y vais demain.`.
- El criterio pasa de 10 a 15 errores corregidos (`ERROR_CASES` en `server/eval/score-sentence.js`).
- Se ejecuta **solo con permiso del usuario** (menos de un centavo). Si falla, se ajustan las instrucciones, hasta 3 veces. El servidor se vuelve a publicar solo si cambian las instrucciones.

## Pruebas automáticas (sin red y sin gastar)
- `tests/lessons-content.test.js`: 14 lecciones disponibles en el orden del índice (las 9 de antes + las 5 nuevas), con las cuentas, `checkExercise` de cada ejercicio, REVISAR con nota, fuentes existentes y coincidencia con `docs/contenido/construir-frases.md`. Los límites ya cubiertos (acentos, apóstrofos tipográficos) siguen valiendo para el contenido nuevo.
- `tests/lesson-route.test.js`: con el hueco (`fr-a1-11` a `fr-a1-15` planificadas entre disponibles), «Continuar» va a `fr-a1-10` y, terminada, salta a `fr-a2-01`; las planificadas no se pueden abrir; la numeración sigue el índice (`fr-a2-01` es la lección 16).
- `tests/backup.test.js`: las dos pruebas de la sección anterior.
- `tests/precache.test.js` y `tests/index-html.test.js`: `v27` y los cinco archivos.
- **Recorrido** a 360 y 1280 px, claro y oscuro, desde Inicio con toques (no por URL; la barra del móvil no tiene Construir): abrir cada lección nueva, resolver un ejercicio de cada tipo, fallar dos veces uno y verlo en el repaso, frase libre con un servidor falso, y sin conexión.

## Decisiones tras la revisión del constructor (decisiones del diseño)
1. **Leer las fuentes en internet:** se consultan las páginas y PDF públicos de las tres fuentes. Leer una página pública no envía datos del usuario, igual que en las Etapas 12 y 13.
2. **Si una fuente pone un punto en otro nivel:** se escribe la lección con lo que sí está en su nivel y **se deja fuera** lo que no, con una nota en el documento de revisión (como en la Etapa 13). Sin pausa para preguntar, salvo que quede fuera el tema central de una lección: entonces se detiene y se pregunta.
3. **Formas aún no enseñadas:** los ejemplos evitan los verbos pronominales y el imperativo (sus lecciones no existen todavía).
4. **Verbos con *être*** (`fr-a2-02`): *aller, venir, partir, arriver, entrer, sortir, rester, tomber* y *naître* (para *je suis né(e) en…*). *Mourir* queda fuera por poco útil a este nivel.
5. **Puntuación de la prueba real:** se actualiza `server/eval/score-sentence.js` (el número fijo de casos de error pasa de 10 a 15) y su prueba. Los 5 casos nuevos son todos de error.
6. **La prueba real es el último paso:** se ejecuta después de que el usuario vea los resultados y solo con su permiso.
7. **Formato del documento de revisión:** el mismo de 6 columnas de las lecciones 1 a 9.
8. **Ruta:** `nextLesson` ya salta las lecciones planificadas; solo se agregan pruebas, sin cambiar código.

## No-objetivos
- La mini prueba inicial.
- Código o pantallas nuevas (salvo el número de casos del puntaje de la prueba real); otros tipos de ejercicio.
- Lecciones `fr-a1-11` a `fr-a1-15` y `fr-a2-05` en adelante.
- Cambiar los niveles del índice sin preguntar.

## Anti-objetivos
- Francés incorrecto o reglas falsas.
- Ejercicios que rechacen respuestas correctas.
- Datos sin fuente presentados como verificados.
- Commits antes de que el usuario vea los resultados.

## Al terminar
Una **lista de revisión del usuario**: todo el francés nuevo (ejemplos, ejercicios con sus respuestas aceptadas, trampas, modelos de situaciones), con lo marcado REVISAR primero y su fuente o la fuente que falta.

## Lo que queda para el plan
- Los textos exactos de cada lección y sus fuentes con página o URL.
- El orden de las tareas y cómo se revisa cada lección sin commits (diff del árbol de trabajo).
