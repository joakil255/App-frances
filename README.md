# App-frances

Aplicación hecha con IA para aprender francés y programar un poco.

Es una app web instalable (PWA) para estudiar vocabulario francés de nivel A1. Funciona en Chrome de Android y en el computador, también sin conexión. Tiene cinco pantallas (Inicio, Vocabulario, Estudiar, Quiz y Progreso). Funcionan **Vocabulario** (tu lista de palabras con búsqueda, pronunciación e importar/exportar), **Estudiar** (tarjetas con repetición espaciada), **Quiz** (practicar con la app comprobando tus respuestas) y **Progreso** (tu racha, tus respuestas de cada día, tu acierto y las palabras que ya dominas).

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

### Mazo de 100 palabras A1 (opcional)

El botón **Añadir 100 palabras A1** amplía las 60 iniciales con 100 palabras nuevas, **sin repetir ninguna**, cada una con una frase de ejemplo corta: 12 saludos, los números del 0 al 20, 12 de familia, 20 de comida, 20 verbos y 15 lugares. Las traducciones están en **español de Chile**.

Al pulsarlo se abre la misma ventana que al importar un archivo («100 palabras nuevas para importar…») y nada cambia hasta que confirmas. Si ya lo añadiste, la ventana dice que las 100 ya existen. Funciona sin conexión después de la primera carga. El archivo es `data/a1-deck.json` y también se puede importar a mano con **Importar**.

**Contenido pendiente de tu revisión.** Las entradas con la etiqueta **Revisar** tienen una duda concreta; la lista con el motivo de cada una y la tabla completa están en [`docs/contenido/a1-deck.md`](docs/contenido/a1-deck.md). **Ojo:** después de corregir palabras del mazo, si vuelves a abrir **Añadir 100 palabras A1**, no pulses **Reemplazar**: volvería a poner el texto original y la marca **Revisar** en todas.

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

**Tus datos.** El progreso se guarda en este navegador, aparte de las palabras (clave `app-frances-study`), junto con un historial de cada respuesta que usa la pantalla Progreso. **La exportación de Vocabulario no incluye el progreso del estudio.**

## Quiz

El Quiz sirve para **practicar**: la app comprueba tu respuesta y te dice al momento si acertaste, cuál era la correcta y la frase de ejemplo. **No cambia** cuándo te toca repasar en Estudiar; cada respuesta se guarda en el historial que usa la pantalla Progreso.

Elige un modo; cada quiz tiene hasta **10 preguntas**, primero de palabras que ya estudiaste y, si faltan, del resto de tu lista (sin repetir):

- **Opción múltiple:** ves una palabra en francés y eliges su traducción entre 4. Las otras 3 salen de tus palabras y nunca repiten la correcta. Necesitas al menos 4 palabras con traducciones distintas.
- **Escribir en francés:** ves la palabra en español y la escribes en francés **con su artículo** («la maison», no «maison»).
- **Dictado:** oyes la **frase de ejemplo** de una palabra y la escribes. Solo salen palabras con ejemplo, y hace falta la voz francesa del teléfono (con **Oír** y **Oír lento** puedes repetirla).

**Cómo se comprueba lo que escribes:** no importan las mayúsculas, los espacios de más, la puntuación (comas, puntos, «?», «!») ni el tipo de apóstrofo (`’` o `'`). El guion sí cuenta («grand-père»). Con los acentos tú decides con la casilla **Exigir acentos**:

- **Sin marcar** (al principio): «ete» por «été» cuenta como acierto, con el aviso «Correcto, pero ojo con el acento».
- **Marcada:** cuenta como fallo, con el aviso «Solo te falló el acento».

Escribir «oe» en lugar de «œ» cuenta como error de acento. Si no sabes la respuesta, pulsa **No lo sé**: cuenta como fallada y ves la correcta. Al final ves cuántas acertaste y la lista de las falladas.

## Progreso

Progreso responde dos preguntas: **¿estudio todos los días?** y **¿qué palabras ya domino?** No guarda nada nuevo: cada vez que abres la pantalla, lo calcula todo a partir del historial de respuestas de Estudiar y del Quiz y de tus tarjetas.

**Cómo se cuenta** (las mismas reglas que prueban las pruebas automáticas):

- **Día estudiado:** un día en el que diste al menos **una respuesta**, en Estudiar o en el Quiz. Cada respuesta guarda la fecha que marcaba tu reloj **en ese momento**.
- **Racha:** cuántos días estudiados seguidos llevas. Si hoy todavía no estudiaste, cuenta hasta ayer: **por la mañana no la pierdes**. Se rompe cuando pasa un día entero del calendario sin ninguna respuesta (estudiaste el 20, no el 21 → el 22 la racha es 0).
- **Cambio de zona horaria:** la fecha de cada respuesta no se vuelve a calcular, así que un viaje no borra ni duplica días; lo único es que ese día te puede durar unas horas más o menos. Si al viajar hacia el oeste quedan respuestas con fecha «de mañana», la racha y el gráfico cuentan desde ese día. Una fecha más lejana (reloj mal puesto) no mueve la pantalla.
- **Respuestas de los últimos 14 días:** una barra por día con su número; los días sin estudiar se ven como una estación vacía en la línea. Debajo, **Ver los datos día por día** muestra la misma información en una tabla.
- **Acierto en los últimos 30 días**, por separado: en **Estudiar**, «Otra vez» es fallo y «Difícil», «Bien» y «Fácil» son aciertos (te calificas tú); en el **Quiz**, lo que corrigió la app. El porcentaje se redondea hacia abajo: nunca verás 100 % si fallaste alguna.
- **Palabra dominada:** una tarjeta está dominada cuando su próximo repaso queda a **14 días o más** del último (con SM-2, unas 4 respuestas «Bien» seguidas; con Leitner, la caja 5). Una palabra está **dominada** si todas las tarjetas que estudiaste de ella lo están (si solo estudias francés → español, la otra dirección no cuenta), **nueva** si aún no estudiaste ninguna y **en aprendizaje** en los demás casos. Si respondes «Otra vez», vuelve a «en aprendizaje». Se usa el algoritmo elegido en Estudiar: **si cambias de algoritmo, los números pueden cambiar**.

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
- [ ] **Añadir 100 palabras A1**: la ventana dice «100 palabras nuevas para importar», «0 ya existen» y «0 filas con errores»; al importar, el contador pasa a «160 de 160 palabras» y el filtro de categoría muestra **Números** y **Lugares**.
- [ ] Vuelve a pulsarlo: la ventana dice que las 100 ya existen y no ofrece importar.
- [ ] Con **modo avión** (tras abrir la app una vez con conexión), el botón sigue funcionando.
- [ ] Después de añadirlo, Estudiar sigue mostrando como mucho tus «nuevas por día» (10 por defecto).

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

### 8. Quiz en el celular y en el computador

En el teléfono (app instalada), marca cada punto:

- [ ] Quiz muestra los tres modos. Si el teléfono no tiene voz francesa, **Dictado** está desactivado y dice por qué.
- [ ] **Opción múltiple:** 4 opciones distintas; al tocar una, se marca «✓ Correcta» y, si fallaste, «✗ Tu respuesta». Debajo, la respuesta correcta y el ejemplo.
- [ ] **Escribir en francés:** al aparecer la pregunta se abre el teclado y **el campo no queda tapado**; la primera letra **no** sale en mayúscula; las letras con acento se escriben manteniendo pulsada la letra (é, è, ç…).
- [ ] Pulsa **Comprobar** con el campo vacío: aparece «Escribe tu respuesta o pulsa «No lo sé».» y no cuenta.
- [ ] Escribe una palabra con acento sin el acento («l'ecole»): «Correcto, pero ojo con el acento». Marca **Exigir acentos**, empieza otro quiz y repítelo: «Solo te falló el acento».
- [ ] **Dictado:** la frase suena sola al aparecer; **Oír** y **Oír lento** la repiten. Escribirla sin comas ni signos cuenta como acierto.
- [ ] Al final: «Acertaste N de M» y la lista de falladas con lo que escribiste. **Otro quiz** vuelve al inicio.
- [ ] Haz un quiz y después mira Estudiar: los números «para repasar» y «nuevas» **no** cambian por el quiz.
- [ ] Con **modo avión**, el quiz funciona (el dictado, si la voz francesa está descargada en el teléfono).

En el computador:

- [ ] Escribe la respuesta y pulsa `Intro` para comprobar; `Tab` hasta **Siguiente** e `Intro` para seguir.
- [ ] A 1280 px, **Comprobar** y **No lo sé** están en una fila y todo se lee bien en tema claro y oscuro.

### 9. Progreso en el celular y en el computador

En el teléfono (app instalada), marca cada punto:

- [ ] Sin haber respondido nada (o en un navegador nuevo): Progreso dice «Aquí verás tu racha…» y «Tus palabras» muestra todas como nuevas.
- [ ] Responde unas tarjetas en Estudiar y un quiz, y abre Progreso: «1 día seguido», «✓ Hoy ya estudiaste», la barra de hoy con el número de respuestas y los dos porcentajes con «de N respuestas».
- [ ] Al día siguiente, **antes de estudiar**: la racha sigue y dice «Hoy todavía no estudiaste».
- [ ] **Ver los datos día por día** abre una tabla con los 14 días; los números coinciden con las barras.
- [ ] **Ver las N palabras dominadas** (cuando tengas alguna) muestra las palabras en el mismo orden que Vocabulario.
- [ ] Con **TalkBack** activado, al tocar el gráfico se lee «Respuestas por día en los últimos 14 días: estudiaste … de 14 días, … respuestas en total.».
- [ ] Todo se lee bien en tema claro y oscuro y no hay que desplazarse de lado.
- [ ] Con **modo avión**, Progreso se abre y muestra lo mismo.

En el computador:

- [ ] Con `Tab` llegas a los dos desplegables, con el foco visible, y `Intro` los abre y cierra.
- [ ] A 1280 px el gráfico no se estira más de su tamaño y se lee bien.

### 10. Aviso «Actualizar»

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
js/screens/quiz.js      pantalla Quiz (modos, respuesta inmediata y resumen)
js/screens/progress.js  pantalla Progreso (racha, gráfico SVG, acierto y palabras)
js/lib/words.js         validación, duplicadas, búsqueda y orden de palabras
js/lib/csv.js           lector y escritor de CSV
js/lib/transfer.js      importar y exportar en JSON y CSV
js/lib/storage.js       capa de datos (localStorage, intercambiable)
js/lib/speech.js        voz francesa
js/lib/dates.js         fechas locales «AAAA-MM-DD» (qué día es hoy)
js/lib/scheduler.js     algoritmos de repaso SM-2 simplificado y Leitner
js/lib/queue.js         cola diaria: vencidas y nuevas hasta el límite
js/lib/study-storage.js progreso del estudio, historial (Estudiar y Quiz) y ajustes (localStorage)
js/lib/answer-check.js  comprobar respuestas escritas (mayúsculas, espacios, acentos…)
js/lib/quiz.js          modos del quiz, elección de palabras y opciones
js/lib/stats.js         estadísticas de Progreso (racha, días, acierto y estado de las palabras)
js/data/initial-words.js lista inicial de 60 palabras
js/lib/deck.js          carga del mazo A1 opcional
data/a1-deck.json       mazo de 100 palabras A1 (formato de exportación de la app)
fonts/                  fuentes .woff2 y sus licencias (SIL OFL)
icons/                  iconos de la app
tests/                  pruebas automáticas (*.test.js)
docs/superpowers/       diseños y planes de cada etapa
docs/contenido/         revisión del contenido (mazo A1: tabla completa y lista REVISAR)
DESIGN.md               guía visual
```
