# Etapa 5 — Progreso: diseño

**Intención.** Que al abrir Progreso el usuario sepa de un vistazo **si estudia todos los días** (racha y respuestas por día) y **qué palabras ya domina** (palabras por estado y lista de dominadas), más su porcentaje de acierto. Todo sale del historial y las tarjetas que ya guardan Estudiar (Etapa 3) y Quiz (Etapa 4).

**Objetivos:** racha diaria; respuestas por día de los últimos 14 días en un gráfico SVG propio; porcentaje de acierto de Estudiar y de Quiz (últimos 30 días); palabras nuevas / en aprendizaje / dominadas y lista de dominadas; estado vacío claro; cálculos en funciones puras probadas.
**No-objetivos:** guardar datos nuevos o un resumen aparte (se calcula siempre desde el historial); mejor racha histórica; metas u objetivos diarios; notificaciones o recordatorios; listas de palabras nuevas o en aprendizaje; exportar el progreso; gráficos interactivos (zoom, tooltips).
**Anti-objetivos:** números en pantalla que no coincidan con el historial; una racha que se rompa por la mañana antes de estudiar o por un cambio de zona horaria; un día contado dos veces; un gráfico que solo se entienda viéndolo (sin texto alternativo); dependencias nuevas.

## Decisiones

| Tema | Decisión | Alternativas | Motivo |
|---|---|---|---|
| Tarjeta dominada | Próximo repaso a **14 días o más** del último, con el algoritmo elegido — **elegido por el usuario** | 21 días (Anki «madura»); 8 días | Igual de exigente en SM-2 (4 «Bien» seguidos) y Leitner (caja 5); avance visible en ~2 semanas |
| Estado de una palabra | Nueva: ninguna tarjeta estudiada; dominada: **todas** sus tarjetas estudiadas dominadas; en aprendizaje: el resto — **elegido por el usuario** | Exigir las dos direcciones | Si solo estudias una dirección, la otra no te frena |
| Día estudiado | Al menos **una respuesta en Estudiar o Quiz** con esa fecha — **elegido por el usuario** | Solo Estudiar; mínimo de 10 | Practicar con el Quiz también es estudiar |
| Racha | Hoy sin estudiar no la rompe; se rompe al pasar un día de calendario completo sin estudiar — **aprobado por el usuario** | Contar solo hasta hoy | No ver «0» cada mañana |
| Zona horaria | Se usa la `date` guardada en cada respuesta, nunca se recalcula desde `at` — **aprobado por el usuario** | Recalcular con la zona actual | Viajar no borra ni duplica días |
| Gráfico por día | Barras de los **últimos 14 días**, total de respuestas (Estudiar + Quiz) — **aprobado por el usuario** | 7 o 30 días | Se ven dos semanas sin que las barras queden finas en el móvil |
| Acierto | **Dos porcentajes** (Estudiar y Quiz), **últimos 30 días**, con el número de respuestas — **elegido por el usuario** | Uno mezclado; desde siempre | El del Quiz lo corrige la app y es el honesto; 30 días muestra el nivel actual |
| Palabras dominadas | Números + **lista desplegable de dominadas** — **elegido por el usuario** | Solo números; lista por cada estado | Responde a «qué palabras ya domino» |
| Construcción | Funciones puras en `js/lib/stats.js` + pantalla `js/screens/progress.js` + **SVG propio** — **elegida por el usuario** | Canvas propio; librería pequeña (uPlot) | Sin dependencias, nítido, accesible, colores por CSS (modo oscuro) |
| Cálculo | Siempre desde el historial al mostrar la pantalla — decisión de Claude | Guardar un resumen | Unas decenas de miles de entradas se recorren en milisegundos; los números siempre coinciden con el historial |

## Definiciones (se copian tal cual al README, sección Progreso)

Datos de entrada (ya existen, clave `app-frances-study`):
- Entrada de Estudiar (sin `kind`): `{ at, date, cardId, wordId, direction, answer, algorithm }`.
- Entrada de Quiz: `{ kind: 'quiz', at, date, wordId, mode, correct, accentOnly }`.
- `date` es la fecha `AAAA-MM-DD` que marcaba el reloj del dispositivo **al responder** (`localDate`).
- **Hoy** = `localDate(now())` en el momento de abrir la pantalla.

1. **Día estudiado:** una fecha con al menos una entrada (de Estudiar o de Quiz) en el historial. Se usa la `date` guardada. Las entradas sin una `date` válida (`/^\d{4}-\d{2}-\d{2}$/`) se ignoran en todos los cálculos.
2. **Ancla:** la fecha más reciente entre **hoy** y la última `date` del historial, **con un tope de hoy + 1 día** — tope decidido por Claude tras la revisión. Normalmente es hoy; solo es mañana si un viaje hacia el oeste dejó respuestas con fecha «de mañana» (las zonas horarias nunca se separan más de ~26 h). Las entradas con fecha posterior a hoy + 1 (reloj del dispositivo mal puesto) no mueven el ancla: así una sola respuesta con fecha de 2027 no deja el gráfico y el acierto vacíos durante meses. Esas entradas quedan fuera del gráfico y del acierto (están después de la ventana) y no forman parte de la racha salvo que sean consecutivas con el ancla.
3. **Racha:** si el ancla es un día estudiado, se cuentan los días estudiados consecutivos hacia atrás desde el ancla. Si no (hoy todavía sin estudiar), se cuentan desde **ayer** (ancla − 1). Racha = 0 si ese día de partida no está estudiado.
   - **Se rompe** cuando pasa un día de calendario completo sin respuestas: estudiaste el 20, no el 21, y el 22 la racha es 0.
   - **Cambio de zona horaria:** como la `date` no se recalcula, un día estudiado no se pierde ni se cuenta dos veces. Un día puede «durar» unas horas más o menos. Volar hacia el este puede saltarse una fecha de calendario si no se estudia en las horas que quedan de ella; es el comportamiento esperado y se documenta.
   - `estudiadoHoy` = hoy (o una fecha posterior) tiene respuestas.
4. **Respuestas por día:** los 14 días de calendario que terminan en el ancla (ancla − 13 … ancla), con el número de entradas de cada `date`; los días sin respuestas valen 0. Las fechas se calculan con `addDays`, así que el cambio de mes y de año salen bien.
5. **Acierto (últimos 30 días):** entradas con `date` entre ancla − 29 y ancla (ambas incluidas).
   - Estudiar: acierto si `answer` es `hard`, `good` o `easy`; fallo si es `again`.
   - Quiz: acierto si `correct === true` (un acierto con acento tolerado ya viene como `true`).
   - Porcentaje = `Math.floor(aciertos × 100 / total)` (redondeo hacia abajo: nunca muestra 100 % si hubo un fallo) — decisión de Claude. Si `total = 0`, el porcentaje es `null` y se muestra «—».
6. **Tarjeta estudiada:** existe en `cards` y tiene `introducedOn` distinto de `null` (en la práctica, toda tarjeta guardada; el Quiz no crea tarjetas).
7. **Tarjeta dominada:** con el algoritmo de `settings.algorithm`:
   - SM-2: `card.sm2.interval >= 14`.
   - Leitner: `card.leitner.box >= 1` y `LEITNER_DAYS[box − 1] >= 14` (hoy, solo la caja 5, de 16 días).
   - «Otra vez» deja SM-2 en intervalo 0 y Leitner en caja 1: la tarjeta deja de estar dominada.
8. **Estado de una palabra** (solo palabras que existen en la lista; las tarjetas de palabras borradas se ignoran):
   - **Nueva:** ninguna de sus tarjetas (`<id>:fr-es`, `<id>:es-fr`) está estudiada.
   - **Dominada:** tiene al menos una tarjeta estudiada y **todas** sus tarjetas estudiadas están dominadas.
   - **En aprendizaje:** cualquier otro caso.
   - nuevas + en aprendizaje + dominadas = total de palabras de la lista.

## Funciones puras (`js/lib/stats.js`)

No usan DOM ni la hora del sistema: `today` entra como parámetro.

- `PROGRESS_DAYS = 14`, `ACCURACY_DAYS = 30`, `MASTERED_DAYS = 14`.
- `studiedDates(history)` → array de fechas distintas, ordenadas de más antigua a más reciente.
- `anchorDate(history, today)` → `today` o la última fecha del historial si es posterior.
- `streak(history, today)` → `{ days, studiedToday }`.
- `dailyCounts(history, today, days = PROGRESS_DAYS)` → `[{ date, count }]` de más antigua a más reciente, siempre de longitud `days`.
- `accuracy(history, today, days = ACCURACY_DAYS)` → `{ study: { correct, total, percent }, quiz: { correct, total, percent } }`.
- `isCardMastered(card, algorithm)` → booleano. Algoritmo desconocido → error (como `dueOf`).
- `wordStates({ words, cards, algorithm })` → `{ new, learning, mastered, masteredWords }`; `masteredWords` son las palabras dominadas ordenadas con **`sortWords`** de `js/lib/words.js` (el mismo orden que Vocabulario: sin tener en cuenta el artículo y con acentos bien ordenados, así «l'école», «l'élève», «l'enfant», «la maison», «le père») — decisión de Claude tras la revisión.

## Pantalla (`js/screens/progress.js`, `index.html`, `css/styles.css`)

Se diseña con la skill **frontend-design** siguiendo DESIGN.md (línea naranja `--line-progress`); se añade a DESIGN.md una sección «Pantalla Progreso (Etapa 5)» con cada color nuevo y su contraste comprobado.

Boceto (móvil, de arriba abajo):

```
[● Progreso]                      ← placa
┌───────────────┐ ┌──────────────┐
│ 5             │ │ ✓ Hoy ya     │  racha: número grande + «días seguidos»
│ días seguidos │ │   estudiaste │  (o «Hoy todavía no estudiaste»)
└───────────────┘ └──────────────┘
Respuestas por día · últimos 14 días
  12          8   3       20  6    ← número sobre cada barra (vacío si 0)
  ▇▇    ▁▁    ▅▅  ▂▂      ██  ▃▃   ← hueco visible en días sin respuestas
  L  M  X  J  V  S  D  L  M  X  J ← inicial del día; el último dice «hoy»
  ▸ Ver los datos día por día      ← <details> con una tabla fecha / respuestas
Acierto · últimos 30 días
  Estudiar  85 %  · 40 respuestas
  Quiz      70 %  · 20 respuestas   (o «—» + «Todavía no hiciste ningún quiz en los últimos 30 días.»)
Tus palabras
  ▕██████▒▒▒▒▒▒▒▒░░░░▏           ← barra de proporción (decorativa)
  12 nuevas · 30 en aprendizaje · 8 dominadas
  ▸ Ver las 8 palabras dominadas   ← <details>: «le chat — el gato» …
```

- **Racha:** `0` → «Sin racha» y «Estudia hoy para empezar una nueva.»; singular/plural («1 día seguido», «5 días seguidos»).
- **Gráfico (SVG propio):** creado con `createElementNS`, textos con `textContent`, `viewBox` para que escale al ancho, colores desde variables CSS (modo oscuro automático). Las barras deben tener un contraste de 3:1 o más con el fondo en los dos temas; la altura es proporcional al día con más respuestas de la ventana (si todos son 0 no hay barras). Accesibilidad: el `<svg>` lleva `role="img"` y un `aria-label` de resumen («Respuestas por día en los últimos 14 días: estudiaste 9 de 14 días, 156 respuestas en total.»); el detalle día por día está en la tabla del `<details>` (visible para todos y usable con teclado y lector de pantalla). Etiquetas de los días: inicial del día de la semana en español (L M X J V S D) y «hoy» en la barra cuya fecha es hoy (normalmente la última; si el ancla es mañana, la penúltima).
- **Barra de proporción de palabras:** decorativa (`aria-hidden="true"`); la información la da el texto.
- **Lista de dominadas:** `<details>` «Ver las N palabras dominadas», francés en Source Serif 600 (`lang="fr"`) y traducción en cursiva `--text-muted`, todo con `textContent`. Con 0 dominadas no hay lista y se lee: «Cuando repases una palabra y su próximo repaso quede a 14 días o más, aparecerá aquí.»
- **Estado vacío:**
  - Sin entradas en el historial: en lugar de racha, gráfico y acierto, una frase: «Aquí verás tu racha y tus respuestas de cada día cuando respondas tu primera tarjeta en Estudiar o en el Quiz.» La sección «Tus palabras» se sigue mostrando (todas nuevas).
  - Sin palabras en la lista: «Tus palabras» dice «Añade palabras en Vocabulario para empezar.»
- **Cuándo se calcula:** al entrar en `#/progreso` (evento `hashchange`, como Estudiar y Quiz), al cargar la app si se abre directamente en Progreso, y cuando otra pestaña cambia el estudio o las palabras (`watchExternalChanges`). Si los almacenes no se pueden leer, se muestra el aviso de almacenamiento de siempre.
- `app.js`: `initProgress({ wordStore, studyStore })` después de `initQuiz`. `sw.js`: `CACHE_VERSION = 'v10'` y los archivos nuevos en la lista de precarga.
- README: sección Progreso con las definiciones de arriba en español sencillo y los pasos para comprobarlo en el celular.

## Pruebas

TDD estricto en `tests/stats.test.js` (primero la prueba, verla fallar, luego el código). Historiales simulados construidos con un ayudante (`entry(date, …)`); `today` fijo.

| # | Caso | Esperado |
|---|---|---|
| P1 | Sin datos (historial vacío) | racha 0, `studiedToday` false; 14 días a 0; porcentajes `null` con total 0 |
| P2 | Un solo día, hoy (3 respuestas) | racha 1, `studiedToday` true; último día 3, resto 0 |
| P3 | Un solo día, ayer | racha 1, `studiedToday` false (la mañana no rompe) |
| P4 | Racha de 7 días hasta hoy | racha 7 |
| P5 | Racha de 7 días hasta ayer | racha 7, `studiedToday` false |
| P6 | Racha rota: estudió 7 días, saltó anteayer, estudió ayer y hoy | racha 2 |
| P7 | Racha rota: último estudio anteayer | racha 0 |
| P8 | Cambio de mes: 2026-10-30, 10-31, 11-01, 11-02 con hoy 11-02 | racha 4; `dailyCounts` cruza octubre → noviembre sin huecos ni fechas repetidas |
| P9 | Cambio de año y mes de febrero (2027-02-28 → 03-01; 2026-12-31 → 2027-01-01) | racha y días correctos |
| P10 | Zona horaria: última entrada con fecha de mañana | ancla = mañana; racha la incluye; el gráfico termina en ella |
| P10b | Reloj mal puesto: una entrada con fecha a meses en el futuro y actividad real hasta hoy | ancla = hoy; racha, gráfico y acierto muestran la actividad real |
| P11 | Varias respuestas el mismo día, Estudiar y Quiz | cuenta un solo día; el total del día suma las dos |
| P12 | Entradas sin `date` válida | se ignoran |
| P13 | Acierto: Estudiar `again`/`hard`/`good`/`easy`; Quiz `correct` true/false; entradas de hace 30 días (dentro) y 31 (fuera) | aciertos, totales y `floor` correctos (p. ej. 199/200 → 99) |
| P14 | Historial grande (20 000 entradas en un año) | resultados correctos y cálculo en menos de 200 ms |
| M1–M6 | `isCardMastered`: SM-2 intervalo 13 / 14; tras «Otra vez»; Leitner caja 4 / 5; algoritmo desconocido | false / true; false; false / true; error |
| W1–W6 | `wordStates`: sin palabras; palabra sin tarjetas; una dirección dominada y la otra sin estudiar → dominada; una dominada y otra no → en aprendizaje; tarjeta de palabra borrada ignorada; orden igual a Vocabulario con artículos y acentos («le père», «l'élève», «la maison», «l'école», «l'enfant» → l'école, l'élève, l'enfant, la maison, le père) | conteos y lista correctos; suma = total |

Además: pruebas de `index.html` (sección Progreso con su estructura y textos), `precache` (archivos nuevos) y `sw` (versión), como en etapas anteriores.

**Verificación de «los números coinciden con el historial real»:**
1. Cargar en el navegador un historial de prueba conocido (con fechas reales relativas a hoy, incluida una racha rota y un cambio de mes) escribiéndolo en `localStorage` desde la consola o la herramienta de navegador.
2. Abrir Progreso y anotar lo que muestra.
3. Calcular los mismos números con un **script independiente** (`node`, cuentas simples sobre el JSON copiado de `localStorage`, sin importar `stats.js`) y comparar. Mostrar al usuario el JSON, la salida del script y la captura o el texto de la pantalla.
4. Repetir con los datos reales del usuario si quiere (sin enviarlos a ningún servicio).

## Riesgos y límites

1. Si el reloj del dispositivo está mal, las respuestas quedan con esa fecha y no se corrige. Con el tope del ancla (hoy + 1), una fecha muy en el futuro no estropea la pantalla, pero tampoco cuenta en la racha ni en el gráfico.
2. Cambiar de algoritmo cambia qué tarjetas están dominadas (como ya pasa con las fechas de repaso); el README lo explica.
3. Con muchas respuestas en un día y pocas en los demás, las barras pequeñas se ven muy bajas; el número encima de cada barra da el dato exacto.
4. El historial crece ~1 MB al año en `localStorage`; esta etapa no lo resume (no hace falta todavía).
