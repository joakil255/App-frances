# App-frances

Aplicación hecha con IA para aprender francés y programar un poco.

Es una app web instalable (PWA) para estudiar vocabulario francés de nivel A1. Funciona en Chrome de Android y en el computador, también sin conexión. Tiene cinco pantallas (Inicio, Vocabulario, Estudiar, Quiz y Progreso). Por ahora funcionan **Vocabulario** (tu lista de palabras con búsqueda, pronunciación e importar/exportar) y **Estudiar** (tarjetas con repetición espaciada). Quiz y Progreso llegarán en las próximas etapas.

- **App publicada:** https://joakil255.github.io/App-frances/
- **Guía visual:** [`DESIGN.md`](DESIGN.md)

## Requisitos

- **Node.js 20.19+, 22.13+ o 24+** (sirve para las pruebas y el linter; son las versiones que admite ESLint). Compruébalo con `node --version`.
- **Python 3** (sirve para el servidor local). Compruébalo con `python3 --version`.

## Primera vez

```bash
npm install
```

Instala ESLint, que solo se usa mientras programas. La app no tiene dependencias.

## Ejecutar la app

```bash
npm start
```

Abre `http://localhost:8000` en el navegador. Para detener el servidor, pulsa `Ctrl + C`.

- **No abras `index.html` con doble clic** (`file://`). El service worker solo funciona si la página se sirve desde un servidor.
- Si sale el error `Address already in use`, el puerto 8000 está ocupado. Usa otro: `python3 -m http.server 8001 --bind 127.0.0.1` y abre `http://localhost:8001`.
- El servidor solo es accesible desde este computador (`--bind 127.0.0.1`), para no compartir la carpeta del proyecto con otros equipos de la red wifi.

## Probar

```bash
npm test       # pruebas automáticas (node --test)
npm run lint   # revisa el código con ESLint
```

Las dos deben terminar sin errores antes de cada commit.

## Construir

No hay paso de construcción: los archivos del repositorio *son* la app. GitHub Pages los publica tal cual (el archivo `.nojekyll` le pide que no los transforme).

## Cómo funciona sin conexión

El archivo [`sw.js`](sw.js) es el *service worker*: un programa que el navegador instala junto a la app y que se queda entre la app y la red.

**Estrategia: copia completa con número de versión.**

1. **Al instalarse** descarga *todos* los archivos de la lista `PRECACHE_URLS` y los guarda en una caché llamada `app-frances-<versión>` (por ejemplo `app-frances-v1`). Si falta un solo archivo, la instalación falla entera y la versión anterior sigue funcionando.
2. **Al pedir un archivo** lo entrega desde esa caché, así que la app abre al instante, con o sin internet. Abrir o recargar la app siempre devuelve la página guardada. Lo que no esté guardado se pide a la red.
3. **Cuando hay una versión nueva**, el navegador la descarga en segundo plano y la deja *esperando*. La app muestra «Hay una versión nueva de la app.» con el botón **Actualizar**. Nada cambia hasta que lo pulsas: entonces la versión nueva se activa, borra la caché vieja y la página se recarga una vez.

### Publicar una versión nueva (paso obligatorio)

Cada vez que cambies **cualquier** archivo de la app:

1. Abre `sw.js` y sube `CACHE_VERSION` (`'v1'` → `'v2'` → `'v3'`…).
2. Si creaste un archivo nuevo, añádelo a `PRECACHE_URLS`. `npm test` falla si se te olvida.
3. `npm test`, commit y push.

Si no subes `CACHE_VERSION`, los teléfonos que ya tienen la app **no se enteran del cambio**. Las pruebas no pueden detectar este olvido.

## Vocabulario

La primera vez que abres la app se cargan **60 palabras A1** (saludos, familia, casa, comida, tiempo y verbos). Desde ese momento son tuyas: puedes editarlas o borrarlas. Las que llevan la etiqueta **Revisar** tienen una traducción que puede cambiar según el país; compruébalas y quita la marca al editarlas.

- **Buscar:** en francés o en español, sin importar mayúsculas ni acentos («etre» encuentra *être*).
- **Oír:** el botón del altavoz usa la voz francesa del teléfono. En la ficha de cada palabra está también **Oír lento**. Si no hay voz francesa, la app explica cómo instalarla.
- **Si no suena:** en Ajustes de Android busca «Salida de texto a voz», elige el motor «Servicios de voz de Google», instala la voz Francés (Francia) y comprueba que «Escuchar un ejemplo» suena. Después **fuerza la detención de Chrome** (Ajustes → Aplicaciones → Chrome → Forzar detención): Chrome sigue usando el motor anterior hasta que se reinicia.
- **Reglas al guardar:** francés y español son obligatorios; el ejemplo es opcional, pero si escribes una frase hace falta su traducción; si eliges género, el francés lleva artículo y debe coincidir (*la* = femenino, *le* = masculino).

### Tus datos y la copia de seguridad

Las palabras se guardan **solo en este navegador** (`localStorage`). Si borras los datos del navegador o desinstalas la app, se pierden. **Exporta de vez en cuando** (botón *Exportar*) y guarda el archivo: es tu copia de seguridad.

### Formatos para importar y exportar

- **JSON**: copia exacta para esta app (`"format": "app-frances-vocabulario"`).
- **CSV**: para hojas de cálculo. Columnas: `frances, espanol, ejemplo_frances, ejemplo_espanol, categoria, genero, revisar`. Solo `frances` y `espanol` son obligatorias; el orden da igual y se aceptan acentos y mayúsculas en los nombres. `genero`: `m`, `f`, `masculino`, `femenino` o vacío. `revisar`: `sí`/`no` o vacío.
- El CSV exportado usa comas y UTF-8. Se aceptan también archivos con `;` (Excel en español).
- Una celda que empieza por `=`, `+`, `-` o `@` se exporta con `'` delante para que la hoja de cálculo no la ejecute como fórmula; al importar se quita.
- **Importar nunca cambia nada sin preguntar:** primero muestra un resumen (nuevas, ya existentes y filas con errores con su motivo). Las que ya existen solo se sobrescriben si eliges *Reemplazar duplicadas…* y lo confirmas.

### Abrir el CSV en Excel en español

Si al hacer doble clic todo aparece en una sola columna: en Excel ve a **Datos → Desde texto/CSV**, elige el archivo, pon **Origen del archivo: 65001 (UTF-8)** y **Delimitador: Coma**, y pulsa **Cargar**. Para volver a importarlo, guárdalo como **CSV UTF-8 (delimitado por comas)**. LibreOffice y Google Sheets lo abren directamente.

## Estudiar

Cada día la app te prepara una **cola**: primero las tarjetas que ya estudiaste y **te toca repasar**, después **palabras nuevas** hasta tu límite diario y, al final, las que fallaste hoy. Cada palabra tiene dos tarjetas: una de francés a español (reconocer) y otra de español a francés (producir); estudias la dirección que elijas en los ajustes.

1. **Empezar** muestra la primera tarjeta. Intenta recordar la respuesta.
2. **Mostrar respuesta** enseña el francés (con altavoz), el español y el ejemplo.
3. Responde con sinceridad según lo que recordaste. Debajo de cada botón ves cuándo volverá la tarjeta:
   - **Otra vez**: no la recordabas. Vuelve **hoy**, en esta misma sesión, al final: después de las palabras nuevas.
   - **Difícil**: la recordaste con esfuerzo. Vuelve pronto.
   - **Bien**: la recordaste. Vuelve más adelante.
   - **Fácil**: la sabías al instante. Vuelve mucho más adelante.
4. Al terminar ves «Terminaste por hoy», tus respuestas y cuántas tarjetas vencen mañana.

**Qué es «hoy».** El día cambia a **medianoche según la hora de tu teléfono**. Si estudias pasada la medianoche, la app ya cuenta el día nuevo (vuelven a entrar palabras nuevas).

**Los dos algoritmos** (elige uno en *Ajustes del estudio*):

- **SM-2 simplificado**: cada tarjeta tiene una «facilidad». Si respondes Bien o Fácil, el tiempo hasta el próximo repaso se multiplica (1 día, 3 días, 8 días…); Difícil lo alarga poco y baja la facilidad; Otra vez la reinicia. Si repasas con retraso y aún la recuerdas, se premia la mitad de los días de retraso. Nunca pasa de 365 días.
- **Leitner**: cinco cajas. Bien sube la tarjeta una caja, Fácil dos, Difícil la deja donde está y Otra vez la devuelve a la caja 1. Cada caja vuelve en 1, 2, 4, 8 o 16 días.

Cada respuesta se guarda con **los dos** algoritmos a la vez: cambiar de uno a otro no borra tu progreso, solo cambia qué calendario se usa (las fechas pueden moverse de golpe; es lo esperado).

**Ajustes del estudio:** dirección (francés → español o español → francés), algoritmo y **palabras nuevas por día** (un número entero de 0 a 100; con 0 solo repasas).

**Atajos de teclado** (en el computador, durante una sesión): `Espacio` o `Intro` muestran la respuesta, `1` `2` `3` `4` responden Otra vez, Difícil, Bien y Fácil, y `O` lee el francés en voz alta (solo cuando el francés está a la vista). Con ratón, los botones muestran su tecla.

**Tus datos.** El progreso se guarda en este navegador, aparte de las palabras (clave `app-frances-study`), junto con un historial de cada respuesta que usará la pantalla Progreso. **La exportación de Vocabulario no incluye el progreso del estudio.**

## Iconos

Están en `icons/`. Los dibujos fuente son `icon.svg` (también es el icono de la pestaña) e `icon-maskable.svg` (versión que Android puede recortar en círculo). La «ç» ya está convertida en trazos, así que no depende de ninguna fuente. Si cambias un SVG, regenera los PNG con:

```bash
rsvg-convert -w 192 -h 192 icons/icon.svg -o icons/icon-192.png
rsvg-convert -w 512 -h 512 icons/icon.svg -o icons/icon-512.png
rsvg-convert -w 512 -h 512 icons/icon-maskable.svg -o icons/icon-maskable-512.png
```

## Comprobación manual paso a paso

Estas comprobaciones no se pueden automatizar. Hazlas al cerrar cada etapa que toque la interfaz.

### 1. Navegación a 360 px y a 1280 px (computador)

1. `npm start` y abre `http://localhost:8000`.
2. Abre el modo responsive: `Ctrl + Shift + M` en Firefox, o `F12` y luego `Ctrl + Shift + M` en Chrome.
3. Pon el ancho en **360** px. Debes ver la barra azul **abajo** con cinco enlaces. Pulsa cada uno: cambia la placa del título, el enlace activo se pone en blanco y negrita con una franja de color arriba, y la página **no se recarga**.
4. Pon el ancho en **1280** px. La barra pasa a la **izquierda** con «Français» arriba. Repite el paso 3; la franja ahora está a la izquierda.
5. Prueba el botón «atrás» del navegador: vuelve a la pantalla anterior.

### 2. Teclado

1. Recarga la página y pulsa `Tab`: aparece «Saltar al contenido». Pulsa `Intro`.
2. Sigue con `Tab` por los enlaces: cada uno muestra un recuadro amarillo. Pulsa `Intro` en uno: cambia la pantalla y el foco pasa a su título.

### 3. Tema oscuro

Cambia el sistema (o el navegador) a tema oscuro. La app pasa a fondo azul noche sin juntas de azulejo y todo el texto se sigue leyendo bien.

### 4. Instalar en Android

1. En el teléfono, abre **Chrome** y entra en https://joakil255.github.io/App-frances/
2. Espera unos segundos con la página abierta (Chrome guarda la app en segundo plano).
3. Abre el menú **⋮** y toca **Instalar app** (o **Agregar a la pantalla principal** → **Instalar**).
4. Confirma. Aparece el icono azul con la «ç» en la pantalla de inicio.
5. Ábrela desde ese icono: se abre a pantalla completa, sin la barra de direcciones de Chrome.

### 5. Sin conexión

1. Con la app instalada y abierta al menos una vez, **cierra la app** del todo (desde la vista de apps recientes).
2. Activa el **modo avión**.
3. Abre la app desde el icono. Debe abrir normal y navegar entre las cinco pantallas.
4. Desactiva el modo avión.

En el computador puedes comprobar lo mismo: en Chrome, `F12` → **Application** → **Service workers** → marca **Offline** y recarga; en Firefox, menú **≡** → **Más herramientas** → **Trabajar sin conexión**.

### 6. Vocabulario en el celular

Con la app instalada en el teléfono, marca cada punto:

- [ ] La primera vez aparecen las 60 palabras iniciales; el contador dice «60 de 60 palabras».
- [ ] Buscar `etre` muestra *être* y *la fenêtre*; buscar `casa` encuentra *la maison*.
- [ ] Los filtros de categoría y género cambian la lista y el contador.
- [ ] El botón del altavoz de una fila pronuncia la palabra en francés.
- [ ] Al tocar una palabra se abre su ficha; **Oír** y **Oír lento** suenan a distinta velocidad.
- [ ] Si el teléfono no tiene voz francesa, aparece el aviso con los pasos para instalarla.
- [ ] Si el motor de voz del teléfono falla, aparece «El teléfono no pudo leer en voz alta.» con los pasos (no se queda en silencio).
- [ ] **Añadir palabra**: guardar vacío muestra los errores junto a cada campo; con `chat` + femenino pide el artículo; con `la chat` + masculino avisa que «la» es femenino.
- [ ] Añadir `le chat` / `el gato` la muestra en la lista; volver a añadirla dice que ya está en tu lista.
- [ ] **Editar** una palabra cambia el texto en la lista y la lista **no salta arriba** (el foco vuelve a esa palabra); **Borrar** pide confirmación y, al confirmar, desaparece.
- [ ] Con un error de género (`la chat` + masculino), la opción elegida se sigue leyendo (blanco sobre azul) y el selector tiene borde rojo.
- [ ] El gesto **atrás** de Android con una ventana abierta la cierra sin guardar.
- [ ] **Exportar CSV** y **Exportar JSON** descargan `vocabulario-AAAA-MM-DD`; el CSV se abre con los acentos bien.
- [ ] **Importar** ese mismo archivo: el resumen dice que todas ya existen y no hay botón para importar nuevas.
- [ ] Importar un CSV con una fila sin español: el resumen muestra la fila y el motivo.
- [ ] Con **modo avión**, la lista, la búsqueda y la edición siguen funcionando.
- [ ] Al cerrar y volver a abrir la app, los cambios siguen ahí.

### 7. Estudiar en el celular y en el computador

En el teléfono (app instalada), marca cada punto:

- [ ] Estudiar muestra «0 para repasar» y «10 nuevas», con «Francés → español, con SM-2 simplificado.».
- [ ] **Empezar** → «Tarjeta 1 de 10» y la palabra en francés con su altavoz, que suena.
- [ ] **Mostrar respuesta** enseña francés, español y ejemplo, y cuatro botones (2 × 2) con «hoy», «1 día», «1 día», «4 días».
- [ ] **Otra vez** hace que esa tarjeta vuelva hoy (el total de la sesión sube en 1), pero no enseguida: sale después de las nuevas.
- [ ] A mitad de la sesión, **cierra la app** del todo y vuelve a abrirla: Estudiar muestra las mismas tarjetas pendientes y **no** aparecen nuevas de más.
- [ ] Termina la sesión: «Terminaste por hoy», tus respuestas y cuántas vencen mañana.
- [ ] En **Ajustes del estudio**, escribe `7.5` en nuevas por día y **Guardar**: aparece «Escribe un número entero entre 0 y 100.» junto al campo. Con `3` se guarda y el resumen dice «3 nuevas» (o menos si ya estudiaste nuevas hoy).
- [ ] Cambia a **Español → francés**: el anverso muestra el español, sin altavoz; el reverso, el francés con altavoz.
- [ ] Cambia a **Leitner** y vuelve a **SM-2**: los números del resumen pueden cambiar, pero tu progreso sigue ahí.
- [ ] Con **modo avión**, puedes estudiar igual.

En el computador:

- [ ] `Espacio` muestra la respuesta y `1`–`4` responden; con `Intro` también se muestra la respuesta.
- [ ] `O` lee el francés; en español → francés, solo después de mostrar la respuesta.
- [ ] Los botones muestran su tecla (`Espacio`, `1`…`4`) solo si usas ratón; en el teléfono no se ven.
- [ ] Con la ventana de ajustes abierta, o escribiendo en el campo de nuevas por día, las teclas no responden tarjetas.
- [ ] A 1280 px, las cuatro respuestas están en una fila.

### 8. Aviso «Actualizar»

1. Con la app ya abierta alguna vez en el teléfono, publica una versión nueva (sube `CACHE_VERSION`, commit y push) y espera a que GitHub Pages la publique (unos minutos).
2. Abre la app con conexión. A los pocos segundos aparece «Hay una versión nueva de la app.» con **Actualizar**.
3. Pulsa **Actualizar**: la página se recarga una vez con la versión nueva.

Si no aparece, cierra y vuelve a abrir la app: GitHub Pages puede tardar hasta 10 minutos en dejar de servir el `sw.js` anterior.

## Estructura

```
index.html              página única con las cinco pantallas
sw.js                   service worker (caché para usar sin conexión)
manifest.webmanifest    datos de instalación de la PWA
css/styles.css          estilos (valores de DESIGN.md)
js/app.js               arranque: navegación y registro del service worker
js/lib/router.js        qué pantalla corresponde a cada dirección (#/…)
js/update.js            aviso «Actualizar» para versiones nuevas
js/screens/vocabulary.js pantalla Vocabulario (lista, ficha, formulario, importar/exportar)
js/screens/study.js     pantalla Estudiar (resumen, tarjetas, fin y ajustes)
js/screens/voice.js     oír en francés con los mismos avisos en todas las pantallas
js/lib/words.js         validación, duplicadas, búsqueda y orden de palabras
js/lib/csv.js           lector y escritor de CSV
js/lib/transfer.js      importar y exportar en JSON y CSV
js/lib/storage.js       capa de datos (localStorage, intercambiable)
js/lib/speech.js        voz francesa
js/lib/dates.js         fechas locales «AAAA-MM-DD» (qué día es hoy)
js/lib/scheduler.js     algoritmos de repaso SM-2 simplificado y Leitner
js/lib/queue.js         cola diaria: vencidas y nuevas hasta el límite
js/lib/study-storage.js progreso del estudio, historial y ajustes (localStorage)
js/data/initial-words.js lista inicial de 60 palabras
fonts/                  fuentes .woff2 y sus licencias (SIL OFL)
icons/                  iconos de la app
tests/                  pruebas automáticas (*.test.js)
docs/superpowers/       diseños y planes de cada etapa
DESIGN.md               guía visual
```
