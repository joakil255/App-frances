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

## Icono

Azulejo azul (`#233A7A`) con borde biselado `#3B5399` y una «ç» blanca (`#FAFBFC`) de Source Serif 4 600, convertida en trazos y centrada por su forma real (de la parte de arriba de la «c» a la punta de la cedilla). La versión *maskable* reduce el dibujo al 80 % central para que Android pueda recortarlo en círculo.

## Movimiento

Casi ninguno. El cambio de pantalla es inmediato. El aviso de versión nueva aparece sin animación. Si en el futuro se añade movimiento, debe responder a una acción del usuario y respetar `prefers-reduced-motion`.

## Escritura

- Español claro, frases cortas, en segunda persona («Aquí verás…»).
- Los botones dicen lo que hacen («Actualizar», no «Aceptar»).
- Los mensajes de error dicen qué pasó y cómo arreglarlo, sin pedir perdón.
