# Etapa 14 — Índice de lecciones como ruta: diseño (aprobado)

> **Estado:** **aprobado por el usuario el 25/11/2026.** No hay código. Las decisiones del usuario son del 25/11/2026. Lo marcado como **decisión del diseño** es una propuesta que el usuario puede corregir.

## Intención
Que la lista de lecciones de Construir frases muestre el camino completo: lo hecho, lo pendiente y lo que viene. Debe poder retomarse con un botón y dejar repetir cualquier lección. El progreso de cada lección (incluido el resultado de la última práctica) se guarda en la copia de seguridad.

## Decisiones del usuario
1. **Índice con aspecto de ruta vertical** en la lista de lecciones (`#/construir`).
2. **Todas las lecciones planificadas** se muestran, incluida la segunda tanda. Las que no existen aparecen atenuadas, con «Próximamente», y no se pueden abrir.
3. **El estado se escribe en texto:** «Sin empezar», «En curso», «Completada». Las completadas muestran el resultado de la última práctica y la fecha.
4. Se puede abrir y repetir cualquier lección disponible, sin seguir un orden.
5. Un botón **«Continuar»** lleva a la siguiente lección pendiente.
6. **Cada lección tiene un identificador estable y un campo de idioma.** El progreso por lección entra en la copia de seguridad, con su migración.
7. **La lista es semántica,** accesible con lector de pantalla y cómoda al tacto en el móvil.
8. **Archivos nuevos:** si se agregan, van a la precarga y se sube la versión de la caché.
9. **Resultado de la práctica** (propuesta aceptada): al terminar cada práctica se guardan los aciertos a la primera, el total y la fecha.
10. **Commits** (propuesta aceptada): se trabaja sin hacer commits de código, se muestran al usuario las salidas reales de las pruebas y se hace el commit solo con su visto bueno.
11. **Orden de la segunda tanda:** el recomendado en la Etapa 12. Primero los temas A1 que faltan y después los A2.
12. **Enfoque A:** ampliar el índice de lecciones existente (versión 2) con las lecciones disponibles y las planificadas.

## Enfoques considerados
| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **A. Índice v2 con todas las lecciones y su estado** | Cambiar el formato del índice y su lector | **Elegido:** una sola lista ordenada; publicar una lección es cambiar su estado |
| B. Un archivo aparte para las lecciones futuras | Dos listas que mantener de acuerdo | Descartado |
| C. Lista de lecciones futuras dentro del código | Va contra el contenido independiente del idioma | Descartado |

## Objetivos, no-objetivos y anti-objetivos
**Objetivos:** los 12 puntos de arriba, con pruebas automáticas.

**No-objetivos:**
- escribir el contenido de la segunda tanda;
- cambiar Estudiar, Quiz, Progreso o la barra de navegación;
- cambiar cómo se practica una lección o el repaso;
- un botón en la barra del móvil.

**Anti-objetivos:**
- perder el progreso al migrar o al restaurar una copia vieja;
- que una lección «Próximamente» se pueda abrir, o que parezca abierta para el lector de pantalla;
- indicar el estado solo con color o forma;
- que la app deje de funcionar sin conexión.

## Diseño

### Índice de lecciones, versión 2 (`data/lessons/fr/index.json`)
```
{ "format": "app-frances-lecciones", "version": 2, "lang": "fr",
  "lessons": [ { "id": "fr-a1-01", "lang": "fr", "level": "A1",
                 "title": "La frase básica", "status": "available" }, … ] }
```
- **`id`:** estable, con el mismo patrón de hoy (`fr-a1-01`, `fr-a2-01`). Nunca cambia, ni al publicar una lección planificada.
- **`lang`:** igual al `lang` del índice. **`level`:** `A1` o `A2`.
- **`title`:** en español. Para las disponibles debe coincidir con el `title` de su archivo.
- **`status`:** `available` (tiene archivo y se abre) o `planned` (sin archivo; «Próximamente»).
- **Validación** (`validateLessonIndex`):
  - formato y versión 2;
  - `id` únicos y con el patrón;
  - `lang` igual al del índice;
  - `status` en la lista;
  - `title` no vacío.
  - La versión 1 ya no se acepta: el archivo viaja con la app en la precarga, así que no hay índices v1 que migrar. **Decisión del diseño.**
- **`loadLessons({ fetch, lang })`** devuelve, en el orden del índice, `[{ id, lang, level, title, status, lesson, error }]`:
  - solo descarga y valida el archivo de las `available`;
  - las `planned` vuelven con `lesson: null` y `error: null`.
  - Quien hoy usa la lista (cola del repaso, Inicio y la pantalla) debe ignorar las `planned`.

**Lecciones planificadas** (**decisión del diseño;** los títulos se pueden cambiar sin tocar los `id`):

| id | Título | Nivel |
|---|---|---|
| fr-a1-10 | Posesivos y demostrativos | A1 |
| fr-a1-11 | Verbos pronominales | A1 |
| fr-a1-12 | El imperativo | A1 |
| fr-a1-13 | *Venir de* e *il faut* + infinitivo | A1 |
| fr-a1-14 | Preposiciones de lugar y de tiempo | A1 |
| fr-a1-15 | Conectores: *et, ou, mais, parce que, pour* | A1 |
| fr-a2-01 | Passé composé con *avoir* | A2 |
| fr-a2-02 | Passé composé con *être* | A2 |
| fr-a2-03 | Pronombres de complemento directo (*le, la, les*) | A2 |
| fr-a2-04 | Los pronombres *y* y *en* | A2 |
| fr-a2-05 | El imperfecto (iniciación) | A2 |
| fr-a2-06 | El futuro simple | A2 |
| fr-a2-07 | Comparativo y superlativo | A2 |
| fr-a2-08 | *Qui, que, où* para unir frases | A2 |
| fr-a2-09 | Ortografía avanzada | A2 |

Tu lista original agrupaba «pronominales e imperativo» y el passé composé en una sola lección cada uno. Aquí los separé para que cada lección quede del tamaño de las anteriores.

### Progreso por lección, versión 2 (`app-frances-build`)
- Cada entrada de `progress[lessonId]` suma un campo opcional, **`lastPractice: { firstTry, total, date }`**:
  - `firstTry`: ejercicios acertados al primer intento en esa práctica;
  - `total`: ejercicios de la práctica;
  - `date`: fecha local `AAAA-MM-DD`.
- Se guarda **al terminar cada práctica completa,** también al repetir una lección completada, y reemplaza al anterior. Una práctica abandonada a medias no lo cambia.
- **Migración:** el documento pasa a `schemaVersion: 2`.
  - Al cargar un v1 válido, se reescribe como v2 sin cambiar nada más (no tiene `lastPractice`).
  - Si no se puede guardar la migración, se avisa como en Palabras y el progreso sigue en memoria.
  - Un documento con versión desconocida y mayor se trata como dañado: se copia aparte y se empieza vacío, igual que hoy.
- La validación acepta `lastPractice` ausente, o con enteros `0 ≤ firstTry ≤ total`, `total ≥ 1` y una fecha válida.

### Copia de seguridad, versión 5
- `build` se guarda en formato v2.
- `readBackup` acepta las versiones 1 a 5:
  - una **v4** se lee con su `build` v1 y se convierte a v2 (sin `lastPractice`);
  - las **v1 a v3** siguen sin tocar el progreso de frases.
- Restaurar sigue siendo todo o nada.
- Una v6 da el aviso «más nueva».

### Estado de cada lección (texto)
Función pura `lessonState(entry, progress)` → `{ kind, text }`:

| Caso | Texto |
|---|---|
| `planned` | «Próximamente» |
| No se pudo cargar | «No se pudo cargar» |
| Sin progreso | «Sin empezar» |
| Empezada | «En curso: 4 de 10» |
| Completada, con `lastPractice` | «Completada · 8 de 10 a la primera · 25/11/2026» |
| Completada, sin `lastPractice` (dato viejo) | «Completada · 25/11/2026», con la fecha de `completedAt` |

La fecha se muestra `DD/MM/AAAA`, como en Inicio.

### «Continuar»
- **`nextLesson(entries, progress)`**: la primera lección `available` y cargada, en el orden de la ruta, que no esté completada. Si no hay ninguna, devuelve `null`.
- **Pantalla:**
  - Arriba de la ruta, el botón **«Continuar: Lección 7 · Los adjetivos»** abre esa lección.
  - Si no hay pendiente, el botón no aparece y se lee «Completaste todas las lecciones disponibles».
- Inicio («Seguir lección») usa la misma función. **Decisión del diseño**, para que los dos coincidan.

### La ruta (pantalla `#/construir`)
Una **línea de metro vertical** en turquesa (`--line-build`, el color de Construir), dividida en dos tramos con su título: «A1» y «A2».

```
 Continuar: Lección 7 · Los adjetivos   [botón]

 A1
 ●━  Lección 1 · La frase básica
 ┃   Completada · 9 de 9 a la primera · 24/11/2026
 ●━  …
 ◉━  Lección 7 · Los adjetivos            ← la siguiente
 ┃   En curso: 4 de 10
 ○━  Lección 8 · Aller, faire y el futuro próximo
 ┃   Sin empezar
 ┆
 ○┄  Lección 10 · Posesivos y demostrativos   (atenuada)
     Próximamente
 A2
 ○┄  Lección 16 · Passé composé con avoir     (atenuada)
     Próximamente
```

- **Estación de cada lección:**
  - completada: círculo lleno con ✓;
  - en curso: círculo con un punto;
  - sin empezar: círculo vacío;
  - próximamente: círculo punteado, con el tramo de línea discontinuo.
- **El estado va siempre en texto;** la forma de la estación solo lo acompaña.
- **Lecciones disponibles:** toda la fila es un enlace a `#/construir/<id>`, de al menos 56 px de alto, con foco visible. Se puede abrir cualquiera, completada o no.
- **Lecciones planificadas:** la fila es texto, no un enlace ni un botón. Va atenuada con un contraste de texto ≥ 4,5:1, porque sigue siendo legible, y sin `aria-disabled`, porque no es un control.
- **Semántica:**
  - `<ol>` por tramo, con un `<h2>` («A1», «A2») antes de cada uno;
  - en cada `<li>`: el número y el título, y luego el estado.
  - Las estaciones dibujadas llevan `aria-hidden="true"`. El lector de pantalla lee, por ejemplo: «Lección 8, Aller, faire y el futuro próximo, Sin empezar, enlace».
  - La siguiente lección pendiente lleva además `aria-current="step"`.
- **Numeración:** «Lección N» sale de la posición en la ruta, de 1 a 24.
- **Repasar:** el botón «Repasar (N)» se queda arriba, junto a «Continuar».
- Diseño final con la skill frontend-design y DESIGN.md. DESIGN.md suma la sección «Índice de lecciones (Etapa 14)».

### Archivos y caché
- Cambian `index.json`, `js/lib/lessons.js`, `js/lib/build-storage.js`, `js/lib/build-review.js`, `js/lib/backup.js`, `js/screens/build.js`, `js/screens/home.js`, `css/styles.css` e `index.html`.
- Si se crea un archivo nuevo (por ejemplo `js/lib/lesson-route.js` para `lessonState` y `nextLesson`), va a `PRECACHE_URLS`.
- `CACHE_VERSION` sube a **`v24`** en todo caso, porque cambian archivos de la app.

## Pruebas
- **Índice v2:**
  - acepta uno válido;
  - rechaza versión 1, `id` repetido, `lang` distinto, `status` desconocido y `title` vacío;
  - el índice real pasa la validación;
  - cada `available` tiene su archivo y su título coincide con el del archivo;
  - las `planned` no tienen archivo;
  - son 24 lecciones en orden: las 9 actuales disponibles y las 15 planificadas.
- **`loadLessons`:** no descarga las `planned` y devuelve sus campos.
- **Cola del repaso e Inicio:** ignoran las `planned`.
- **`lessonState`:** los 6 casos y el formato de la fecha.
- **`nextLesson`:**
  - la primera pendiente;
  - salta las completadas y las `planned`;
  - devuelve `null` si todas están completas;
  - salta una lección que no se pudo cargar.
- **Progreso:**
  - `recordPractice({ lessonId, firstTry, total, today })` guarda y reemplaza;
  - la migración de v1 a v2 conserva todo;
  - rechaza `firstTry > total` y fechas inválidas;
  - si guardar falla, lanza `StorageError` y la memoria no cambia.
- **Copia v5:**
  - ida y vuelta;
  - una v4 se migra;
  - una v3 no toca el progreso;
  - una v6 da el aviso «más nueva»;
  - si falla una escritura, se deshace todo.
- **HTML:**
  - `<ol>` con `<h2>` por tramo;
  - las estaciones con `aria-hidden`;
  - el botón «Continuar»;
  - `aria-current="step"`.
- **Contraste:** pruebas en `styles.test.js` del texto atenuado (≥ 4,5:1) y de la línea en claro y oscuro.
- **Seguridad y precarga:** siguen pasando.
- **Recorrido en el navegador:**
  - 360 y 1280 px, en modo claro y oscuro;
  - solo con teclado;
  - sin conexión;
  - restaurar una copia v4.
- **Antes de cada commit** se le muestran al usuario las salidas de `npm test`, `npm run lint` y `cd server && node --test`, y se espera su visto bueno (decisión 10).

## Lo que queda para el plan
- Los textos exactos que falten.
- El diseño visual fino con frontend-design.
- El orden de las tareas.
- Cómo se ejecuta respetando la decisión 10.
