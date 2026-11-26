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
| Palabras | `--line-vocabulary` | `#2F7FD0` azul |
| Estudiar | `--line-study` | `#9B5BB5` violeta |
| Quiz | `--line-quiz` | `#2FA36B` verde |
| Progreso | `--line-progress` | `#E0663A` naranja |
| Conversar | `--line-chat` | `#D9478A` rosa |
| Leer | `--line-reader` | `#A0703C` marrón |

Los puntos de línea siempre llevan un anillo blanco y van sobre la barra azul: el amarillo sobre fondo claro solo tiene 1,6:1.

**Contraste comprobado** (WCAG AA exige 4,5:1 en texto y 3:1 en elementos gráficos):
texto/fondo claro 15,0 · texto/fondo oscuro 15,0 · blanco/placa 10,7 (oscuro 8,2) · inactivo/barra 7,2 (oscuro 9,1) · foco amarillo/barra 6,4 (oscuro 8,1) · foco amarillo/fondo oscuro 10,6 · foco azul/fondo claro 10,4 · aviso blanco/#1C2433 15,6 · «ç» del icono 10,4 · línea rosa/fondo 3,9 (oscuro 4,4) · línea rosa/tarjeta 4,0 (oscuro 3,9).
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

- **Móvil (< 900 px):** barra de navegación fija abajo, siete enlaces que se reparten el ancho, cada uno de 48 px de alto como mínimo. La pantalla de palabras se llama «Palabras» (antes «Vocabulario», que no cabía con siete botones). Medido a 360 px con cada enlace activo: el más estrecho mide 49,3 × 64 px, «Conversar» llega a 59,9 px y ningún nombre se corta.
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

**Mazo A1 (Etapa 6):** botón *secundario* «Añadir 100 palabras A1» al final de la fila de acciones de Palabras (después de Exportar). Sin estilos nuevos: la fila ya pasa a la línea siguiente en el móvil. Abre la misma ventana de importar, con el título «Revisión de «100 palabras A1»», y el foco vuelve al botón al cerrarla. Si no se puede cargar el mazo, el aviso de siempre lo dice en una frase.

## Pantalla Estudiar (Etapa 3)

- **Resumen del día:** dos recuadros (`--surface`, borde 2 px `--divider`, radio 8 px) con el número en Barlow 700 de 30 px color `--plaque` (oscuro: `--plaque-text`) y la etiqueta en Barlow 500 `--text-muted`: «para repasar» y «nuevas». Debajo, dirección y algoritmo en `--text-muted`; **Empezar** (primario) y **Ajustes del estudio** (secundario).
- **Progreso:** «Tarjeta 3 de 22» en Barlow 500 `--text-muted`, y una barra de 6 px (fondo `--divider`, relleno `--line` de Estudiar). La barra es decoración: el texto da la información.
- **Tarjeta:** fondo `--surface`, borde 2 px `--plaque`, borde izquierdo de 8 px `--line`, radio 10 px, contenido centrado. Etiqueta del idioma arriba a la izquierda (Barlow 500, `--text-muted`). Palabra del anverso en Source Serif 600 de 1,95 rem; traducción en cursiva de 1,25 rem; separador `--divider`; ejemplo en 0,9 rem con la traducción en cursiva `--text-muted`. Botón de altavoz como en Palabras.
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
- **Campo de respuesta (modos b y c):** como los campos de la Etapa 2, de 1,1 rem para que se lea al escribir. Botones **Comprobar** (primario) y **No lo sé** (secundario) en una fila; en el móvil, a lo ancho de la pantalla. **Oír** y **Oír lento** como en la ficha de Palabras.
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
- **Lista de dominadas:** francés en Source Serif 600 (`lang="fr"`) y traducción en cursiva `--text-muted`, con separador `--divider`, en el orden de Palabras.

## Inicio: copia de seguridad (Etapa 7)

- Debajo de la frase de Inicio, un recuadro `--surface` con borde de 2 px `--divider`, **franja izquierda de 8 px del amarillo de Inicio** (decoración: el amarillo nunca va como texto) y radio 8 px. Título `h2` «Copia de seguridad» como los de Progreso, un párrafo que explica qué guarda y para qué sirve, y dos botones: **Guardar copia** (primario) y **Restaurar copia** (secundario). Debajo, el resultado en Barlow 500 (`role="status"`); los errores van en el aviso de siempre (`role="alert"`) arriba del recuadro.
- **Ventana «¿Restaurar la copia del DD/MM/AAAA?»:** como las de la Etapa 2; dos líneas: qué tiene la copia y qué se reemplaza («no se puede deshacer»). Botones **Cancelar** (secundario) y **Restaurar** (peligro). El foco vuelve a **Restaurar copia** al cerrarla.
- Mismo verbo de principio a fin: «Guardar copia» → «Se guardó la copia…»; «Restaurar» → «Se restauró la copia…».

## Pantalla Conversar (Etapa 8)

**Color nuevo:** la línea rosa `#D9478A` (`.line-chat`). Además de los puntos y la franja del enlace activo, aquí dibuja la línea de las correcciones, así que se usa como elemento gráfico sobre el fondo y la tarjeta: 3,9–4,0 en claro y 3,9–4,4 en oscuro, por encima del 3:1 exigido. Una prueba de `tests/styles.test.js` lo comprueba. Nunca se usa como color de texto.

- **Arriba:** el selector **Nivel de francés** (A1.1 · A1.2) como el de género (botones de opción reales dentro de un `fieldset`) y, si hay mensajes, **Conversación nueva** (secundario). En el móvil el botón pasa a la línea siguiente.
- **Pantalla vacía:** «Aquí verás tu conversación con Claude en francés. Bajo cada mensaje tuyo aparecerán tus errores corregidos.»
- **Mensajes:** cada uno con quién habla encima («Tú» o «Claude», Barlow 500 `--text-muted`) y el texto en Source Serif (`lang="fr"`) dentro de un recuadro `--surface` con borde de 2 px `--divider`, radio 8 px y **franja izquierda de 8 px**: rosa en tus mensajes y `--plaque` en los de Claude. Todos alineados a la izquierda; la diferencia la da el nombre, no solo el color. Se respetan los saltos de línea y las palabras largas se parten.
- **Correcciones (el elemento propio de esta pantalla):** bajo tu mensaje baja una **línea rosa de 4 px** y cada corrección es una **estación** (círculo rosa de 14 px con anillo del color de fondo). En cada estación: lo que escribiste tachado (`<del>`, `--text-muted`), «→» y la forma correcta en Source Serif 600 (`<ins>`), los dos con `lang="fr"`; debajo, la explicación en español (`lang="es"`, 13,6 px, `--text-muted`). Para el lector de pantalla, la flecha se lee como «se corrige:».
- **Campo:** «Tu mensaje en francés», un `textarea` de 3 líneas como los campos de la Etapa 2, con mayúscula automática al empezar cada frase y sin corrector, y la ayuda «Hasta 500 caracteres.». **Enviar** (primario) a lo ancho en el móvil. Mientras se espera la respuesta dice «Enviando…» y está desactivado, igual que el nivel y **Conversación nueva**; el campo queda de solo lectura.
- **Mensajes restantes:** «Te quedan N mensajes hoy.» (con 1: «Te queda 1 mensaje hoy.») en Barlow 500 `--text-muted` bajo **Enviar**, oculto hasta la primera respuesta.
- **Errores:** el aviso de siempre arriba (`role="alert"`). Tu texto queda en el campo y la conversación no cambia.
- **Ventana «Código de acceso»:** como las de la Etapa 2; una frase que explica de dónde sale el código, el campo (tipo contraseña) y **Cancelar** · **Guardar y enviar**. Si el código no es correcto, la ventana vuelve a abrirse con el error bajo el campo.
- **Ventana «¿Empezar una conversación nueva?»:** «Se borrará esta conversación. No se puede deshacer.» y **Cancelar** · **Borrar conversación** (peligro).

## Conversar: escuchar (Etapa 9)

Sin colores nuevos: todo usa los tokens de arriba.

- **Interruptor «Escuchar primero»:** una casilla real (`checkbox`) como «Exigir acentos», en la fila de herramientas, después del nivel. Fila de 44 px de alto; toda la etiqueta se puede tocar. Empieza encendido y se guarda en el teléfono.
- **Botones de escucha:** bajo cada respuesta de Claude, en una fila que pasa a la línea siguiente si no cabe: **🔊 Escuchar** y **🐢 Más lento** (secundarios, 44 px de alto, Barlow 700). El emoji va con `aria-hidden="true"` y el nombre completo en `aria-label` («Escuchar la respuesta», «Escuchar más lento»), que contiene el texto visible. En cada corrección, un botón cuadrado de 44 × 44 px con 🔊 a la derecha de la forma correcta («Escuchar la forma correcta»); la estación de la línea rosa queda a la altura de la primera línea.
- **Texto tapado (el elemento propio):** con «Escuchar primero» encendido, la respuesta nueva no se ve: los botones ocupan el recuadro del mensaje, que conserva la franja `--plaque` de 8 px pero con el resto del borde **punteado** (2 px `--field-border`), como un cartel cubierto. Se añade **Mostrar texto** (secundario, `aria-expanded` y `aria-controls`); al tocarlo aparece el texto encima de los botones y dice **Ocultar texto**. Si la respuesta no se puede oír, el texto aparece solo y el aviso de siempre sale una vez. Las respuestas del historial nunca se tapan.
- **Avisos:** los de siempre (`noSpeech`, `noFrenchVoice`, `voiceFailed`) en el aviso de arriba de la pantalla.

## Conversar: micrófono (Etapa 9)

Sin colores nuevos: todo usa los tokens de arriba.

- **Botón «Hablar»:** secundario, a la izquierda de **Enviar** en la misma fila (Enviar ocupa el resto del ancho en el móvil). Lleva 🎤 con `aria-hidden="true"`. Un toque empieza a escuchar y otro lo detiene; `aria-pressed` y el texto cambian a **Detener**. Si el navegador no reconoce voz, el botón no aparece y **Enviar** queda a lo ancho como antes. Mientras dice «Enviando…», **Hablar** está desactivado (borde `--divider` y texto `--text-muted`, como los modos del Quiz).
- **Escuchando (el elemento propio):** mientras escucha, el 🎤 se cambia por el **punto rosa de la línea** (14 px), como la luz de una estación. El estado nunca va solo por el color: el texto dice «Detener».
- **Texto parcial:** una línea aparte bajo el campo que cuelga de la **línea rosa de 4 px**, como las correcciones: «Escuchando:» en Barlow 500 `--text-muted` y lo oído en Source Serif (`lang="fr"`). Solo el resultado final se agrega al campo, a continuación de lo que haya escrito.
- **Ventana «Tu voz sale del dispositivo»:** como las de la Etapa 2; una frase sobre adónde va el audio, y **Cancelar** · **Usar el micrófono** (primario). Sale solo la primera vez. El foco vuelve a **Hablar** al cerrarla.
- **Avisos:** los de siempre arriba (`micBlocked`, `micNoSpeech`, `micNoDevice`, `micNetwork`, `micLanguage`, `micFailed` y `chatOffline` si no hay conexión).

## Conversar: consultar palabras (Etapa 10)

Sin colores nuevos: todo usa los tokens de arriba y la línea rosa de Conversar.

- **Palabras tocables:** solo en las respuestas de Claude. Cada palabra es un botón real (`<button type="button" class="chat-word">`) que se ve como texto: misma letra, mismo color, sin borde ni relleno, para no mover las letras. El interlineado de los mensajes sube a **1,8**: cada palabra ocupa la altura entera de su línea (30,6 px) sin montarse en la de arriba ni en la de abajo. Al tocarla (o al pasar el ratón) se ve un fondo `--divider` con radio 4 px. Con el teclado, el anillo de foco de siempre. El nombre accesible es la palabra. Espacios y puntuación quedan como texto.
- **Palabra que ya está en tu vocabulario (el elemento propio):** va «sobre la línea»: una **raya rosa de 3 px** bajo la palabra, separada 0,25 em, como el trazo de una línea de metro. Es una forma, no solo un color, y el rosa sobre la tarjeta tiene 4,0 en claro y 3,9 en oscuro (elemento gráfico, ≥ 3:1). Para el lector de pantalla, el nombre suma «, en tu vocabulario».
- **Respuesta tapada** («Escuchar primero»): sus palabras están dentro del texto oculto, así que no se pueden tocar ni enfocar hasta tocar **Mostrar texto**.
- **Tarjeta** (`<dialog id="word-card">`, modal, con `aria-labelledby` en la palabra):
  - **Móvil (< 900 px):** una **hoja abajo**, a lo ancho, con radio de 12 px solo arriba y hasta el 85 % del alto. Arriba lleva una **franja rosa de 6 px**, como el enlace activo de la barra del móvil.
  - **Computador (≥ 900 px):** una ventana centrada como las demás (32 rem), con la misma franja rosa arriba.
  - **Contenido:** la palabra tocada como título (Source Serif 600 de 1,95 rem, `lang="fr"`); «En esta frase:» (Barlow 500 `--text-muted`) con la traducción en cursiva; un separador `--divider`; «Forma base:» con la forma base en Source Serif 600 (con artículo si es sustantivo), su traducción en cursiva `--text-muted` y debajo el tipo de palabra y el género («masculino» o «femenino»), como los datos de la ficha de Palabras; **🔊 Escuchar** (secundario) lee la forma base con artículo.
  - **Mientras espera:** «Buscando…» en Barlow 500 `--text-muted` (`role="status"`). Los errores van en el aviso de siempre dentro de la tarjeta (`role="alert"`); no se abren otras ventanas.
  - **Botones abajo a la derecha:** **Cerrar** (secundario) y **Guardar** (primario). Si la palabra ya está, el mismo botón dice «Ya está en tu vocabulario»; después de guardar, «Guardada». Los dos desactivados con `aria-disabled` (fondo `--surface`, borde `--divider`, texto `--text-muted`), para que el foco se quede en el botón y se oiga el cambio.
  - Se cierra con **Escape**, con **Cerrar** o tocando fuera; el foco vuelve a la palabra. Al abrirla, el foco va al título para que se lea la palabra.

## Pantalla Leer (Etapa 11)

**Color nuevo:** la línea marrón `#A0703C` (`.line-reader`), como el lomo de un libro y distinta de las otras seis. Además del punto y la franja del enlace activo, dibuja la línea del texto, el recuadro de la frase que suena y el subrayado de las palabras guardadas, así que es un elemento gráfico sobre el fondo y la tarjeta: 4,2–4,3 en claro y 3,6–4,1 en oscuro, por encima del 3:1 exigido. El ▶ blanco sobre la estación llena tiene 4,3. Una prueba de `tests/styles.test.js` lo comprueba. Nunca se usa como color de texto.

**Barra con 7 botones:** «Vocabulario» pasó a llamarse **«Palabras»** para que quepan los siete. Medido a 360 px con cada enlace activo: el más estrecho mide 49,3 px de ancho y ninguna etiqueta se corta.

- **Biblioteca (`#/leer`):** **Nueva historia** (primario) y debajo la lista, de la más nueva a la más vieja, con el borde superior `--plaque` y las filas como las de Palabras: el título en Source Serif 600 (`lang="fr"`) y debajo, en Barlow 500 `--text-muted`, el nivel, la etiqueta **REVISAR**, «Leída» y «Preguntas: X/4». Toda la fila es un enlace a `#/leer/<id>`, con `›` a la derecha. Vacía: «Aquí verás tus lecturas. Pide a Claude una historia a tu nivel.»
- **Ventana «Nueva historia»:** como las de la Etapa 2; **Nivel** (A1.1 · A1.2 · A2) y **Preguntas en:** (Español · Francés) con el selector de opciones de la Etapa 2, y **Tema (opcional)** (hasta 60 letras). **Cancelar** · **Escribir historia** (primario). Mientras Claude escribe, **Nueva historia** dice «Escribiendo…» desactivado con `aria-disabled` (como «Guardada» en la tarjeta), para que el foco se quede en el botón.
- **Cabecera del lector:** el título en Source Serif 600 de 26,6 px (`lang="fr"`), el nivel (y «Leída») en Barlow 500 `--text-muted`. Si está en REVISAR, un recuadro `--surface` con borde de 2 px `--review` y radio 8 px: la etiqueta **REVISAR**, «Esta historia aún no está revisada.» y **Aprobar** (primario) · **Descartar** (secundario). Debajo, la fuente y la licencia en texto pequeño `--text-muted`.
- **Voz:** **Escuchar** (primario; el mismo botón dice **Pausa** y **Seguir**) y **Más lento** / **Normal** (secundario). La fila se queda fija arriba mientras se baja por el texto (fondo `--bg` y una raya de 2 px `--divider` debajo).
- **Texto (el elemento propio):** el texto es una **línea de metro**. Cada frase empieza con su **estación**: un botón redondo de 44 × 44 px con borde de 2 px marrón y «▶» (`aria-label` «Leer desde esta frase»), y una **línea marrón de 4 px** une las estaciones de arriba abajo. Las palabras son botones como en Conversar (interlineado 1,8, subrayado marrón de 3 px si ya están en tu vocabulario). La puntuación va pegada a su palabra para que nunca quede sola al empezar una línea.
- **Frase que suena:** recuadro `--surface` con borde de 2 px marrón y radio 8 px, y la estación llena de marrón con el ▶ blanco; además `aria-current="true"`. Forma y color, nunca solo color. Se desplaza para quedar a la vista, con margen para la fila fija de arriba y la barra de abajo.
- **Abajo:** **Marcar como leída** (secundario; después dice «Leída» desactivado con `aria-disabled`) y, si está aprobada, **Borrar historia** (secundario). Borrar y Descartar abren «¿Borrar esta historia?» / «No se puede deshacer.» con **Cancelar** · **Borrar** (peligro).
- **Cuestionario:** separado por una raya de 2 px `--divider`; **¿Lo entendiste? Responder 4 preguntas** (secundario, a lo ancho en el móvil, 56 px de alto). La pregunta va en una tarjeta como la de Estudiar (`--surface`, borde 2 px `--plaque`, franja izquierda de 8 px marrón): «1/4» (y **REVISAR** si la historia no está revisada) en Barlow 500 `--text-muted`, la pregunta en Source Serif 600 de 1,1 rem como leyenda de un `fieldset`, y las opciones como **botones de opción reales** dentro de filas de 56 px con borde de 2 px. **Comprobar** (primario); tras responder, la correcta con borde `--success-text` y la elegida mal con borde `--error-text`, y la respuesta como en el Quiz (borde izquierdo de 4 px, título «Correcto.» o «No es correcta. La respuesta es: …» en Barlow 700), la explicación en español y «En el texto: «…»». La frase de la respuesta se resalta en el texto con un **recuadro punteado** de aviso (`--notice-bg`, borde 2 px discontinuo `--notice-border`). **Siguiente** aparece solo después de **Comprobar**. Al final, «Resultado: X de 4» en Barlow 700 de 1,3 rem y **Volver a intentar**.
- **Foco:** al abrir una historia va al título; al empezar o pasar de pregunta, a la pregunta; al comprobar, al resultado de la respuesta; al terminar, a «Resultado». Al volver a la biblioteca, a la placa. Al cerrar una ventana vuelve al botón que la abrió.
- **Tarjeta de palabras:** la misma de Conversar (conserva su franja rosa).

## Leer: traducción por frase (Etapa 15)

- **Barra de traducción** entre la fila de la voz y el texto: la casilla **«Mostrar traducción siempre»** (como «Escuchar primero», fila de 44 px, se recuerda en el navegador). Si la traducción de una historia ya aprobada está sin revisar, debajo va el recuadro de REVISAR de la cabecera con «La traducción aún no está revisada.», **Aprobar traducción** (primario) y **Descartar traducción** (secundario). Una historia vieja sin traducción muestra en su lugar **Generar traducción** (secundario; mientras espera dice «Traduciendo…» desactivado con `aria-disabled`), o, si no se puede partir en frases válidas, «Esta historia no se puede traducir frase por frase.» en texto pequeño `--text-muted`.
- **Fila de la frase:** pasa a ser un `<div>`: la estación ▶ a la izquierda y, a la derecha, el francés, el botón **Ver traducción** / **Ocultar traducción** y la traducción. El botón es de texto (Barlow 600 de 13,6 px, `--secondary-text`, subrayado de 2 px; 44 px de alto para el dedo) con `aria-expanded` y `aria-controls`; va aparte de las palabras para no tocar una por error. Con la casilla activada los botones por frase se ocultan.
- **Traducción:** Source Serif en **cursiva** `--text-muted` (7,4:1 en claro y 9,7:1 en oscuro, medido), con `lang="es"` y sin botones de palabra. Queda dentro de la fila, así que el recuadro de la frase que suena y el de la evidencia la abarcan.
- **Cuestionario:** al empezar se ocultan todas las traducciones y se desactivan la casilla y los botones por frase (texto `--text-muted`); al terminar, repetir o salir vuelven según el ajuste.

## Construir frases (Etapa 12)

**Color nuevo:** la línea turquesa `#178A8A` (`.line-build`), distinta de las otras siete (está entre el azul de Palabras y el verde del Quiz, pero más oscura y apagada que los dos). Además del punto y la franja del enlace activo, dibuja la **vía de «Tu frase»**, el borde de arriba de los bloques y la franja izquierda de la tarjeta de práctica, así que es un elemento gráfico sobre el fondo y la tarjeta: 4,0–4,2 en claro y 3,7–4,3 en oscuro, por encima del 3:1 exigido. Una prueba de `tests/styles.test.js` lo comprueba. Nunca se usa como color de texto ni como fondo de texto (el blanco sobre turquesa solo tiene 4,2).

**Barra:** el enlace **«Construir frases»** solo aparece en la barra de la izquierda (≥ 900 px). En el móvil se oculta con `display: none` (`.nav-desktop-only`) y la barra sigue con siete botones: medido a 360 px, el más estrecho mide 49,7 × 64 px, «Conversar» 58,2 px y ningún nombre se corta.

- **Lista (`#/construir`):** desde la Etapa 14 es la ruta de lecciones; ver «Índice de lecciones (Etapa 14)».
- **Lección:** «Lección N», el título (Source Serif 600 de 26,6 px, enfocable) y el nivel y las áreas como en Leer. Las secciones son `h3` en Barlow 700 de 1,25 rem con 32 px de aire encima: «La idea», «El bloque», «Cómo pensarlo», «Ejemplos», «Trampa común», «Practicar» y «Fuentes».
  - **REVISAR:** la etiqueta de Leer seguida de su nota en texto pequeño `--text-muted`, justo debajo del elemento.
  - **El bloque:** cada grupo en un recuadro `--surface` con borde de 2 px `--divider` y **4 px turquesa arriba**; su nombre en Barlow 500 `--text-muted` y las piezas en francés (Source Serif 600) como **azulejos**: borde de 1 px `--field-border` y **sin esquinas redondas**, para que no parezcan botones (no se tocan).
  - **Cómo pensarlo, Ejemplos y Trampa común:** filas con separador `--divider`. Cómo pensarlo: el español en `--text-muted`, el francés en Source Serif 600 y la nota en texto pequeño. Ejemplos: el francés en Source Serif 600, la traducción en cursiva `--text-muted` y **Escuchar** (secundario) a la derecha, enlazado al ejemplo con `aria-describedby`. Trampa común: como las correcciones de Conversar, lo incorrecto tachado (`<del>`), «→» (para el lector de pantalla, «se corrige:») y lo correcto en Source Serif 600 (`<ins>`); debajo, la explicación.
  - **Fuentes:** lista con viñetas en texto pequeño; el título es un enlace (solo si la dirección empieza por `http`).
- **Práctica:** **Practicar** (primario). La tarjeta es la del cuestionario de Leer (`--surface`, borde 2 px `--plaque`, radio 10 px) con la **franja izquierda de 8 px turquesa**. Arriba «Ejercicio X/Y» (y **REVISAR** con su nota si el ejercicio la tiene) y el enunciado en Source Serif 600 de 1,1 rem, que recibe el foco.
- **Fichas (`order`):** botones de 44 px de alto como mínimo, con 8 px de separación, fondo `--surface`, borde de 2 px `--secondary-text`, radio 8 px y la palabra en Source Serif 600 de 1,1 rem (`lang="fr"`). Dos zonas con su nombre en Barlow 500 `--text-muted`: **«Tu frase»** y **«Fichas»**.
  - **La vía (el elemento propio de esta pantalla):** «Tu frase» se arma **sobre una línea turquesa de 4 px**, como los vagones sobre la vía; las fichas colocadas tienen el borde de abajo de 4 px, como si se apoyaran en ella. La zona guarda su alto (60 px) aunque esté vacía, para que se vea dónde van las fichas.
  - Tocar una ficha la pasa al final de «Tu frase»; tocar una de «Tu frase» la devuelve. El foco se queda en la ficha que quedó en el mismo lugar (o en **Comprobar** si ya no quedan). Cada cambio se anuncia en una región `aria-live`: «Agregaste: café. Tu frase: Je n'aime pas le café» o «Quitaste: café». **Borrar todo** (secundario) debajo. Tras **Comprobar**, las fichas que sobraron se ven apagadas (`--text-muted`, borde `--divider`).
- **Campo (`gap` y `fix`):** arriba la frase en Source Serif 600 (`lang="fr"`); en `gap`, el hueco es «…» sobre una raya de 2 px `--field-border`. El campo «Tu respuesta» es como el del Quiz (1,1 rem, `lang="fr"`, sin autocorrección, autocompletado ni mayúscula automática); en `fix` empieza con la frase con error, para corregirla ahí mismo.
- **Fila de acentos:** `à â ç é è ê ë î ï ô ù û œ`, botones de 44 × 44 px con 4 px de separación, fondo `--surface`, borde de 2 px `--field-border`, radio 8 px y la letra en Source Serif de 1,1 rem. Cada uno se llama «Insertar è». La letra se escribe donde está el cursor (o sobre lo seleccionado) y el foco vuelve al campo con el cursor después de la letra. En el móvil quedan en dos filas de seis y una de una.
- **Resultado:** la respuesta del Quiz (borde izquierdo de 4 px del color del resultado): «Correcto.» o «No es correcta.» en Barlow 700, la explicación, «La respuesta es: …» con **Escuchar** al lado y, solo si fallaste, «Tu respuesta:» con la **diferencia por palabras**.
  - **Diferencia por palabras:** cada palabra que cambia, falta o sobra va en `<mark>` con **negrita**, fondo `--notice-bg`, texto `--notice-text` y una raya de 2 px `--notice-border` debajo (forma y peso, nunca solo color); lo que sobra además va tachado y lo que falta se ve como «…». El lector de pantalla oye «(cambia)», «(falta)» o «(sobra)».
- **Aviso de repaso:** «Este ejercicio irá a tu repaso.» en el aviso de siempre (`--notice-bg`, borde 2 px `--notice-border`), en una zona `role="status"` bajo el resultado.
- **Fin:** «Terminaste la práctica de esta lección.» en Barlow 700 de 1,1 rem (recibe el foco) y **Practicar** otra vez.
- **Foco:** al abrir una lección, en el título; al empezar o pasar de ejercicio, en el enunciado; al comprobar, en el resultado; al terminar, en «Terminaste…». Lo que recibe el foco se desplaza para que la barra de abajo no lo tape.
- **Errores:** el aviso de siempre arriba (`role="alert"`): sin espacio o sin permiso para guardar (la práctica sigue sin guardar), sin voz francesa, y si el índice de lecciones no se pudo leer.
- **Frase libre (Tarea 11):** una tarjeta igual a la de práctica (franja turquesa de 8 px), debajo de «Terminaste la práctica…» o, si la lección ya está terminada, al abrirla. Arriba «Situación X/Y» (y **REVISAR** con su nota si la situación la tiene); la situación en Source Serif 600 de 1,1 rem, que recibe el foco al pasar a la siguiente. El campo «Tu frase en francés» es un `<textarea>` de 3 filas y 1,1 rem, `lang="fr"`, sin autocorrección ni mayúscula automática, de 300 letras como máximo; los saltos de línea se juntan en espacios antes de enviar. Debajo, en texto pequeño `--text-muted` y enlazado al campo con `aria-describedby`: «Si tu frase no coincide con un modelo, se envía a Claude (Anthropic) para corregirla.».
  - **Revisando:** **Comprobar** pasa a «Revisando…» con `aria-disabled="true"` (el foco se queda en el botón) y la zona `role="status"` dice lo mismo. El campo queda de solo lectura mientras espera.
  - **Resultado:** el recuadro del Quiz, con el foco en su título: «Correcta.» (verde), «Corregida: …» (rojo, con la frase en francés) o, sin conexión, «Necesitas conexión para que Claude revise tu frase.» con la **franja azul `--plaque` y el título `--text`**, porque no es ni acierto ni error. Los errores son **estaciones sobre la vía turquesa** (raya izquierda de 4 px `--line`): lo que escribiste tachado → lo correcto (como Trampa común) y debajo, en texto pequeño, el tipo en Barlow 700 (Gramática, Sintaxis u Ortografía) y la explicación en `--text-muted`. La **Sugerencia** va en un recuadro aparte con **borde discontinuo** de 2 px `--field-border` (es un consejo, no un error), con su título en Barlow 700. Al final, «Respuestas modelo» en una lista en francés. Todo se pinta con `textContent`: un `<script>` de Claude se ve como texto.
  - Si hubo errores, «Agregamos esta frase a tu repaso.» en el aviso de repaso (`role="status"`). Los errores de envío (sin código de acceso, límite del día, servidor) van en un aviso `role="alert"` dentro de la tarjeta, junto al botón, y **Comprobar** sigue activo para reintentar. Con un resultado final, Comprobar se oculta y aparece **Siguiente** si quedan situaciones.
- **Repaso (`#/construir/repaso`):** la misma tarjeta de práctica, que se muda a la vista del repaso, con «Repaso: X/Y». Las frases propias muestran **REVISAR** con «La corrección es de Claude.», «Corrige tu frase» y, debajo de los botones, **Quitar del repaso** (secundario, a todo el ancho en el móvil), que abre la ventana de confirmar de siempre: «¿Quitar esta frase de tu repaso?» / «No se puede deshacer.», **Cancelar** · **Quitar** (rojo). Cancelar devuelve el foco al botón; Quitar pasa a la tarjeta siguiente. Vacío o terminado: «No tienes nada que repasar hoy…» o «Terminaste el repaso.», con el estilo de «Terminaste la práctica…» y el foco.
- **«Repasar (N)» en la ruta:** botón secundario junto a **Continuar** (Etapa 14; antes era primario). Con N = 0 lleva `aria-disabled="true"`, se ve apagado (fondo `--surface`, texto `--text-muted`, borde `--divider`, como «Escribiendo…» en Leer) y no hace nada.
- **Tarjeta de Inicio:** como la de la copia de seguridad (fondo `--surface`, borde 2 px `--divider`, radio 8 px), pero con la **franja izquierda turquesa** y, delante del título «Construir frases», el **punto turquesa de la línea**: es una «correspondencia» del metro hacia la línea de Construir, que en el móvil no está en la barra. Va sobre la copia de seguridad. «Próxima lección: …» en Source Serif 600 (o «Terminaste todas las lecciones», y entonces sin **Seguir lección**), «Repaso: N pendientes hoy» (1 pendiente en singular) y los botones **Seguir lección** (primario) y **Repasar (N)** (secundario, apagado con `aria-disabled` si N = 0). Medido a 360 px: los dos botones caben en una fila.

## Índice de lecciones (Etapa 14)

**Cómo se llega a la ruta en el móvil** (arreglo del 25/11/2026: la barra del móvil no tiene Construir): la tarjeta «Construir frases» de Inicio lleva, bajo sus botones, el enlace de texto **«Ver todas las lecciones»**, y cada lección empieza con **«‹ Todas las lecciones»**. Los dos son `.text-link`: texto `--text` en Barlow 600, subrayado de 2 px (no solo color) y 44 px de alto para el dedo; la «‹» va con `aria-hidden`.

La lista de `#/construir` pasa a ser una **ruta**: una línea de metro vertical en turquesa (`--line-build`, `#178A8A`) con una estación por lección, como el texto de Leer. Es el elemento propio de la pantalla; lo demás se queda tranquilo.

```
[Continuar: Lección 7 · Los adjetivos] [Repasar (N)]
A1
 ✓━  Lección 6 · Preguntas simples
 ┃   Completada · 9 de 9 a la primera · 24/11/2026
 ◉━  Lección 7 · Los adjetivos     (recuadro turquesa: aria-current="step")
 ┃   En curso: 4 de 10
 ○━  Lección 9 · Querer, poder y deber
 ┆   Sin empezar
 ⁘   Lección 10 · Posesivos y demostrativos   (atenuada)
     Próximamente
A2 …
```

- **Arriba:** **Continuar: Lección N · Título** (primario) y **Repasar (N)** (secundario, apagado con `aria-disabled` si N = 0), en una fila que se parte en dos en el móvil (medido a 360 px: Continuar 279 × 44 px, Repasar 116 × 44 px). Sin pendientes, Continuar se oculta y aparece «Completaste todas las lecciones disponibles» en Barlow 700 de 1,1 rem.
- **Tramos:** un `<h2>` («A1», «A2») en Barlow 700 de 1,25 rem, con 32 px de aire encima, y un `<ol>` por tramo con `aria-labelledby` hacia su título. Un tramo sin lecciones no se muestra.
- **La vía:** cada fila dibuja dos tramos de 4 px (el que llega a su estación y el que sale), así la línea no pasa más allá de la primera ni de la última estación del tramo. El tramo de las planificadas es **discontinuo** (`dashed`), desde la salida de la última lección disponible.
- **Fila:** columna de 44 px para la estación y el texto al lado, 12 px de relleno, al menos 56 px de alto. «Lección N · » en Barlow 500 `--text-muted`, el título en Source Serif 600 de 1,1 rem, y debajo el estado en Barlow 500 pequeño `--text-muted`. Los textos de estado son los de la Etapa 14 («Sin empezar», «En curso: X de Y», «Completada · F de T a la primera · DD/MM/AAAA», «Completada · DD/MM/AAAA», «Próximamente», «No se pudo cargar»): **el estado va siempre en texto** y la estación solo lo acompaña.
- **REVISAR:** si la lección tiene algún elemento con `review: true`, la fila suma una línea más bajo el estado: «Tiene partes **REVISAR**», en Barlow 500 pequeño `--text-muted` con la etiqueta de siempre (`.tag-review`, texto y no solo color). Las áreas (Gramática, Sintaxis, Ortografía) solo se ven dentro de la lección.
- **Estación** (`aria-hidden="true"`, 24 px, borde de 3 px turquesa, sobre la vía): completada, llena de turquesa con «✓» blanco (4,2:1, elemento gráfico); en curso, con un punto turquesa de 10 px; sin empezar, vacía (fondo `--bg`); planificada, con el borde **punteado** (`dotted`); no se pudo cargar, borde discontinuo `--text-muted`.
- **Lecciones disponibles:** toda la fila es un enlace a `#/construir/<id>`, con el foco de siempre (anillo de 3 px `--focus`) y radio 8 px. La siguiente pendiente lleva `aria-current="step"` y se ve como la frase que suena en Leer: recuadro `--surface` con borde de 2 px turquesa (forma y color, nunca solo color).
- **Lecciones planificadas:** la fila es un `<p>`, no un enlace ni un botón, y **sin** `aria-disabled` (no es un control). Texto atenuado con el token nuevo `--text-planned` y el título en Source Serif 400: se sigue leyendo. Una lección disponible que no se pudo cargar tampoco es enlace.
- **Color nuevo `--text-planned`:** `#5F6880` en claro y `#8F9BB8` en oscuro (los mismos tonos que `--field-border`). Contraste: 5,4 sobre `--bg` y 5,6 sobre `--surface` en claro; 6,4 sobre `--bg` y 5,6 sobre `--surface` en oscuro, por encima del 4,5:1. Más tenue que `--text-muted` (7,4–7,7 en claro y 8,5–9,7 en oscuro). Una prueba de `tests/styles.test.js` lo comprueba, y otra que el tramo planificado sea discontinuo. El modelo de cada fila (número, estado, `href` solo en las que se abren, `current` solo en la siguiente, REVISAR) sale de funciones puras de `js/lib/lesson-route.js` (`routeRows`, `openableLesson`, `continueLabel`) con sus pruebas. La línea turquesa sigue en 4,0–4,3 sobre el fondo (≥ 3:1).
- **Lector de pantalla:** cada enlace se lee «Lección 8 · Aller, faire y el futuro próximo Sin empezar, enlace» (con «Tiene partes REVISAR» al final si la lección lo lleva), y las planificadas como texto dentro de su elemento de lista, nunca como enlace.

## Icono

Azulejo azul (`#233A7A`) con borde biselado `#3B5399` y una «ç» blanca (`#FAFBFC`) de Source Serif 4 600, convertida en trazos y centrada por su forma real (de la parte de arriba de la «c» a la punta de la cedilla). La versión *maskable* reduce el dibujo al 80 % central para que Android pueda recortarlo en círculo.

## Movimiento

Casi ninguno. El cambio de pantalla es inmediato. El aviso de versión nueva aparece sin animación. Si en el futuro se añade movimiento, debe responder a una acción del usuario y respetar `prefers-reduced-motion`.

## Escritura

- Español claro, frases cortas, en segunda persona («Aquí verás…»).
- Los botones dicen lo que hacen («Actualizar», no «Aceptar»).
- Los mensajes de error dicen qué pasó y cómo arreglarlo, sin pedir perdón.
