# Etapa 17 — Rediseño en tres destinos (Aprende, Practica, Progreso)

Fecha: 27/11/2026 · Rama de diseño: `etapa-17-rediseno-diseno` · Prototipo elegido: `docs/prototipos/rediseno-b-anden.html` (dirección B, «Azulejo y andén»).

## 1. Para qué

La app creció a 8 pantallas y la barra del móvil tiene 7 enlaces (Construir ni siquiera cabe). Al abrirla no queda claro qué hacer hoy, la copia de seguridad ocupa la vista principal y la navegación va antes del contenido para el teclado y el lector de pantalla. El usuario quiere que en el móvil sea **más clara y fácil de usar**: al abrir, una sola acción principal que diga qué toca hoy; detrás, todo lo demás ordenado en tres destinos.

La inspiración es la organización de una app comercial de idiomas (barra con 3 destinos, inicio con una tarjeta grande y una acción, práctica agrupada por habilidad con el número de elementos, progreso con objetivo y cifras). **Solo la organización**: nada de sus colores, letras, iconos, textos, nombres ni estética. La app conserva su identidad «Métro» (DESIGN.md), que evoluciona.

## 2. Objetivos, no objetivos y anti-objetivos

**Objetivos**
- Barra inferior fija con 3 destinos: **Aprende**, **Practica**, **Progreso** (en el computador, los mismos 3 en la barra lateral).
- Aprende guía el día con **una acción principal** elegida en orden: palabras pendientes → frases pendientes → continuar la lección.
- Resolver los hallazgos de las auditorías: Inicio guiado con acción principal; copia de seguridad fuera de la vista principal; navegación compacta en móvil; estado vacío con un botón que cargue el mazo; navegación después del contenido en el DOM (observación O1 de `docs/auditoria/accesibilidad.md`). La frase «Aquí verás cada día lo que te toca repasar» (observación O2) deja de prometer algo que no existe: ahora Inicio/Aprende sí lo muestra.

**No objetivos**
- No se añaden funciones. Todo lo que se puede hacer hoy se sigue pudiendo hacer, con los mismos datos.
- No cambia el interior de las pantallas de práctica (Palabras, Estudiar, Quiz, Leer, Conversar) ni el de una lección o del repaso de frases, salvo lo listado aquí.
- No se crea un objetivo configurable (como «20 tarjetas al día»): el objetivo es el que la app ya conoce, dejar el repaso en cero.

**Anti-objetivos** (sería un fracaso aunque funcione)
- Que se pierdan datos o que una PWA ya instalada abra una pantalla rota o en blanco.
- Que algo se parezca a la app de referencia (colores, iconos, textos, candados o banners de pago).
- Que el estado se indique solo con color, que la estética rompa el uso sin conexión o que un botón táctil mida menos de 44 px.
- Dependencias nuevas o imágenes pesadas.

## 3. Restricciones

- Sin backend: datos en `localStorage`, como hoy. Sin dependencias nuevas. Contenido con `textContent`, nunca `innerHTML`.
- Las direcciones antiguas siguen funcionando (PWA instalada, accesos guardados).
- Accesibilidad: navegación después de `<main>` en el DOM (CSS la deja abajo), landmarks correctos, foco al título al cambiar de pantalla, objetivos táctiles ≥ 44 px, contraste de texto ≥ 4,5:1 y de elementos gráficos ≥ 3:1, atajos de teclado ocultos en pantallas táctiles (ya lo hace `@media (hover: hover) and (pointer: fine)`), `prefers-reduced-motion`, modo oscuro, sin conexión.
- Service worker: actualizar `PRECACHE_URLS` si hay archivos nuevos y subir `CACHE_VERSION` (hoy `v28`) en cada tanda que cambie archivos de la app.
- Pruebas con TDD para la lógica nueva (rutas, elección de la acción del día, objetivo, conteos); no se borra ni se debilita ninguna prueba para que pase. Una prueba cuyo requisito cambió se reescribe al requisito nuevo y se dice en el informe.

## 4. Enfoques considerados

Se prototiparon dos direcciones visuales (en `docs/prototipos/`), las dos con la misma organización:

| | A · Placas esmaltadas | **B · Azulejo y andén (elegida)** |
|---|---|---|
| Repaso de hoy | Placa azul grande con botón amarillo | Baldosa clara con **línea del día** de 3 estaciones y botón azul |
| Lecciones | Ruta vertical turquesa (completadas plegadas) | **Carrusel** por nivel que se abre en la lección actual |
| Practica | Filas con franja de color | Baldosas en 2 columnas con banda de color arriba |
| Barra | Azul oscura, como hoy | Clara, la pestaña activa lleva una placa azul |
| Contra | Aprende larga (~2.500 px a 360 px) | Hay que deslizar para ver más lecciones |

El usuario eligió **B** («se ve genial»). Se descartó además reorganizar sin pantalla Practica (dejar 7 enlaces y solo cambiar Inicio): no resuelve la navegación compacta.

## 5. Navegación y direcciones

**Pantallas de primer nivel** (en la barra): Aprende (`#/aprende`), Practica (`#/practica`), Progreso (`#/progreso`).

| Hoy | Dirección hoy | Después | Dirección |
|---|---|---|---|
| Inicio | `#/` | Aprende | `#/aprende`; `#/` y `""` muestran Aprende |
| Lista de lecciones | `#/construir` | parte de Aprende | **redirige** a `#/aprende` con `location.replace` (Atrás no queda en bucle) |
| Lección / repaso de frases | `#/construir/<id>`, `#/construir/repaso` | igual (dentro de Aprende) | sin cambio |
| Palabras, Estudiar, Quiz | `#/vocabulario`, `#/estudiar`, `#/quiz` | dentro de Practica | sin cambio |
| Leer / una historia | `#/leer`, `#/leer/<id>` | dentro de Practica | sin cambio |
| Conversar | `#/conversar` | dentro de Practica | sin cambio |
| — | — | Practica (nueva, solo navegación) | `#/practica` |
| Progreso | `#/progreso` | Progreso + «Datos y copia» | sin cambio |
| Dirección desconocida | → Inicio | → Aprende | — |

- El id interno de la pantalla `home` puede seguir llamándose `home` o pasar a `learn`; decisión del constructor, siempre que las pruebas de rutas cubran `#/`, `#/aprende` y `#/construir`.
- **Pestaña activa:** en las pantallas de primer nivel, su pestaña lleva `aria-current="page"`. En las de segundo nivel la pestaña del destino al que pertenecen lleva `aria-current="true"` (Practica para Palabras, Estudiar, Quiz, Leer y Conversar; Aprende para una lección y el repaso de frases). Se ve igual en los dos casos.
- **Volver:** cada pantalla de segundo nivel lleva, encima de la placa, un `.text-link` «‹ Practica» (`#/practica`) o «‹ Aprende» (`#/aprende`). En una lección y en el repaso de frases, el enlace actual «‹ Todas las lecciones» pasa a ser «‹ Aprende». En Leer, la vista de una historia conserva su propia forma de volver a la biblioteca; «‹ Practica» va en la biblioteca.
- **Foco:** al cambiar de pantalla, el foco va al `<h1>` como hoy. En la primera carga, no se mueve.
- **DOM:** `<main>` primero y `<nav aria-label="Principal">` después; el CSS la fija abajo en el móvil y la coloca en la columna izquierda en el computador (grid con `grid-column`/`grid-row`, sin reordenar el DOM). El enlace «Saltar al contenido» se quita: ya no hay nada que saltar antes del contenido. La prueba que pide ese enlace se sustituye por una que comprueba que la navegación va después de `<main>`.

## 6. Pantallas (dirección B)

Medidas a 360 px de ancho. Textos en español claro, segunda persona. Las cifras de ejemplo son ilustrativas.

### 6.1 Aprende

```
[● Aprende]
┌ Repaso de hoy ──────────────────┐   baldosa (.tile)
│ 12 palabras te esperan          │   Source Serif 600, 1,95 rem
│  ◉━━━━━━━○━━━━━━━○              │   línea del día (decoración + texto)
│ Palabras  Frases   Lección      │
│ Ahora: 12  3 pend.  Lección 7   │
│ [      Repasar 12 palabras     ]│   primario, ancho completo, 56 px
│ Después: 3 frases y la lección 7│
└─────────────────────────────────┘
Lecciones
A1
[◉ Lección 7 Los adjetivos  En curso: 4 de 10][○ Lección 8 …   ← carrusel
Desliza para ver las 15 lecciones de A1.
A2
[○ Lección 16 Passé composé con avoir][…
```

**Elección de la acción principal** (función pura nueva, con pruebas):
1. Si la cola de Estudiar de hoy tiene elementos (repasos + nuevas permitidas hoy, lo mismo que contaría `buildQueue`) → «N palabras te esperan», botón **«Repasar N palabras»** → `#/estudiar`.
2. Si no, y hay frases vencidas (`countDueToday`) → «N frases te esperan», botón **«Repasar N frases»** → `#/construir/repaso`.
3. Si no, y hay una lección pendiente (`nextLesson`) → «Tu repaso de hoy está completo», botón **«Continuar: Lección N · Título»** (el texto de `continueLabel`) → `#/construir/<id>`.
4. Si no hay nada → «Tu repaso de hoy está completo», sin botón; texto «Completaste todas las lecciones disponibles. Mañana tendrás más repaso.» y un `.text-link` «Practicar algo más» → `#/practica`.
- Sin palabras (lista vacía) el paso 1 no aplica: se pasa al 2.
- Si las lecciones aún no cargaron o fallaron, el paso 3 usa «Ver las lecciones» o se omite; el aviso de carga de lecciones se muestra como hoy.
- La línea: tres estaciones `<ol aria-label="Orden del día">`, una por paso, con la de ahora en `aria-current="step"`. Cada estación se calcula por separado (función pura, con pruebas):
  - *Palabras* y *Frases*: con 0 pendientes → **hecha**, «Al día»; con N > 0 → **ahora** si es el primer paso con algo pendiente («Ahora: N pendientes»), si no **después** («N pendientes»).
  - *Lección*: si hay lección siguiente → **ahora** cuando palabras y frases están en 0 («Ahora: Lección N»), si no **después** («Lección N»); sin lección pendiente y con lecciones cargadas → **hecha**, «Terminadas»; lecciones sin cargar o con error → **después**, «Sin cargar».
  - Sin palabras en la lista, Palabras se muestra como **hecha** con «Sin palabras». Las estaciones son decorativas (`aria-hidden`): hecha = llena azul con ✓, ahora = amarilla con doble anillo azul y nombre subrayado, después = vacía con borde azul.
- «Después: …» resume lo que queda tras la acción principal.
- Botón «Repasar N frases» vacío o no aplicable: nunca se muestra un botón desactivado como acción principal.

**Lecciones (carrusel)**: sustituye a la lista de `#/construir`. Un `<h3>` por nivel (A1, A2) y un `<ol>` con `aria-labelledby`; el `<ol>` es la región desplazable (`overflow-x: auto`, `scroll-snap`) con `tabindex="0"` para poder moverlo con las flechas (las lecciones planificadas no son enlaces y si no, no se alcanzarían). Cada lección es una baldosa de ~76 % del ancho:
- Disponible: enlace a `#/construir/<id>` con «Lección N», título (Source Serif 600), estado («Sin empezar», «En curso: X de Y», «Completada · F de T a la primera · DD/MM/AAAA»…) y, si aplica, «Tiene partes REVISAR». La siguiente pendiente lleva `aria-current="step"` y borde turquesa.
- Planificada: `<p>` (no enlace), borde discontinuo, texto `--text-planned`, «Próximamente».
- No se pudo cargar: `<p>`, estado «No se pudo cargar».
- Las estaciones turquesa de la Etapa 14 se reutilizan dentro de la baldosa (`aria-hidden`).
- Al mostrar Aprende, cada carrusel se desplaza (sin animación, sin mover la página) hasta la lección actual de ese nivel.
- Bajo cada carrusel: «Desliza para ver las N lecciones de A1.» en táctil; en puntero fino, «Usa las flechas o la barra para ver las N lecciones de A1.».
- El modelo de cada baldosa sale de `routeRows` (ya probado); solo cambia la vista. **La numeración sigue siendo continua** como hoy (A2 empieza en «Lección 16»), igual que en la cabecera de la lección y en «Continuar: Lección N · …». El prototipo numeraba por nivel: es un error del prototipo, no un cambio.

Lo que había en Inicio y no está arriba (aviso `#home-notice`, copia de seguridad) se mueve a Progreso (6.3). La tarjeta «Construir frases» de Inicio desaparece: su contenido (siguiente lección, repasar frases, ver todas) queda cubierto por el repaso de hoy y el carrusel.

### 6.2 Practica

```
[◎ Practica]
Vocabulario
[▀ Palabras      ][▀ Estudiar         ]
[  160 palabras  ][  12 para repasar  ]
[                ][  y 5 nuevas       ]
[▀ Quiz: 3 modos: opción múltiple, escribir y dictado ]
Leer y escuchar
[▀ Leer · 3 historias                                 ]
Hablar
[▀ Conversar · Necesita conexión a internet           ]
```

- Grupos con `<h2>`, cada uno un `<ul>`; cada baldosa es un enlace con su banda de color de línea (decoración) arriba, nombre en Barlow 700 y cifra en serif.
- Cifras (con `textContent`, en vivo al mostrar la pantalla): Palabras = «N palabras» (singular/plural); Estudiar = «N para repasar y M nuevas», o «Al día» si ambas son 0, o «Añade palabras para empezar» sin palabras; Quiz = «3 modos: opción múltiple, escribir y dictado»; Leer = «N historias» / «Todavía no tienes historias»; Conversar = «Necesita conexión a internet».
- La gramática no aparece aquí: son las lecciones, que viven en Aprende.

### 6.3 Progreso

```
[● Progreso]
┌ Objetivo de hoy: dejar el repaso en cero ┐
│ Te quedan 12 palabras y 3 frases.        │
│ ●━━━━━━━━━━━──────────────○              │  trayecto (decoración)
│ Empiezas el día          Repaso en cero  │
│ Llevas 18 respuestas hoy.                │
└──────────────────────────────────────────┘
Tu constancia
[6 días · de racha seguidos][84 % · acierto en Estudiar (30 días)]
En el Quiz, 76 % de acierto en los últimos 30 días.
Respuestas de los últimos 14 días   (gráfico y tabla de hoy)
Tus palabras                         (barra de estados y dominadas de hoy)
(+) Datos y copia                    <details>, cerrado al entrar
```

- **Objetivo** (función pura nueva, con pruebas): quedan = palabras en la cola de hoy + frases vencidas hoy. Hechas = palabras distintas respondidas hoy en Estudiar que ya no están en la cola + frases cuyo `lastReviewedAt` (marca de tiempo ISO) cae **hoy en hora local** y que ya no están vencidas. Avance = hechas / (hechas + quedan). Textos: «Te quedan N palabras y M frases.» (omitiendo la parte en 0); con 0 → «Repaso de hoy completado. No te queda nada pendiente.»; si hoy no había nada (hechas = quedan = 0) → la misma frase de completado. «Llevas N respuestas hoy.» sale de `dailyCounts` (ya existe; incluye Quiz, como hoy).
- El trayecto es decorativo (`aria-hidden`); el texto da la información.
- Racha, gráfico con su tabla, acierto y «Tus palabras» se conservan con su lógica actual; cambia la presentación (racha y acierto de Estudiar en dos baldosas; Quiz en una frase debajo). El estado vacío actual se conserva y, sin palabras, lleva un botón «Ir a Palabras».
- **Datos y copia** (`<details class="fold">`, `<summary>` de 56 px con «+»/«−» en un círculo):
  - *Copia de seguridad*: el texto actual, **Guardar copia** (primario) y **Restaurar copia**, la zona de estado y el aviso de errores, la ventana de confirmar. Misma lógica que hoy (`home.js` → se traslada).
  - *Tus palabras en un archivo*: **Importar palabras** y **Exportar palabras**, que salen de Palabras. Abren las mismas ventanas (resumen de importar, reemplazar, elegir formato) con la misma lógica.
  - *Ajustes*: **Ajustes del estudio**, que abre la misma ventana `#study-settings` (sigue también en Estudiar).
  - Si una acción de dentro muestra un aviso o termina con un mensaje, el `<details>` está abierto (lo abrió el usuario para pulsarla).
  - **Tras restaurar**: la app se recarga en `#/progreso` (hoy va a `#/`) con «Datos y copia» abierto, y el mensaje «Se restauró la copia del …» aparece en su zona de estado, como hoy aparece en Inicio. La marca `app-frances-restored` se sigue usando igual.

### 6.4 Pantallas de Practica y de Aprende por dentro

- Encima de la placa, el enlace de volver (sección 5).
- **Palabras:** quedan buscar, filtros, **Añadir palabra** y **Añadir 100 palabras A1**; salen Importar y Exportar (y el `<input type="file">` de importar, que se mueve con ellos).
- **Estado vacío de Palabras** (sin ninguna palabra):
  ```
  Todavía no tienes palabras.
  Empieza con 100 palabras frecuentes de nivel A1 o añade las tuyas.
  [Añadir 100 palabras A1]   ← primario: el mismo flujo del mazo (ventana de revisión)
  [Añadir palabra]
  ```
  Con palabras pero sin resultados de búsqueda, se mantiene «Ninguna palabra coincide con la búsqueda.» sin botones. Mientras la lista está vacía, los botones «Añadir palabra» y «Añadir 100 palabras A1» de la barra de herramientas se ocultan, para no repetirlos (vuelven en cuanto hay una palabra).
- **Estudiar y Quiz sin palabras:** el texto actual + botón secundario **Ir a Palabras** (`#/vocabulario`).
- Una lección y el repaso de frases: «‹ Aprende» en lugar de «‹ Todas las lecciones».

## 7. Dirección visual B — cambios en DESIGN.md

Se reescribe la sección «Estructura» y se añade «Etapa 17 · Tres destinos». Lo demás se conserva (colores, letras, placa, botones, campos, ventanas, componentes de cada pantalla).

- **Baldosa (`.tile`)**: fondo `--surface`, borde 2 px `--divider`, canto inferior de 6 px (`border-bottom-width`), radio 12 px. Es la única excepción al «radio 8 px»: imita el azulejo biselado del metro. Sin sombras.
- **Barra (móvil)**: fondo `--surface`, borde superior 2 px `--divider`, 3 enlaces de 64 px de alto que se reparten el ancho; texto `--text-muted` Barlow 500; activo: texto Barlow 700 dentro de una placa azul pequeña (`--plaque`, texto blanco, radio 6 px) + `aria-current`. El punto de línea lleva anillo `--text` (claro `#1C2433`, oscuro `#E8ECF3`) porque la barra ya no es azul.
- **Barra (≥ 900 px)**: barra lateral de 200 px a la izquierda, mismo fondo claro, «Français» arriba, los 3 enlaces en columna con la misma placa en el activo.
- **Colores de línea**: Aprende `#F2C230` (el de Inicio), Progreso `#E0663A`; Practica no tiene color propio: su punto es el símbolo de **correspondencia** del plano del metro (círculo blanco con anillo interior oscuro de 4 px), porque es donde se cruzan las líneas. Cada pantalla de Practica conserva su color.
- **Repaso de hoy**: título «Repaso de hoy» Barlow 700 `--text-muted` con el punto amarillo; frase principal Source Serif 600 1,95 rem; botón primario a lo ancho, 56 px.
- **Línea del día**: vía de 4 px `--emphasis`; estaciones de 26 px con borde de 4 px `--emphasis`; hecha llena con ✓ en `--surface`; ahora en `--signal` `#F2C230` con doble anillo; nombre en Barlow 700, estado en Barlow 500 `--size-sm` `--text-muted`.
- **Practica**: rejilla de 2 columnas (12 px de separación); una baldosa sola en su grupo, o la tercera, ocupa las dos columnas; banda de 8 px del color de la línea arriba; mínimo 112 px de alto.
- **Objetivo**: trayecto de 4 px (`--divider` de fondo, `--emphasis` el avance), estación inicial llena y final vacía, etiquetas «Empiezas el día» / «Repaso en cero».
- **Movimiento**: ninguno nuevo. El desplazamiento del carrusel es instantáneo.

**Contraste comprobado** (nuevos pares; el resto ya está en DESIGN.md): `--text-muted` sobre `--surface` 7,7 (oscuro 8,5); blanco sobre placa activa 10,7 (oscuro 8,2); vía/estaciones `--emphasis` sobre `--surface` 10,7 (oscuro 15,5); anillo de punto oscuro 13,1; borde turquesa de la lección actual 4,2 (oscuro 3,7, ≥ 3:1); `--text-planned` sobre `--surface` 5,6 (oscuro 5,6). El borde de las baldosas (`--divider`, 1,5:1) es decoración: el texto identifica cada enlace. La estación amarilla (1,7:1 sola) siempre va con anillo azul de 10,7:1.

## 8. Service worker, pruebas y documentación

- Subir `CACHE_VERSION` una vez por tanda (v29, v30…; lo que se publica es la última); añadir a `PRECACHE_URLS` cualquier archivo nuevo (p. ej. `js/screens/practice.js`, `js/lib/today.js`). `tests/precache.test.js` ya comprueba que todos los JS de la app estén precargados.
- Lógica nueva con TDD y casos límite (vacío, sin lecciones cargadas, lecciones fallidas, todo terminado, «Otra vez» que deja la palabra en la cola, acentos en títulos, listas grandes): rutas y redirección, elección de la acción del día, textos de la línea del día, objetivo de hoy, cifras de Practica (singular/plural).
- Pruebas de estructura (`tests/index-html.test.js`, `tests/styles.test.js`, `tests/router.test.js`): se reescriben a los requisitos nuevos (3 enlaces, nav después de main, Importar/Exportar en Progreso, carrusel con `tabindex` y `aria-labelledby`, `--text-planned` y contraste). En el informe se lista cada prueba reescrita y por qué.
- README: actualizar la descripción de pantallas y la lista de comprobación manual (TalkBack en el móvil).

## 9. Lo que decidió el usuario

- Orden de la acción del día: palabras → frases → continuar lección.
- Objetivo de Progreso: dejar el repaso en cero (sin ajustes nuevos).
- Estado vacío: el mazo de 100 palabras A1 (no recargar las 60 iniciales).
- «Datos y copia» en Progreso: copia de seguridad, importar y exportar palabras, y Ajustes del estudio (que sigue también en Estudiar). El código de acceso y la voz se quedan en Conversar; las preferencias de lectura, en Leer.
- Navegación y mapa de pantallas de la sección 5.
- Dirección visual B «Azulejo y andén».
- **Publicación**: rama común `etapa-17-rediseno` creada desde `main` actualizado. Cada tanda va en su propia rama desde la común, con sus pruebas y su revisión independiente, y se une a la común. Un **solo merge a `main`** al final publica el rediseño completo en GitHub Pages: el teléfono nunca ve una app a medias. Por eso las tandas intermedias pueden dejar pantallas sin terminar (p. ej. Practica sin baldosas), siempre con las pruebas en verde, y no hace falta código provisional para el teléfono.

## 10. Decisiones mías (puedes corregirlas)

- «Palabras pendientes» = toda la cola de Estudiar de hoy (repasos + nuevas permitidas), para que Aprende lleve a Estudiar hasta que diga «Terminaste por hoy».
- `#/construir` redirige a `#/aprende`; las demás direcciones no cambian.
- `aria-current="true"` en la pestaña del destino padre para pantallas de segundo nivel.
- Se quita «Saltar al contenido» (la navegación ya va después).
- El carrusel se usa también en el computador; la región desplazable es enfocable.
- Practica no tiene color propio: usa el símbolo de correspondencia.
- La tarjeta «Construir frases» de Inicio desaparece (su contenido queda en el repaso de hoy y el carrusel).
- Numeración continua de lecciones (como hoy); el prototipo se corrigió.
- Tras restaurar una copia, la app vuelve a Progreso con «Datos y copia» abierto y el mensaje visible.
- Estado de cada estación de la línea del día según la regla de 6.1.
- En Palabras vacía, los botones de la barra de herramientas se ocultan para no repetir los del estado vacío.

## 11. Lo que queda al constructor

- Cómo repartir el código: p. ej. `js/lib/today.js` (acción del día, línea del día, objetivo: puras), `js/screens/learn.js` (Aprende), `js/screens/practice.js` (Practica); trasladar la copia de seguridad de `home.js` a Progreso; mover Importar/Exportar de `vocabulary.js` sin duplicar la lógica.
- Cuándo recalcular cifras (al mostrar cada destino y al cambiar datos en otra pestaña, como hoy).
- Nombres de clases CSS, siempre con los tokens de DESIGN.md.
- El orden de las tandas y su tamaño se fijan en el plan (Fase 2): navegación y estructura → Aprende → Practica → Progreso → pulido y accesibilidad, cada una en su rama.

## 12. Lo que no se puede verificar desde aquí

- Comportamiento en un **Android real** (Chrome, PWA instalada que se actualiza de v28 a la versión nueva) y con **TalkBack**: queda en la lista manual del README.
- Las capturas y medidas se toman con Chromium sin ventana a 360 px y 1280 px.
