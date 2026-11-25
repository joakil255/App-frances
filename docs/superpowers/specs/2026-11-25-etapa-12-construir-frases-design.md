# Etapa 12 — Construir frases: diseño (aprobado)

> **Estado:** **aprobado por el usuario el 25/11/2026.** No hay código. Las decisiones de la sección «Decisiones del usuario» las tomó el usuario el 24 y el 25/11/2026. Lo marcado como **decisión del diseño** es una propuesta que el usuario puede corregir.

## Intención

El usuario quiere **aprender a construir frases en francés que estén bien en gramática, sintaxis y ortografía**. Las explicaciones van en español y enseñan a **pensar en francés por bloques y patrones**, no a traducir palabra por palabra. El nivel va de A1 a A2.

La etapa agrega una sección **«Construir frases»** con:
- **lecciones cortas** de contenido fijo y revisable, en un formato que sirva para otros idiomas;
- **ejercicios** corregidos sin IA cuando la respuesta es cerrada;
- **una frase libre por situación**, corregida por Claude con el adaptador de la Etapa 8;
- **un repaso espaciado propio** con los ejercicios que fallas y los errores de tus frases libres.

**Objetivos**
- Mecánica completa más las **lecciones 1 a 6** de la primera tanda, con el orden ajustado (decisiones 1 y 2). Las lecciones 7 y 8 van en una etapa corta posterior.
- Cuatro tipos de ejercicio:
  - ordenar palabras;
  - completar huecos;
  - corregir frases con errores;
  - construir una frase desde una situación.
- **Corrección determinista** de los tres primeros tipos, con explicaciones escritas de antemano (decisión 6).
- **Corrección con Claude** solo para la frase libre, con salida estructurada y validada en el servidor. Cada error trae su explicación. La sugerencia de usar el patrón o de responder a la situación va **aparte de los errores** (decisión 5).
- **Repaso espaciado propio** con el algoritmo elegido en Estudiar (decisión 4).
- Contenido revisable: cada regla lleva su fuente, y lo que no se pudo confirmar en una fuente oficial va marcado **REVISAR**.
- Funcionar sin conexión, salvo la corrección con Claude.
- Accesible y cómoda en el móvil.
- Pruebas automáticas.

**No-objetivos**
- Las lecciones 7 (adjetivos) y 8 (*aller, faire, vouloir, pouvoir, devoir*, futuro próximo y *je voudrais*): van en la etapa siguiente.
- La segunda tanda: planificada abajo, pero sin implementar.
- Lecciones en otros idiomas (solo se deja el formato preparado).
- Generar lecciones con IA.
- Editar lecciones desde la app.
- Cambiar Estudiar, Quiz, Progreso o la barra de navegación del móvil.
- Estadísticas de Construir en Progreso.
- Responder con el micrófono.
- Reglas automáticas que detecten errores en cualquier frase (enfoque 2 de la decisión 6).

**Anti-objetivos (fracaso aunque funcione)**
- Mostrar contenido REVISAR como si estuviera verificado.
- Lecciones con francés incorrecto o explicaciones que no coinciden con la fuente citada.
- Que la IA marque como incorrecta una frase correcta solo porque no usa el patrón de la lección.
- Enviar datos a alguien que no sea Anthropic.
- Mostrar como HTML texto del usuario, de una lección o de Claude.
- Perder el progreso o las tarjetas de repaso.
- Que un ejercicio solo se pueda resolver arrastrando con el dedo (sin teclado ni lector de pantalla).
- Que la app deje de funcionar sin conexión.

## Lo que se verificó (fuentes, consultadas el 24/11/2026)

| Fuente | Qué es | Cómo se obtuvo | Qué se leyó |
|---|---|---|---|
| **Inventaire linguistique des contenus clés des niveaux du CECRL** (Eaquals y CIEP, 2015). En adelante, **Inventaire** | Consenso de la profesión sobre qué contenidos van en cada nivel, de A1 a C1 | La página de France Éducation international bloquea las descargas automáticas (verificación anti-robots) y no se intentó saltarla. El mismo PDF se descargó de Eaquals, coeditor: `eaquals.org/wp-content/uploads/Inventaire_ONLINE_full.pdf` (112 páginas) | **Anexo D:** tabla de gramática por nivel, págs. 49–52, leída como imagen porque el nivel se marca con color. **Anexo E:** listas A1 y A2, págs. 56–58. **Anexo F:** ejemplos A1, págs. 62–67 |
| **Niveau A2 pour le français. Un référentiel** (Beacco y Porquier, Didier, 2008), capítulo 5 «Grammaire» | Referencial oficial del nivel A2 | Extracto publicado por la FIPF: `bop.fipf.org/wp-content/uploads/2017/03/refa343342.pdf` | Págs. 101–112 completas |
| **Niveau A1 pour le français. Un référentiel** (Beacco, Porquier y Bouquet, Didier, 2007) | Referencial oficial del nivel A1 | Es un libro de pago. Solo se encontró su índice (`obalkyknih.cz`) | **No se pudo leer** |
| Folleto de la DGLFLF «Les premiers apprentissages du français» (Ministerio de Cultura) | Descriptores de los niveles A1.1 y A1 | `culture.gouv.fr` | Leído. No trae gramática |

**Leyenda del Inventaire** (pág. 15): las celdas oscuras son **contenidos clave**, con el mayor consenso; las claras tienen menos consenso.

**Ninguna de las dos fuentes da un orden de enseñanza.**
- Inventaire, pág. 15: es un *«document de référence et non […] un outil pratique»*.
- Referencial A2, pág. 103: sus listas son *«des points d'ancrage et non des progressions à valeur universelle»*.

Por eso se puede comprobar **el nivel** de cada tema, pero **no su orden**.

### Diferencias entre el orden del usuario y las fuentes

| Tema | Orden del usuario | Fuentes | Qué se hizo |
|---|---|---|---|
| Elisión | Lección 5 | No aparece como tema de gramática; pertenece a la ortografía y la pronunciación (capítulos 7 y 8 del referencial A2, no leídos). Pero ya hace falta en las lecciones 1 y 2 (*j'habite*, *j'ai*, *c'est*) | Se enseña desde la lección 1 (decisión 2). La lección 5 la repasa con *n'* |
| Pronombres tónicos (*moi, toi…*) | No estaban | Inventaire: A1 clave | Se agregan a la lección 1 |
| Partitivos *du / de la / de l'* | Lección 3 | Inventaire A1: solo como expresiones de cantidad (*un litre de X*). Referencial A2, pág. 108: entre los determinantes A2. Pág. 103: la investigación no permite saber si el partitivo es A1 o A2 | Quedan en la lección 3, marcados como límite entre A1 y A2 |
| Contracciones *au, aux, du, des* | No estaban | Inventaire A1: *à, au, de* (preposiciones de lugar). Referencial A2, pág. 108 | Se agregan a la lección 3 |
| Negación | *Negación* en general | Inventaire: *ne… pas / jamais* en A1; *ne… plus / rien / personne* en A2 | La lección 5 solo enseña *ne… pas* y *ne… jamais* |
| Modales | *vouloir, pouvoir* | Inventaire A1: *devoir, pouvoir, vouloir* y el condicional de cortesía *je voudrais* | Se agregan a la lección 8 (próxima etapa) |
| Verbos pronominales | Segunda tanda | Inventaire: **solo A1**, clave | Diferencia. Se recomienda adelantarlos (ver «Segunda tanda») |
| Posesivos y demostrativos | Segunda tanda | Inventaire: A1 clave (A2 con menos consenso) | Diferencia. Igual que la anterior |
| Imperativo (unos pocos verbos) | Segunda tanda | Inventaire: A1 y A2, clave | Diferencia. Igual que la anterior |
| *venir de* + infinitivo; *être en train de* | No están | Inventaire: A1 y A2, clave | Faltan en el plan |
| *il faut* + infinitivo | No está | Inventaire: A1 clave | Falta |
| Preposiciones de lugar y tiempo (*à, chez, dans, en 2015, depuis*) | No están | Inventaire: A1 clave | Falta |
| Conectores (*et, ou, mais, parce que, pour* + infinitivo) | No están | Inventaire: A1 y A2 | Falta |
| *beaucoup de, un peu de, très, trop* | Solo *pas de* | Inventaire: A1 clave | *beaucoup de* y *un peu de* entran como ejemplos en la lección 3; el resto falta |
| Futuro simple, comparativo y superlativo, *qui / que / où* | No están | Inventaire: A2 clave | Faltan en la segunda tanda |
| COD y COI, *y / en*, imperfecto | Segunda tanda | Inventaire: A2 (el imperfecto, en A1 solo *c'était*) | Coincide |
| Ortografía avanzada | Segunda tanda | Las fuentes leídas no la tratan | **Toda REVISAR**, salvo que se respalde con otra fuente |

### No se pudo verificar
- El contenido del referencial **A1**: todo lo que dependa solo de él va REVISAR.
- Los capítulos 7 y 8 del referencial A2 (sonido y escritura), donde estarían la elisión y la ortografía.
- Cualquier orden de enseñanza: las fuentes dicen expresamente que no lo dan.
- **Las reglas, una por una,** se verifican al escribir cada lección (ver «Contenido»). Lo que no quede confirmado va REVISAR.

Los PDF no se suben al repositorio porque tienen derechos de autor. Se citan con título, editorial, página y dirección.

## Decisiones del usuario

1. **Alcance A:** la mecánica completa más las lecciones 1 a 6 en esta etapa. Las lecciones 7 y 8 van en una etapa corta después.
2. **Orden ajustado,** aceptado como se propuso:
   - elisión desde la lección 1;
   - pronombres tónicos en la lección 1;
   - contracciones y partitivos (como límite entre A1 y A2) en la lección 3;
   - negación A1 solo con *ne… pas / jamais*;
   - *devoir* y *je voudrais* en la lección 8.
3. Estructura de la lección (la idea, el bloque, cómo pensarlo, ejemplos con audio, la trampa común y la práctica) y formato de datos por archivo, independiente del idioma, aprobados como se propusieron.
4. **Repaso R1:** un repaso propio dentro de Construir, con el algoritmo de Estudiar. **Error repetido = fallar el mismo ejercicio 2 veces** (no hace falta que sea seguido). Los errores de la frase libre también entran al repaso. Estudiar no cambia.
5. **La IA revisa** los errores de francés y, **aparte**, si la frase responde a la situación y usa el patrón de la lección. La sugerencia nunca convierte una frase correcta en incorrecta.
6. **Corrección determinista, enfoque 1:** cada ejercicio trae sus respuestas aceptadas y sus errores probables con la explicación escrita de antemano. Si el error no estaba previsto, la app marca las palabras que cambian, avisa si es solo un acento y muestra la regla de la lección.
7. **Entrada desde Inicio:** una tarjeta en Inicio. La barra del móvil no cambia porque un octavo botón no cabe a 360 px. En el computador, la barra vertical sí suma «Construir». El usuario rehará la interfaz pronto.

## Enfoques considerados

**Cómo explicar los errores sin IA (decisión 6)**

| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **1. Respuestas y errores previstos escritos de antemano, más diferencia por palabras** | Los errores no previstos reciben una explicación general | **Elegido.** Simple, predecible, y cada explicación pasa por la revisión del usuario |
| 2. Reglas automáticas que detectan errores en cualquier frase | Mucho más código, riesgo de explicaciones equivocadas y hay que rehacerlas por idioma | Descartado |

**Dónde va el repaso (decisión 4)**

| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **R1. Repaso propio en Construir con el mismo algoritmo** | Dos lugares para repasar | **Elegido.** Estudiar no cambia y la app corrige sin autocalificarse |
| R2. Mezclarlo en la cola de Estudiar | Rehacer Estudiar, pensado para palabras y autocalificación | Descartado |

**Cómo se entra a la sección (decisión 7)**

| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **1. Tarjeta en Inicio** | En el móvil no está en la barra | **Elegido** (provisorio hasta el rediseño) |
| 2. Botón «Más» que agrupa Progreso, Leer y Construir | Progreso y Leer quedan a dos toques; hay que rehacer la navegación | Descartado |

**Cómo se guardan las lecciones** (había una sola forma razonable)
- **Archivos de datos JSON:** elegido.
- Páginas HTML escritas a mano: descartado, porque no se pueden pasar a otros idiomas ni probar.
- Lecciones generadas por IA: descartado, porque el usuario pidió contenido fijo y revisable.

## Diseño

### Formato de las lecciones (independiente del idioma)

**Archivos**
- `data/lessons/<lang>/index.json`: `{ format: 'app-frances-lecciones', version: 1, lang: 'fr', lessons: ['fr-a1-01', …] }`. Define el orden.
- `data/lessons/fr/fr-a1-01.json` … `fr-a1-06.json`: una lección por archivo.

Todos van en la precarga del service worker.

**Campos de una lección**

| Campo | Qué es |
|---|---|
| `format`, `version` | `'app-frances-leccion'`, `1` |
| `id` | `'fr-a1-01'`: idioma, nivel y número. El nombre nunca puede ser `repaso` |
| `lang` | Idioma que se estudia: `'fr'` |
| `explainLang` | Idioma de las explicaciones: `'es'` |
| `level` | `'A1'` o `'A2'` (niveles MCER) |
| `title` | En `explainLang`. Ejemplo: «La frase básica» |
| `areas` | Subconjunto de `['grammar', 'syntax', 'spelling']`, que en pantalla se muestran como Gramática, Sintaxis y Ortografía |
| `idea` | 1 o 2 párrafos en `explainLang`: lista de `{ text, sourceIds, review, reviewNote }` |
| `pattern` | Lista de bloques `{ label, options }`. Ejemplo: `{ label: 'Sujeto', options: ['je', 'tu', 'il', 'elle'] }`. Se muestra como fichas en fila |
| `think` | Contrastes «cómo pensarlo»: `{ source, target, note }`. Ejemplo: `{ source: 'Tengo 20 años', target: "J'ai 20 ans", note: 'La edad va con avoir.' }` |
| `examples` | `{ text, translation }`, de 4 a 6. Llevan botón de audio |
| `pitfalls` | Trampas comunes: `{ wrong, right, explanation }` |
| `exercises` | Ver abajo. De 8 a 10 por lección, con al menos 2 de cada tipo cerrado |
| `situations` | De 1 a 2 frases libres (ver abajo) |
| `sources` | `{ id, title, publisher, year, pages, url }` |

**Revisión.** Cada elemento de `idea`, `think`, `examples`, `pitfalls`, `exercises` y `situations` lleva:
- `sourceIds`: lista con al menos una fuente, salvo los ejemplos de vocabulario;
- `review`: `true` cuando hay que mostrar REVISAR;
- `reviewNote`: por qué está en REVISAR. Es obligatorio si `review` es `true`.

**Tipos de ejercicio** (todos con `id`, `type` y `prompt` en `explainLang`)
- **`order`** (ordenar palabras):
  - `tiles`: las fichas, ya mezcladas en el archivo para que el orden sea siempre el mismo y se pueda probar;
  - `answers`: los órdenes aceptados, como texto. Ejemplo: `["Je n'aime pas le café."]`.
  - `rule`: la explicación que se muestra si el orden no es correcto.
  - Cada respuesta aceptada usa exactamente todas las fichas. Se compara la frase que forman las fichas, con las mismas reglas que los demás tipos.
- **`gap`** (completar el hueco):
  - `before` y `after`: el texto antes y después del hueco;
  - `answers`: lo que se acepta en el hueco;
  - `mistakes`: `[{ answer, explanation }]`, los errores previstos con su explicación;
  - `rule`: la explicación general.
- **`fix`** (corregir la frase):
  - `wrong`: la frase con errores;
  - `answers`: las frases corregidas que se aceptan;
  - `mistakes` y `rule`, como en `gap`.
- **Situación libre** (`situations`):
  - `situation`: en `explainLang`, por ejemplo «Estás en una panadería. Pide dos croissants.»;
  - `models`: las respuestas modelo;
  - `focus`: el patrón que se practica, en `explainLang`, para la IA. Ejemplo: «Pedir con *je voudrais* + artículo».

**Validación** (`validateLesson`, función pura, también usada en las pruebas):
- todos los campos obligatorios y con su tipo;
- `id` únicos en toda la lección;
- `lang` y `explainLang` son códigos de 2 letras;
- cada `sourceIds` apunta a una fuente que existe;
- en `order`, cada respuesta aceptada usa exactamente las fichas;
- en `gap` y `fix`, ningún `mistakes[].answer` coincide con una respuesta aceptada;
- en `fix`, `wrong` no coincide con ninguna respuesta aceptada;
- `review: true` exige `reviewNote`.

Una lección inválida no se muestra: la lista dice «Esta lección no se pudo cargar».

### Comprobar respuestas (`js/lib/sentence-check.js`, puro)
- **Comparación:** se reutilizan `normalizeAnswer` y `foldAccents` de `answer-check.js`. No cuentan las mayúsculas, la puntuación, los espacios de más ni el tipo de apóstrofo. **Decisión del diseño:** en A1 no se califican las mayúsculas ni la puntuación.
- **Acentos:** se sigue el ajuste **«Exigir acentos»** del Quiz.
  - Si está apagado, un error que es solo de acento cuenta como correcto, con el aviso «Ojo con el acento: …».
  - Si está encendido, cuenta como fallo, con el mismo aviso.
  - **Decisión del diseño:** reutilizar el ajuste en vez de crear otro.
- `checkExercise(exercise, typed, { requireAccents })` devuelve:
  - `correct` (sí o no);
  - `accentOnly`;
  - `explanation`: la del error previsto si coincide; si no, la `rule` del ejercicio;
  - `diff`: lista de `{ word, status: 'same' | 'changed' | 'missing' | 'extra' }`, calculada palabra por palabra contra la respuesta aceptada más parecida.
- `checkFree(situation, typed, { requireAccents })`: es correcta si coincide con un modelo, con las mismas reglas. Si no coincide, devuelve `needsAi: true`.

### Progreso y repaso (`js/lib/build-storage.js`)

**Clave `app-frances-build`:**

```
{ schemaVersion: 1,
  progress: { [lessonId]: { startedAt, completedAt,
                            exercises: { [exerciseId]: { fails, lastCorrectAt } } } },
  cards: { [cardId]: tarjeta } }
```

**La tarjeta**
- `id`
- `kind`:
  - `'exercise'`: guarda `lessonId` y `exerciseId`;
  - `'own'`: guarda `{ original, corrected, errors }`, que vienen de Claude, más `situation`.
- `createdAt`, `introducedOn`, `lastReviewedAt`
- `sm2` y `leitner`: los mismos estados de `scheduler.js`.

**Cuándo nace una tarjeta**
- Un ejercicio con **`fails` ≥ 2** que todavía no tiene tarjeta crea una `'exercise'`.
- Cada respuesta de Claude **con al menos un error** crea **una** tarjeta `'own'` con la frase entera. Se pidió «cada error → tarjeta»; **decisión del diseño:** una tarjeta por frase, para no preguntar la misma frase varias veces. Esa tarjeta lleva la marca REVISAR, porque la corrección es de Claude.
- **La primera vez vence mañana.** Acabas de ver la respuesta correcta, así que repasarla hoy sería trivial. **Decisión del diseño.**

**Cómo se programa**
- Se usa `review(card, answer, today, nowIso)` de `scheduler.js` con el algoritmo de los ajustes de Estudiar: **acierto = `'good'`, fallo = `'again'`**.
- El estado de `scheduler.js` se guarda tal cual, para no inventar otro algoritmo.

**Cola**
- Primero las tarjetas vencidas, por fecha.
- Al final, las falladas hoy.
- Sin límite diario de nuevas: son tus propios errores.
- Una tarjeta `'exercise'` cuyo ejercicio ya no existe (porque se corrigió la lección) no aparece en la cola ni en el contador, y no se borra. **Decisión del diseño.**
- Fallar en el repaso cambia la programación de la tarjeta, pero no suma a `fails`.

**El ejercicio en el repaso**
- Una tarjeta `'exercise'` muestra el mismo ejercicio.
- Una tarjeta `'own'` es un ejercicio `fix`: «Corrige tu frase», con `original`. Se acepta `corrected` y se explica con los `errors` guardados.
- Las tarjetas `'own'` tienen un botón **Quitar del repaso**, con confirmación, por si la corrección de Claude estaba mal. **Decisión del diseño.**

**Almacén**
- Funciona como el de estudio: primero se guarda y, si salió bien, cambia la memoria.
- Si los datos están dañados, se copian aparte.
- Vigila los cambios hechos en otra pestaña.

**Copia de seguridad v4:** agrega `build`. Lee las versiones 1 a 4.
- Restaurar una **v4** reemplaza `build` junto con las demás claves, y si algo falla se deshace todo.
- Restaurar una **v1 a v3** **no toca** `build`, igual que pasa con las historias.

### Servidor: ruta `POST /sentence`
- Mismo Worker, código de acceso, origen y CORS.
- **Cuerpo:** `{ lang: 'fr', explainLang: 'es', level, situation, focus, sentence }`.
  - `level` ∈ `['A1', 'A2']`.
  - `situation` y `focus`: de 1 a 300 letras.
  - `sentence`: de 1 a 300 letras, sin saltos de línea.
  - Si no cumple: 400 `invalid_input`.
- **Contador aparte:** clave KV `sentence:AAAA-MM-DD`. `SENTENCE_LIMIT` se agrega a `wrangler.jsonc` y a `readConfig`, que da error de configuración si falta y **`SENTENCE_LIMIT=50`** (**decisión del diseño;** unos $0,01 al día como máximo, según el costo medido en la Etapa 8). Al llegar al tope responde 429 `sentence_limit`.
- **Adaptador:** `sentence({ … })`, con salida estructurada (Haiku 5.5, esfuerzo `low`).
- **Esquema de salida:**
  - `corrected`: texto;
  - `errors`: lista de `{ original, corrected, kind: 'grammar' | 'syntax' | 'spelling', explanation }`;
  - `suggestion`: texto, `''` si no hay.
  - Todo obligatorio y sin campos de más.
- **Validación en el servidor:**
  - se descartan los errores en que `original` y `corrected` son iguales (como en el chat);
  - **`correct` lo calcula el servidor:** `errors` vacía. No se le pregunta a la IA, para que no se contradiga;
  - si `correct` y `corrected` ≠ `sentence`, `corrected` pasa a ser `sentence`;
  - cada `original` debe aparecer en `sentence` (sin distinguir mayúsculas ni tipo de apóstrofo); si no aparece, `bad_output`;
  - `explanation` y `suggestion` tienen como máximo 300 letras y no llevan etiquetas HTML;
  - `kind` debe estar en la lista.
- **Respuesta:** `{ correct, corrected, errors, suggestion, remainingSentences }`.
- **Instrucciones** (en español):
  - revisar solo la frase del alumno, de nivel `level`, buscando errores reales de gramática, sintaxis y ortografía: elisión, contracción, género, concordancia, acentos, conjugación y orden;
  - no corregir el estilo;
  - cada explicación, en 1 o 2 frases en español, tuteando;
  - **aparte**, en `suggestion`: si la frase no responde a `situation` o no usa `focus`, decirlo en una frase con un ejemplo;
  - **nunca poner en `errors` algo que solo es «no usaste el patrón»**.
- **Prueba real, con permiso** (`server/eval/compare-sentence.mjs`), con unas 12 frases:
  - 6 con errores típicos de las lecciones 1 a 6;
  - 3 correctas que usan el patrón;
  - 3 correctas que no lo usan: deben dar `errors` vacía y `suggestion` no vacía.

  La calificación la hace código probado (`score-sentence.js`). Cuesta menos de un centavo. **No se publica si falla.**

### App

**Inicio**
- Tarjeta **«Construir frases»** sobre la copia de seguridad.
- Muestra:
  - la próxima lección (la primera sin terminar) o «Terminaste todas las lecciones»;
  - «Repaso: N pendientes hoy».
- Botones **Seguir lección** y **Repasar (N)**. Repasar está desactivado con `aria-disabled` si N = 0.
- En el computador, la barra vertical suma **«Construir»**, con el color de línea nuevo que propondrá frontend-design. En el móvil no aparece (decisión 7). Esto se hace con CSS y el mismo HTML, con un enlace que se oculta por debajo de 900 px.

**`#/construir`: lista de lecciones**
- Una fila por lección, en el orden de `index.json`:
  - número y título;
  - áreas;
  - estado: «Nueva», «En curso: 4/10» o «Terminada»;
  - «Tiene partes REVISAR» si hay alguna.
- Arriba: **Repasar (N)**.

**`#/construir/<id>`: lección**
- El enrutador acepta `construir/<id>` como acepta `leer/<id>`. Un `id` desconocido vuelve a la lista. **`#/construir/repaso`** abre el repaso.
- Secciones en este orden: La idea · El bloque · Cómo pensarlo · Ejemplos (🔊 con `speak()` de la Etapa 9) · Trampa común · **Practicar** · Fuentes.
- Cada elemento REVISAR lleva la etiqueta **REVISAR** escrita (no solo color) y su nota.
- **Practicar:** un ejercicio por vez, «3/10», **Comprobar** y luego **Siguiente**.
  - Al fallar se muestran la explicación, la respuesta correcta y la diferencia por palabras. El ejercicio vuelve **una vez** al final de esa práctica. **Decisión del diseño.**
  - Cada fallo suma a `fails`, también entre sesiones.
- Al terminar los cerrados vienen las situaciones. La lección queda **Terminada** cuando se respondió bien cada ejercicio cerrado al menos una vez.

**Ejercicio `order`**
- Dos zonas:
  - «Tu frase»: una lista de botones;
  - «Fichas»: botones.
- Tocar una ficha la mueve al final de «Tu frase». Tocar una ficha de «Tu frase» la devuelve. También están **Borrar todo** y **Comprobar**.
- No se arrastra nada: todo son botones, así que funciona con teclado y TalkBack.
- Cada movimiento se anuncia en una región `aria-live`. Ejemplo: «Agregaste: café. Tu frase: Je n'aime pas le café».

**Ejercicios `gap` y `fix`**
- Un campo de texto con `lang="fr"`, sin autocorrección, autocompletado ni mayúscula automática, como en Palabras.
- **Fila de acentos** debajo: `à â ç é è ê ë î ï ô ù û œ`. Cada letra es un botón de 44 px que la inserta donde está el cursor. **Decisión del diseño:** el teclado de un computador en español no tiene `è`, `ê` ni `ç`. Se puede quitar si no la quieres.
- **Resultado:**
  - «Correcto.» o «No es correcta.»;
  - la explicación;
  - la respuesta correcta;
  - «Tu respuesta» con las palabras que cambian marcadas con `<mark>` y negrita, más un texto para el lector de pantalla («cambia», «falta», «sobra»);
  - 🔊 para escuchar la respuesta correcta.

**Situación libre**
- Muestra la situación y un campo de varias líneas. Debajo, en texto pequeño: «Si tu frase no coincide con un modelo, se envía a Claude (Anthropic) para corregirla.»
- **Comprobar:**
  1. `checkFree`: si coincide con un modelo, «Correcto» sin llamar a nadie.
  2. Si no coincide:
     - **sin conexión:** «Necesitas conexión para que Claude revise tu frase.» y las respuestas modelo, para comparar;
     - **con conexión:** llama a `/sentence`. El botón dice «Revisando…» desactivado con `aria-disabled`. Usa el código de acceso guardado de Conversar y, si no hay, lo pide como Conversar.
- **Resultado:**
  - «Correcta.» o la frase corregida;
  - cada error: original → corregido, tipo (Gramática, Sintaxis u Ortografía) y explicación;
  - **la sugerencia en un recuadro aparte**, titulado «Sugerencia»;
  - las respuestas modelo;
  - todo con `textContent`.
  - Si hubo errores, aviso: «Agregamos esta frase a tu repaso».
- **Errores** con el catálogo (`chatMessage`), más `sentence_limit`.

**`#/construir/repaso`**
- Igual que Practicar, con «Repaso: 2/7».
- Si está vacío: «No tienes nada que repasar hoy. Los ejercicios que falles 2 veces aparecerán aquí.»

**Mensajes nuevos:** `sentence_limit` («Llegaste al límite de correcciones de hoy.» / «El límite se reinicia a medianoche, hora de Chile.»). Los demás textos van en el plan.

**Visual:** con la skill frontend-design y DESIGN.md (nuevo color de línea, fichas, fila de acentos y diferencia por palabras). Se agrega la sección «Construir frases (Etapa 12)» a DESIGN.md.

### Contenido de las lecciones 1 a 6

| # | Título | Contenido | Áreas |
|---|---|---|---|
| 1 | La frase básica | Sujeto + verbo + complemento; pronombres sujeto; tónicos (*moi, toi, lui, elle…*); elisión *je → j'* | Sintaxis, gramática, ortografía |
| 2 | *Être*, *avoir*, *c'est*, *il y a* | Presente de *être* y *avoir*; edad con *avoir*; *c'est / ce sont*; *il y a*; *Qui est-ce ? / Qu'est-ce que c'est ?* | Gramática, sintaxis |
| 3 | Los artículos | *le / la / l' / les*; *un / une / des*; contracciones *au, aux, du, des*; partitivos *du / de la / de l'* (límite A1-A2); *pas de*; *beaucoup de, un peu de* | Gramática, ortografía |
| 4 | Verbos en -er en presente | Terminaciones *-e, -es, -e, -ons, -ez, -ent* (tres suenan igual); *j'* delante de vocal | Gramática, ortografía |
| 5 | La negación | *ne… pas*, *ne… jamais*; *n'* delante de vocal; *pas de* después de la negación | Sintaxis, ortografía |
| 6 | Preguntas simples | Entonación; *est-ce que* / *est-ce qu'*; *où, quand, comment, combien, pourquoi, qui, quel(le)* (sin inversión, salvo fórmulas fijas) | Sintaxis |

**Cómo se escribe cada lección**
- **Verificación de cada regla** contra, en este orden:
  1. el Inventaire (anexos D a F);
  2. el referencial A2, capítulo 5;
  3. la **Banque de dépannage linguistique** del Office québécois de la langue française (organismo oficial, gratuita), para reglas puntuales de ortografía y elisión.
- Lo que no se confirme en ninguna queda **REVISAR**, con la nota de qué faltó.
- **Francés:** A1, natural, con artículos y acentos correctos. Las palabras dudosas van REVISAR.
- **Documento de revisión:** `docs/contenido/construir-frases.md`, una tabla por lección con cada elemento, su fuente y REVISAR. Una prueba comprueba que coincide con los JSON, como en `a1-deck.md`.

### Segunda tanda (planificada, no implementada)

Orden pedido por el usuario:
1. passé composé;
2. pronombres COD e *y / en*;
3. posesivos y demostrativos;
4. verbos pronominales e imperativo;
5. ortografía avanzada;
6. imperfecto en iniciación.

**Recomendación** (para decidir en esa etapa): como el Inventaire pone en A1 los posesivos y demostrativos, los pronominales y el imperativo, **adelantarlos** al principio de la segunda tanda, junto con los A1 que faltan:
- *venir de*;
- *il faut*;
- preposiciones de lugar y tiempo;
- conectores.

Después, futuro simple, comparativo y *qui / que / où* para A2.

## Pruebas automáticas (sin red y sin gastar)

**Lecciones**
- `validateLesson` acepta una lección buena y rechaza cada problema: campo que falta, `id` repetido, fuente inexistente, fichas que no forman la respuesta, error previsto igual a una respuesta aceptada, REVISAR sin nota.
- **Las 6 lecciones reales** pasan `validateLesson`.
- `index.json` lista solo archivos que existen, y todos están en la precarga del service worker.
- El documento `construir-frases.md` coincide con los JSON.

**Comprobación**
- Respuesta correcta; con mayúsculas o puntuación distintas; apóstrofo tipográfico (`’`); espacio fino del francés antes de `?`.
- Solo acento, con y sin exigir acentos.
- Error previsto (devuelve su explicación); error no previsto (devuelve la regla y la diferencia).
- Respuesta vacía; respuesta muy larga (1000 letras); `œ` frente a `oe`.
- Varios órdenes aceptados.
- Diferencia por palabras: igual, cambia, falta y sobra.

**Progreso y repaso**
- Nace una tarjeta al segundo fallo (seguido o no) y nunca una segunda.
- Una respuesta de Claude con errores crea una tarjeta `'own'`; una sin errores, ninguna.
- La primera vez vence mañana.
- Acierto = `good` y fallo = `again`, con SM-2 y con Leitner.
- Orden de la cola.
- Lección terminada.
- Datos dañados; sin espacio (`quota`).
- 500 tarjetas (datos grandes).
- Copia v4: ida y vuelta; una v1 a v3 no toca `build`; si falla una escritura, se deshace todo.

**Servidor**
- Validación de `/sentence`, con vacío, 300 y 301 letras, saltos de línea, acentos y `level` inválido.
- Contador `sentence:` aparte: la llamada 51 da 429 y no toca los otros contadores.
- Normalización:
  - descarta correcciones que no cambian nada;
  - calcula `correct`;
  - `original` que no está en la frase da `bad_output`;
  - HTML da `bad_output`;
  - `kind` inválido da `bad_output`.
- Adaptador con un `fetch` falso y sus errores normalizados.
- `score-sentence.js`.

**App**
- El enrutador acepta `#/construir/<id>` y `#/construir/repaso`.
- La situación sin conexión no envía nada y muestra los modelos.
- El texto de Claude se muestra como texto, también si contiene `<script>`.
- Los archivos nuevos entran en la prueba que prohíbe `innerHTML`.
- Los ejercicios `order` funcionan solo con teclado (lógica de mover fichas probada aparte).

**Recorrido:** a 360 y 1280 px, en claro y oscuro, solo con teclado, sin conexión, y la prueba final en el teléfono con TalkBack.

## Accesibilidad móvil
- Botones y fichas de 44 × 44 px como mínimo, y separación entre fichas.
- Foco:
  - al abrir una lección, en el título;
  - al pasar de ejercicio, en el enunciado;
  - al comprobar, en el resultado.
- Nada se indica solo con color: correcto, incorrecto, REVISAR y la diferencia por palabras llevan texto.
- `lang="fr"` en todo texto francés, para que el lector de pantalla lo pronuncie bien.
- Funciona con el zoom del texto al 200 % sin desplazamiento horizontal a 360 px.

## Estimación de tiempo
- **Programar y revisar con agentes: unas 10 a 13 horas,** probablemente en **2 o 3 sesiones**. La Etapa 11 fue de 6 a 8 horas con 7 tareas.
  - Escribir y verificar las 6 lecciones: unas 3 a 4 horas.
  - Formato, validación y comprobación: unas 2 horas.
  - Progreso, repaso y copia v4: unas 2 horas.
  - Ruta `/sentence` y prueba real: unas 1,5 horas.
  - Pantallas: unas 3 a 4 horas.
- **Tu tiempo: unas 2 horas.** La mayor parte es revisar las lecciones, unos 15 minutos cada una. El resto es aprobar el plan, dar permiso para la prueba real, confirmar la publicación del servidor y el push, y probar en el teléfono.

## Límites conocidos
- La corrección sin IA solo explica bien los errores previstos. Los demás reciben la regla general y la diferencia por palabras.
- Las correcciones de Claude pueden equivocarse: las tarjetas que nacen de ellas llevan REVISAR.
- El referencial A1 no se pudo leer.
- Ninguna fuente oficial da un orden de enseñanza.
- En el móvil, Construir solo se abre desde Inicio hasta el rediseño de la interfaz.
- La voz es la del teléfono.
- El audio elige una voz francesa (`pickFrenchVoice`); otro idioma necesitará su propia elección de voz.

## Lo que queda para el plan
- Los textos exactos de las pantallas y los mensajes.
- Las instrucciones exactas de `/sentence` y los 12 casos de la prueba real.
- El diseño visual con frontend-design y DESIGN.md.
- `CACHE_VERSION` y la precarga.
- Volver a publicar el servidor, con confirmación.
- El orden de las tareas: contenido primero o mecánica primero.
