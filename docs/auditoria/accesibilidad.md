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

## Observaciones pendientes de tu decisión (no se cambiaron)

| # | Pantalla | Observación | Por qué no se cambió |
|---|---|---|---|
| O1 | Todas (móvil) | La barra de navegación se ve abajo, pero el teclado y el lector de pantalla la recorren **antes** del contenido (está antes en el HTML). El enlace «Saltar al contenido» permite saltarla | Moverla cambia la estructura de todas las pantallas; es una decisión de diseño |
| O2 | Inicio | La frase «Aquí verás cada día lo que te toca repasar» promete algo que la app todavía no muestra en Inicio | Es contenido, no accesibilidad; cambiarla o construir ese resumen es decisión tuya |

## Comprobación manual que queda para ti

Con **TalkBack** en el celular: recorrer Inicio, Vocabulario (una ficha), Estudiar (una tarjeta), Quiz y Progreso, y comprobar que se lee cada botón, que los avisos se anuncian y que el gráfico de Progreso se lee con su resumen. Está en la lista del README.
