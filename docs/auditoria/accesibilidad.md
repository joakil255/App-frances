# Auditoría de accesibilidad (Etapa 7)

Fecha: 23/11/2026. Rama `etapa-7-publicacion`. Navegador: Firefox 160 sin ventana (WebDriver BiDi), a 320 px, 360 px y 1280 px, en tema claro y oscuro. La lectura con TalkBack **no** se pudo hacer aquí: queda en la lista de comprobación del README.

## Qué se revisó y cómo

| Comprobación | Cómo | Resultado |
|---|---|---|
| Contraste de texto (≥ 4,5:1) | Prueba automática nueva en `tests/styles.test.js`: 19 pares texto/fondo de DESIGN.md + blanco sobre «Borrar», en claro y oscuro | Todos cumplen |
| Contraste de bordes de campos y foco (≥ 3:1) | Misma prueba: borde de campos y anillo de foco sobre fondo y tarjeta | Todos cumplen |
| Gráficos de Progreso (≥ 3:1) | Prueba de la Etapa 5 | Cumplen |
| Campos con etiqueta, botones y enlaces con nombre, SVG con texto alternativo u ocultos, imágenes con `alt`, orden de títulos, objetivos táctiles de 44 px, ids repetidos, desplazamiento lateral, ventanas con nombre | Script en el navegador sobre 16 estados: Inicio, ventana Restaurar, Vocabulario, ficha, formulario, Exportar, resumen de importar, Estudiar (resumen, ajustes, anverso, reverso), Quiz (inicio, opción múltiple, respuesta, escribir) y Progreso con los desplegables abiertos | Sin hallazgos. **Control:** el mismo script detectó un botón sin nombre, un campo sin etiqueta y objetivos de 30 px puestos a propósito |
| Texto francés con `lang="fr"` | Script sobre palabras, ficha, tarjetas y ejemplos; revisión del HTML y del código que crea texto | Todo el francés lo lleva; la página es `lang="es"` |
| Foco visible y orden con `Tab` | Recorrido con teclado y capturas | Anillo de 3 px en todos los controles; orden lógico |
| Foco en ventanas | Abrir y cerrar con teclado (también `Esc`) | Al abrir va al primer botón (en Restaurar, a «Cancelar», la opción segura); al cerrar vuelve al botón que la abrió |
| Avisos que se anuncian | Revisión del HTML | Errores con `role="alert"`, resultados con `role="status"`, gráfico con `role="img"` y resumen |
| Zoom | `<meta name="viewport">` | No bloquea el zoom (sin `maximum-scale` ni `user-scalable=no`) |
| Movimiento | `css/styles.css` | No hay animaciones ni transiciones |

## Hallazgos

| # | Pantalla | Hallazgo | Gravedad | Arreglo | Prueba |
|---|---|---|---|---|---|
| — | Todas | Ningún fallo de accesibilidad encontrado con las comprobaciones de arriba | — | — | `tests/styles.test.js` (contraste ampliado), `tests/index-html.test.js` |

## Observaciones pendientes de tu decisión

Las dos observaciones de la Etapa 7 quedaron **resueltas en la Etapa 17** (rediseño en tres destinos).

| # | Pantalla | Observación | Cómo se resolvió |
|---|---|---|---|
| O1 | Todas (móvil) | La barra de navegación se veía abajo, pero el teclado y el lector de pantalla la recorrían **antes** del contenido | **Resuelta en la Etapa 17:** en el HTML la barra va **después** del contenido, así que el teclado y el lector llegan primero al contenido y la barra queda al final. Por eso ya no hace falta «Saltar al contenido» y se quitó. Prueba: `tests/index-html.test.js` |
| O2 | Inicio | La frase «Aquí verás cada día lo que te toca repasar» prometía algo que la app no mostraba | **Resuelta en la Etapa 17:** Inicio ya no existe. **Aprende** muestra de verdad el «Repaso de hoy» (qué toca ahora y la línea del día) y **Progreso** el objetivo de hoy. Pruebas: `tests/today.test.js` |

## Etapa 17: comprobaciones nuevas

Navegador: Chromium sin ventana (DevTools Protocol), a 360 × 740 px y a 1280 px, en tema claro y oscuro. La lectura con TalkBack **no** se pudo hacer aquí: queda en la lista del README (comprobación 13).

| Comprobación | Resultado |
|---|---|
| Contraste de los pares nuevos: estaciones y vía `--emphasis` sobre la baldosa (≥ 3:1), borde turquesa de la lección actual (≥ 3:1), `.today-main` y `.practice-count` (≥ 4,5:1) | Cumplen; pruebas nuevas en `tests/styles.test.js`. Los colores de la barra azul (`--nav-*`) ya no existen |
| Objetivos táctiles: todo `a, button, summary, select, input` visible mide al menos 44 × 44 px en Aprende, Practica, Progreso, Palabras (vacía y con palabras), Estudiar y las demás pantallas | **Tres fallos encontrados y arreglados:** «‹ Leer» medía 41 × 44 px (ahora 44 × 44); la etiqueta de las casillas de Quiz y Conversar medía 20 px de alto (ahora 44); los botones principales medían 44 px y ahora miden 48 px (56 px «Repasar» de Aprende y «Mostrar respuesta»). Con una excepción: los enlaces de la lista de fuentes de una lección (40 px de alto) van dentro de una frase |
| Desbordamiento lateral | Ninguna pantalla se desborda a 360 px |
| `prefers-reduced-motion: reduce` | No hay transiciones ni animaciones en ningún elemento (ya no las había) |
| Pistas de teclado `<kbd>` de Estudiar | Con puntero táctil no se ven |
| Orden del teclado | Primero el contenido, al final la barra; cada baldosa de Practica se abre con `Intro` y el «‹ Practica» vuelve |

## Comprobación manual que queda para ti

Con **TalkBack** en el celular: recorrer Aprende, Practica, Progreso y «Datos y copia», y dentro de Practica Palabras (una ficha), Estudiar (una tarjeta) y Quiz, y comprobar que se lee cada botón, que los avisos se anuncian y que el gráfico de Progreso se lee con su resumen. Está en la lista del README.
