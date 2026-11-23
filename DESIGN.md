# DESIGN.md — dirección visual «Métro»

Guía visual de la app. Toda pantalla o componente nuevo la sigue. La accesibilidad y el funcionamiento sin conexión van antes que la estética.

## Idea

Los carteles esmaltados del metro de París: placas azules con borde blanco sobre azulejo blanco. Cada pantalla es una «línea» con su color, para saber dónde estás de un vistazo. El color fuerte se concentra en la placa del título y en la barra de navegación. El resto es tranquilo: fondo claro, texto oscuro y mucho aire, porque la app se usa para estudiar a diario.

## Colores

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#FAFBFC` azulejo | `#101827` andén de noche | Fondo de la página |
| `--tile-line` | `#DDE3E8` | — (sin juntas) | Juntas del azulejo (decoración) |
| `--text` | `#1C2433` | `#E8ECF3` | Texto principal |
| `--plaque` | `#233A7A` | `#2D4A9A` | Fondo de la placa de título |
| `--plaque-text` | `#FFFFFF` | `#FFFFFF` | Texto de la placa |
| `--plaque-border` | `#FFFFFF` | `#E8ECF3` | Borde esmaltado de la placa |
| `--nav-bg` | `#233A7A` | `#1A2B5C` | Barra de navegación |
| `--nav-text` | `#C9D3EE` | `#C9D3EE` | Enlaces inactivos |
| `--nav-active` | `#FFFFFF` | `#FFFFFF` | Enlace activo |
| `--focus` | `#233A7A` sobre fondo, `#F2C230` sobre azul | `#F2C230` | Anillo de foco |

**Color de línea por pantalla** (solo decoración: puntos y franjas, nunca texto):

| Pantalla | Token | Color |
|---|---|---|
| Inicio | `--line-home` | `#F2C230` amarillo |
| Vocabulario | `--line-vocabulary` | `#2F7FD0` azul |
| Estudiar | `--line-study` | `#9B5BB5` violeta |
| Quiz | `--line-quiz` | `#2FA36B` verde |
| Progreso | `--line-progress` | `#E0663A` naranja |

Los puntos de línea siempre llevan un anillo blanco y van sobre la barra azul: el amarillo sobre fondo claro solo tiene 1,6:1.

**Contraste comprobado** (WCAG AA exige 4,5:1 en texto y 3:1 en elementos gráficos):
texto/fondo claro 15,0 · texto/fondo oscuro 15,0 · blanco/placa 10,7 (oscuro 8,2) · inactivo/barra 7,2 (oscuro 9,1) · foco amarillo/barra 6,4 (oscuro 8,1) · foco amarillo/fondo oscuro 10,6 · foco azul/fondo claro 10,4 · aviso blanco/#1C2433 15,6 · «ç» del icono 10,4.
Si se añade un color nuevo, se comprueba su contraste antes de usarlo.

## Letras

- **Barlow Semi Condensed** (500 y 700): títulos de placa, navegación, botones. Es la voz de «rótulo».
- **Source Serif 4** (400, 600 y 400 cursiva): texto y palabras en francés. La cursiva se usa para la traducción al español.
- Archivos `.woff2` guardados en `fonts/` con su licencia (SIL Open Font License). Nunca se cargan desde internet.

**Escala** (base 17 px, razón 1,25): 13,6 · **17** (texto) · 21,3 · 26,6 (placa) · 33,2 (palabra en estudio).
Interlineado: 1,55 en texto serif, 1,2 en títulos. Líneas de 65 caracteres como máximo.
Texto en minúscula normal (sin mayúsculas sostenidas). No se resalta una sola palabra de un título con otro color o estilo.

## Espacios y formas

- Espaciado en pasos de 4 px: 4, 8, 12, 16, 24, 32, 48.
- Radio: 8 px en placas y botones. Nada más se redondea.
- Sin sombras; la profundidad la da el borde esmaltado de la placa.

## Estructura

- **Móvil (< 900 px):** barra de navegación fija abajo, cinco enlaces de igual ancho, cada uno de 48 px de alto como mínimo.
- **Computador (≥ 900 px):** barra vertical a la izquierda, de 200 px, con «Français» arriba. El contenido se alinea a la izquierda, con un ancho máximo de 65 caracteres.
- Cada pantalla empieza con su **placa**: el punto de color de su línea y el nombre de la pantalla.
- **Enlace activo:** texto blanco, negrita y franja del color de la línea (arriba en el móvil, a la izquierda en el computador), más `aria-current="page"`. Nunca se indica solo con color.

## Componentes

- **Placa de título:** fondo `--plaque`, texto `--plaque-text` (Barlow 700, 26,6 px), borde de 3 px `--plaque-border` y contorno exterior de 2 px `--plaque`, radio 8 px, punto de línea de 22 px.
- **Aviso de versión nueva:** franja oscura (`#1C2433`, texto blanco) con «Hay una versión nueva de la app.» y un botón **Actualizar** (fondo `#F2C230`, texto `#1C2433`, 9,3:1, 44 px de alto como mínimo).
- **Pantalla vacía:** una frase que dice qué aparecerá ahí, desde el punto de vista del usuario.
- **Foco de teclado:** anillo de 3 px siempre visible (`:focus-visible`), con color `--focus` según el fondo.

## Componentes de formularios y listas (Etapa 2)

**Colores nuevos** (contraste comprobado; claro / oscuro):

| Token | Claro | Oscuro | Uso | Contraste |
|---|---|---|---|---|
| `--surface` | `#FFFFFF` | `#1A2438` | Fondo de campos y ventanas | texto 15,6 / 13,1 |
| `--text-muted` | `#4A5368` | `#B8C0D2` | Traducción, categoría, ayudas | 7,4 / 9,7 |
| `--field-border` | `#5F6880` | `#8F9BB8` | Borde de campos y selectores | 5,4 / 5,6 |
| `--divider` | `#C7CFDA` | `#2E3A55` | Separador entre filas (decoración) | — |
| `--danger` | `#A3261A` | `#B3362A` | Botón «Borrar» (texto blanco) | 7,4 / 6,0 |
| `--error-text` | `#A3261A` | `#FF9A8F` | Mensajes de error de un campo | 7,1 / 8,7 |
| `--review` | `#8A3416` | `#F2A07B` | Etiqueta «Revisar» (texto y borde) | 7,9 / 8,5 |
| `--notice-bg` / `--notice-text` / `--notice-border` | `#FFF4D6` / `#1C2433` / `#8A6600` | `#3A2F10` / `#F5E6B8` / `#E0B23A` | Avisos (falta la voz, archivo no válido) | 14,2 / 10,6 (borde 4,8 / 6,7) |

**Botones** (Barlow 700, 44 px de alto como mínimo, radio 8 px):
- *Primario*: fondo `--plaque`, texto blanco. Una acción principal por vista («Añadir palabra», «Guardar», «Importar N nuevas»).
- *Secundario*: fondo `--surface`, borde de 2 px y texto `--plaque` (oscuro: `--nav-text`).
- *Peligro*: fondo `--danger`, texto blanco. Solo para confirmar un borrado o un reemplazo.

**Campos:** etiqueta visible encima (Barlow 500, 13,6 px), caja `--surface` con borde de 2 px `--field-border`, 44 px de alto. El error va debajo del campo en `--error-text`, enlazado con `aria-describedby`, y el campo lleva `aria-invalid="true"`. Al fallar el guardado, el foco va al primer campo con error.

**Selector de género:** tres opciones en una fila (Masculino · Femenino · Sin género), hechas con botones de opción reales (`radio`) dentro de un `fieldset`.

**Ventanas:** elemento `<dialog>` abierto como modal, fondo `--bg`, contorno de 2 px `--plaque`, radio 12 px, título en Barlow 700 color `--plaque` (oscuro: `--plaque-text` sobre `--bg`). Los botones van abajo a la derecha: primero «Cancelar» y después la acción. `Esc` y el gesto «atrás» cierran sin guardar.

**Fila de palabra:** botón **Oír** (44 × 44 px, icono de altavoz en SVG) a la izquierda; francés en Source Serif 600; traducción en cursiva `--text-muted`; categoría y etiqueta «Revisar» en Barlow 500 debajo; flecha `›` a la derecha. Toda la fila abre la ficha; el botón **Oír** solo habla. Separador `--divider`.

**Etiqueta «Revisar»:** Barlow 700, texto y borde de 1,5 px `--review`, radio 4 px. Marca las palabras de la lista inicial que hay que comprobar.

**Aviso:** caja `--notice-bg` con borde de 2 px `--notice-border` y texto `--notice-text`, título en Barlow 700. Explica qué pasa y qué hacer.

**Mazo A1 (Etapa 6):** botón *secundario* «Añadir 100 palabras A1» al final de la fila de acciones de Vocabulario (después de Exportar). Sin estilos nuevos: la fila ya pasa a la línea siguiente en el móvil. Abre la misma ventana de importar, con el título «Revisión de «100 palabras A1»», y el foco vuelve al botón al cerrarla. Si no se puede cargar el mazo, el aviso de siempre lo dice en una frase.

## Pantalla Estudiar (Etapa 3)

- **Resumen del día:** dos recuadros (`--surface`, borde 2 px `--divider`, radio 8 px) con el número en Barlow 700 de 30 px color `--plaque` (oscuro: `--plaque-text`) y la etiqueta en Barlow 500 `--text-muted`: «para repasar» y «nuevas». Debajo, dirección y algoritmo en `--text-muted`; **Empezar** (primario) y **Ajustes del estudio** (secundario).
- **Progreso:** «Tarjeta 3 de 22» en Barlow 500 `--text-muted`, y una barra de 6 px (fondo `--divider`, relleno `--line` de Estudiar). La barra es decoración: el texto da la información.
- **Tarjeta:** fondo `--surface`, borde 2 px `--plaque`, borde izquierdo de 8 px `--line`, radio 10 px, contenido centrado. Etiqueta del idioma arriba a la izquierda (Barlow 500, `--text-muted`). Palabra del anverso en Source Serif 600 de 1,95 rem; traducción en cursiva de 1,25 rem; separador `--divider`; ejemplo en 0,9 rem con la traducción en cursiva `--text-muted`. Botón de altavoz como en Vocabulario.
- **Respuestas (opción A):** cuatro botones secundarios iguales; **Bien** primario. Nombre en Barlow 700 y, debajo, cuándo vuelve («hoy», «1 día», «8 días») en Barlow 500 de 0,8 rem. Móvil: rejilla 2 × 2, 56 px de alto. Computador (≥ 900 px): una fila de 4. Sin colores con significado: la diferencia la da el texto.
- **Pistas de teclado:** `<kbd>` con borde 1 px `--field-border` (2 px abajo), radio 4 px, texto `--text-muted` sobre `--surface`. Solo con ratón: `@media (hover: hover) and (pointer: fine)`.
- **Fin de sesión:** título «Terminaste por hoy» en Barlow 700 de 1,3 rem y un párrafo con las respuestas de la sesión y cuántas tarjetas vencen mañana.

## Pantalla Quiz (Etapa 4)

**Color nuevo** (contraste comprobado; claro / oscuro):

| Token | Claro | Oscuro | Uso | Contraste |
|---|---|---|---|---|
| `--success-text` | `#1D6B3F` | `#7FD3A3` | Título «✓ Correcto» y marca de la opción correcta | 6,3–6,5 / 8,7–9,9 |

El fallo usa `--error-text` (7,1–7,4 / 7,6–8,7). El color nunca va solo: siempre acompaña a «✓» o «✗» y a un texto.

- **Inicio del quiz:** tres botones de modo a lo ancho (`--surface`, borde 2 px `--plaque`, radio 8 px, 64 px de alto como mínimo), con el nombre en Barlow 700 y debajo una línea en Source Serif `--text-muted` que dice qué harás. Desactivado: borde `--divider`, texto `--text-muted` y el motivo debajo del botón, enlazado con `aria-describedby`. Debajo, la casilla «Exigir acentos» (como «Pendiente de revisar») con una frase de ayuda.
- **Progreso y tarjeta:** iguales que en Estudiar («Pregunta 3 de 10», barra de 6 px, tarjeta con borde izquierdo de 8 px), con el color de línea del Quiz.
- **Opciones (modo a):** cuatro botones secundarios uno debajo de otro, a lo ancho, 56 px de alto, texto en Source Serif 400 alineado a la izquierda. Tras responder: la correcta con borde `--success-text` y «✓ Correcta»; la elegida mal con borde `--error-text` y «✗ Tu respuesta»; las cuatro quedan desactivadas.
- **Campo de respuesta (modos b y c):** como los campos de la Etapa 2, de 1,1 rem para que se lea al escribir. Botones **Comprobar** (primario) y **No lo sé** (secundario) en una fila; en el móvil, a lo ancho de la pantalla. **Oír** y **Oír lento** como en la ficha de Vocabulario.
- **Respuesta:** caja `--surface` con borde izquierdo de 4 px del color del resultado; título en Barlow 700 de 1,25 rem en `--success-text` o `--error-text` con «✓» o «✗»; «Respuesta correcta», «Escribiste» y el ejemplo en Source Serif, la traducción en cursiva `--text-muted`. **Siguiente** primario, a lo ancho en el móvil.
- **Resumen:** «Acertaste 7 de 10» en Barlow 700 de 1,3 rem; lista de falladas con separador `--divider`: la pregunta en Source Serif 600, la respuesta correcta debajo y, si la hay, «Escribiste: …» en `--text-muted`. **Otro quiz** primario.

## Pantalla Progreso (Etapa 5)

**Color nuevo** (contraste comprobado; claro / oscuro):

| Token | Claro | Oscuro | Uso | Contraste |
|---|---|---|---|---|
| `--chart-bar` | `#233A7A` | `#9DB0E3` | Barras del gráfico y muestra «en aprendizaje» | 10,4–10,7 / 7,2–8,3 |

La línea naranja de Progreso (`#E0663A`) se usa en el gráfico como elemento gráfico (no como texto): 3,3–3,4 en claro y 4,5–5,2 en oscuro, por encima del 3:1 exigido. Una prueba de `tests/styles.test.js` lo comprueba.

- **Racha y hoy:** los dos recuadros del resumen de Estudiar. A la izquierda, el número de días (o «Sin racha») y «días seguidos» (o «Estudia hoy para empezar una nueva.»). A la derecha, «✓ Hoy ya estudiaste» o «Hoy todavía no estudiaste» en Barlow 700 de 1,1 rem, en una fila.
- **Títulos de sección:** `h2` en Barlow 700 de 1,25 rem, con 32 px de aire encima: «Respuestas de los últimos 14 días», «Acierto en los últimos 30 días», «Tus palabras».
- **Gráfico (el elemento propio de esta pantalla):** las barras se apoyan en una **línea de metro** naranja de 4 unidades con una **estación por día**: llena (naranja con anillo del color de fondo, radio 7) si ese día estudiaste y hueca (fondo con borde naranja, radio 6) si no. Barras `--chart-bar` de 14 unidades de ancho, sin esquinas redondeadas, con el número encima (Barlow 700) y debajo la inicial del día (L M X J V S D) o «hoy» en negrita. SVG con `viewBox`, a lo ancho hasta 400 px. `role="img"` y un `aria-label` con el resumen; el detalle está en la tabla del desplegable.
- **Desplegables** («Ver los datos día por día», «Ver las N palabras dominadas»): `<details>` con el `summary` en Barlow 700 color `--secondary-text`, 44 px de alto y un triángulo ▸/▾ dibujado con CSS.
- **Acierto:** lista de definiciones; cada fila con el nombre en Barlow 500, el porcentaje en Barlow 700 de 1,6 rem color `--emphasis` y «de N respuestas» en `--text-muted`, con separador `--divider`. Sin datos: «—» y una frase que lo explica.
- **Tus palabras:** barra de proporción decorativa (`aria-hidden`) de 12 px con tres tramos: nuevas `--divider`, en aprendizaje `--chart-bar`, dominadas naranja. Debajo, los tres números con una muestra de 14 px del mismo color: la información está en el texto.
- **Lista de dominadas:** francés en Source Serif 600 (`lang="fr"`) y traducción en cursiva `--text-muted`, con separador `--divider`, en el orden de Vocabulario.

## Icono

Azulejo azul (`#233A7A`) con borde biselado `#3B5399` y una «ç» blanca (`#FAFBFC`) de Source Serif 4 600, convertida en trazos y centrada por su forma real (de la parte de arriba de la «c» a la punta de la cedilla). La versión *maskable* reduce el dibujo al 80 % central para que Android pueda recortarlo en círculo.

## Movimiento

Casi ninguno. El cambio de pantalla es inmediato. El aviso de versión nueva aparece sin animación. Si en el futuro se añade movimiento, debe responder a una acción del usuario y respetar `prefers-reduced-motion`.

## Escritura

- Español claro, frases cortas, en segunda persona («Aquí verás…»).
- Los botones dicen lo que hacen («Actualizar», no «Aceptar»).
- Los mensajes de error dicen qué pasó y cómo arreglarlo, sin pedir perdón.
