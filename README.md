# App-frances

Aplicación hecha con IA para aprender francés y programar un poco.

Es una app web instalable (PWA) para estudiar vocabulario francés de nivel A1. Funciona en Chrome de Android y en el computador, también sin conexión. Tiene ocho pantallas (Inicio, Palabras, Estudiar, Quiz, Progreso, Conversar, Leer y Construir frases). Funcionan **Inicio** (tu copia de seguridad y la tarjeta de Construir frases), **Palabras** (tu lista de palabras con búsqueda, pronunciación e importar/exportar), **Estudiar** (tarjetas con repetición espaciada), **Quiz** (practicar con la app comprobando tus respuestas), **Progreso** (tu racha, tus respuestas de cada día, tu acierto y las palabras que ya dominas), **Conversar** (chatear en francés con Claude), **Leer** (historias cortas con cuestionario) y **Construir frases** (lecciones para armar frases, con repaso).

- **App publicada:** https://joakil255.github.io/App-frances/
- **Guía visual:** [`DESIGN.md`](DESIGN.md)
- **Auditorías:** [accesibilidad](docs/auditoria/accesibilidad.md) y [seguridad](docs/auditoria/seguridad.md)

## Requisitos

- **Node.js 20.19+, 22.13+ o 24+** (sirve para las pruebas y el linter; son las versiones que admite ESLint). Compruébalo con `node --version`.
- **Python 3** (sirve para el servidor local). Compruébalo con `python3 --version`.

## Primera vez

```bash
npm install
npm install --prefix server
```

La primera línea instala ESLint, que solo se usa mientras programas. La app no tiene dependencias. La segunda instala las del servidor de conversación (`server/`): la librería oficial de Anthropic y Wrangler, la herramienta de Cloudflare. `npm test` también ejecuta las pruebas del servidor, así que necesita las dos.

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

## Publicación

La app está publicada en **GitHub Pages**, gratis, desde la rama `main`:

- **Dirección:** https://joakil255.github.io/App-frances/
- **Ruta base:** `/App-frances/` (el nombre del repositorio). Por eso todos los enlaces de la app son **relativos** (`css/styles.css`, `./sw.js`, `start_url` y `scope` `"./"` en el manifiesto): así funcionan igual en `http://localhost:8000/` y bajo `/App-frances/`. El service worker se registra como `./sw.js`, de modo que su alcance es justamente `/App-frances/` y guarda en la caché los archivos de esa ruta.
- **Dónde se configura:** en GitHub, *Settings → Pages → Build and deployment*: «Deploy from a branch», rama `main`, carpeta `/ (root)`.

### Publicar una versión nueva

1. En una rama de trabajo, sube `CACHE_VERSION` en `sw.js` (y añade los archivos nuevos a `PRECACHE_URLS`; ver abajo).
2. `npm test` y `npm run lint` sin errores; commit.
3. Sube la rama y crea un *pull request*; al hacer **merge a `main`**, GitHub Pages publica solo (unos minutos). Puedes seguirlo en la pestaña **Actions** del repositorio.
4. Comprueba que se publicó: abre `https://joakil255.github.io/App-frances/sw.js` y mira que `CACHE_VERSION` sea la nueva.
5. En el teléfono, abre la app: aparece «Hay una versión nueva de la app.» → **Actualizar**.

### Instalar en Android

Abre https://joakil255.github.io/App-frances/ en **Chrome**, espera unos segundos, menú **⋮** → **Instalar app** (o **Agregar a la pantalla principal** → **Instalar**). Los pasos con detalle están en la [comprobación 4](#4-instalar-en-android).

## Copia de seguridad

Tus palabras, tu progreso (el estado de repaso de cada tarjeta), tu historial de respuestas y tus ajustes se guardan **solo en este navegador**. Si borras los datos del navegador o desinstalas la app, se pierden. La copia de seguridad los guarda **todos** en un archivo.

- **Guardar:** en **Inicio**, pulsa **Guardar copia**. Se descarga `copia-frances-AAAA-MM-DD.json`. En Android queda en la carpeta **Descargas** (app *Archivos*). Guárdala también fuera del teléfono (por ejemplo, en tu correo o en Drive): si la borras, no hay copia.
- **Restaurar:** en **Inicio**, pulsa **Restaurar copia** y elige el archivo. Una ventana te dice qué tiene la copia y qué tienes ahora. Al pulsar **Restaurar**, **todo** se reemplaza por lo de la copia (no se combina) y la app se recarga. No se puede deshacer: si quieres conservar lo de ahora, guarda antes otra copia.
- **Si algo falla:** un archivo que no es una copia de la app, dañado o de una versión más nueva **no cambia nada** y la app te dice por qué. Si falta espacio a mitad de la restauración, tus datos quedan como estaban.
- La copia no incluye los respaldos que la app guarda aparte cuando encuentra datos dañados.
- **Exportar** e **Importar** de Palabras siguen sirviendo para listas de palabras (por ejemplo, en CSV para Excel), pero no guardan tu progreso.

## Cómo funciona sin conexión

El archivo [`sw.js`](sw.js) es el *service worker*: un programa que el navegador instala junto a la app y que se queda entre la app y la red.

**Estrategia: copia completa con número de versión.**

1. **Al instalarse** descarga *todos* los archivos de la lista `PRECACHE_URLS` y los guarda en una caché llamada `app-frances-<versión>` (por ejemplo `app-frances-v1`). Si falta un solo archivo, la instalación falla entera y la versión anterior sigue funcionando.
2. **Al pedir un archivo** lo entrega desde esa caché, así que la app abre al instante, con o sin internet. Abrir o recargar la app siempre devuelve la página guardada. Lo que no esté guardado se pide a la red.
3. **Cuando hay una versión nueva**, el navegador la descarga en segundo plano y la deja *esperando*. La app muestra «Hay una versión nueva de la app.» con el botón **Actualizar**. Nada cambia hasta que lo pulsas: entonces la versión nueva se activa, borra la caché vieja y la página se recarga una vez.

### Subir la versión de la caché (paso obligatorio)

Cada vez que cambies **cualquier** archivo de la app:

1. Abre `sw.js` y sube `CACHE_VERSION` (`'v13'` → `'v14'` → `'v15'`…).
2. Si creaste un archivo nuevo, añádelo a `PRECACHE_URLS`. `npm test` falla si se te olvida.
3. `npm test`, commit y publica como en [Publicar una versión nueva](#publicar-una-versión-nueva).

Si no subes `CACHE_VERSION`, los teléfonos que ya tienen la app **no se enteran del cambio**. Las pruebas no pueden detectar este olvido.

## Palabras

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

Las palabras se guardan **solo en este navegador** (`localStorage`). Si borras los datos del navegador o desinstalas la app, se pierden. **Guarda de vez en cuando una [copia de seguridad](#copia-de-seguridad) en Inicio**: incluye las palabras, tu progreso y tu historial. *Exportar* solo guarda las palabras.

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

**Tus datos.** El progreso se guarda en este navegador, aparte de las palabras (clave `app-frances-study`), junto con un historial de cada respuesta que usa la pantalla Progreso. Para no perderlo, usa la [copia de seguridad](#copia-de-seguridad) de Inicio (la exportación de Palabras solo guarda las palabras).

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

## Conversar

Conversas en francés sencillo con Claude (Haiku 5.5). En cada turno responde con una pregunta corta y, debajo de tu mensaje, te muestra los errores: lo que escribiste, la forma correcta y una explicación en español. Eliges el nivel (A1.1 o A1.2). **Conversación nueva** borra la conversación.

- **Necesita conexión.** Sin internet, la pantalla avisa y no envía nada; las demás pantallas siguen funcionando.
- **Límite: 100 mensajes al día**, contados por el servidor. El contador se reinicia a medianoche, hora de Chile. Un mensaje que falla después de llegar a Claude también cuenta.
- **Código de acceso:** la primera vez que abres la pantalla te lo pide y lo guarda en el teléfono. No es la clave de Anthropic: solo abre tu servidor.
- **Tus datos:** tus mensajes se envían a Anthropic (permiso dado el 23/11/2026). La conversación se guarda solo en el teléfono y **no** entra en la copia de seguridad.
- **Costo:** unos $0,0002 por mensaje; con los 100 mensajes diarios, unos $0,60 al mes. Pon un tope de gasto bajo en la consola de Anthropic (por ejemplo, $5 al mes).

### Hablar en francés (micrófono)

Toca **Hablar**, di tu frase en francés y toca **Detener** (o calla y se detiene solo). Lo que entendió el navegador se agrega al campo: **revísalo antes de tocar Enviar**, porque el reconocimiento se puede equivocar. Mientras escucha puedes seguir escribiendo, y **Enviar** detiene el micrófono.

- **Tu voz sale del teléfono.** Para convertirla en texto, el navegador envía el audio a su servicio de reconocimiento (en Chrome para Android, probablemente Google). Solo mientras el micrófono está activo; la app no guarda el audio. La primera vez una ventana lo explica y pide tu aceptación.
- **Navegadores:** funciona en Chrome (computador y Android) y en las versiones recientes de Firefox para computador. En Firefox para Android no hay micrófono: el botón no aparece y escribes como siempre.
- **Necesita conexión**, como el resto de Conversar.
- La evaluación de pronunciación (Fase 2) **no está hecha**. Más detalles en el [diseño de la Etapa 9](docs/superpowers/specs/2026-11-24-etapa-9-voz-design.md).

### Consultar palabras

Toca cualquier palabra de una respuesta de Claude y se abre su tarjeta: qué significa **en esa frase**, su forma base («manges» → «manger») con la traducción, el tipo de palabra y, si es un sustantivo, el artículo y el género. **🔊 Escuchar** lee la forma base.

- **Guardar** la añade a tus palabras, en la pantalla Palabras (categoría «Conversación», con la frase como ejemplo si cabe en 200 letras) y entra al repaso de Estudiar como cualquier palabra nueva.
- **Sin duplicados:** si ya tienes la palabra, aunque sea en otra forma («manges» cuando guardaste «manger», o «école» cuando tienes «l'école»), la tarjeta dice «Ya está en tu vocabulario».
- **Subrayado:** las palabras que ya están en tu vocabulario se ven con una raya rosa debajo en todo el chat.
- **Límite: 200 consultas al día**, contadas por el servidor aparte de los mensajes. Se reinicia a medianoche, hora de Chile.
- **Caché:** cada consulta se guarda en el teléfono (hasta 500); la misma palabra en la misma frase no se vuelve a pedir y se puede ver **sin conexión**. Sin conexión y sin caché, la tarjeta lo avisa. La caché no entra en la copia de seguridad.
- **Tus datos:** la palabra y su frase se envían a Anthropic, igual que tus mensajes.
- Con «Escuchar primero», las palabras de una respuesta tapada se pueden tocar en cuanto tocas **Mostrar texto**.

## Leer

Historias cortas en francés escritas por Claude a tu nivel, para leer y escuchar frase por frase.

- **Nueva historia:** eliges el nivel (A1.1, A1.2 o A2; por defecto A1.2), un tema si quieres y el idioma de las preguntas (Español o Francés; la app recuerda tu última elección). Mientras Claude escribe, el botón dice «Escribiendo…». Al terminar, la historia se abre sola.
- **REVISAR:** cada historia nueva llega marcada **REVISAR** («Esta historia aún no está revisada.»), porque el francés lo escribió Claude. Léela y toca **Aprobar** si está bien o **Descartar** para borrarla. Una aprobada se borra con **Borrar historia**; las dos piden confirmación.
- **Escuchar:** **Escuchar** lee la historia frase por frase y resalta la que suena; el mismo botón dice **Pausa** (termina la frase y se detiene) y **Seguir**. **Más lento** / **Normal** cambia la velocidad desde la frase siguiente. El botón **▶** de cada frase lee desde ahí. La voz se detiene al salir de la pantalla, al ocultar la app, al tocar una palabra y al usar el micrófono de Conversar.
- **Palabras:** toca cualquier palabra para abrir su tarjeta, como en Conversar. **Guardar** la deja en Palabras con la categoría «Lectura» y la frase de la historia como ejemplo; si la historia todavía está en REVISAR, la palabra queda marcada «Pendiente de revisar». Las consultas cuentan en el límite de 200 al día.
- **¿Lo entendiste?** Debajo del texto hay 4 preguntas. **Comprobar** dice si acertaste, explica en español y resalta en el texto la frase con la respuesta; luego **Siguiente**. Al final ves «Resultado: X de 4» y la biblioteca muestra «Preguntas: X/4» (repetir lo reemplaza).
- **Marcar como leída** deja la marca «Leída» en la biblioteca.
- **Sin conexión:** las historias guardadas se leen y tienen su cuestionario; se escuchan con la voz francesa instalada en el teléfono. Para pedir una nueva necesitas conexión.
- **Límite: 5 historias al día**, contadas por el servidor aparte de los mensajes y las consultas. Se reinicia a medianoche, hora de Chile.
- **Tus datos:** el nivel, el tema y el idioma de las preguntas se envían a Anthropic. Las historias se guardan en el teléfono y **sí** entran en la copia de seguridad.
- El gesto «atrás» de Android vuelve de una historia a la biblioteca.

## Construir frases

Lecciones cortas para armar frases en francés, con ejercicios que la app corrige sola (sin conexión y sin Claude) y, al final de cada lección, una frase libre que corrige Claude. En el computador está en la barra de la izquierda («Construir frases»); en el celular la barra no tiene espacio para un octavo botón, así que se abre desde la tarjeta **«Construir frases»** de Inicio.

- **En Inicio:** la tarjeta dice la próxima lección («Próxima lección: …», o «Terminaste todas las lecciones») y cuántas frases te toca repasar hoy («Repaso: N pendientes hoy»). **Seguir lección** abre la próxima lección y **Repasar (N)** abre el repaso (no hace nada si N es 0).

- **La ruta (`#/construir`):** las 24 lecciones en orden, como una línea de metro vertical en dos tramos, **A1** y **A2**. Cada fila dice «Lección N · Título» y su estado en texto:
  - «Sin empezar»;
  - «En curso: X de Y» (ejercicios que ya acertaste alguna vez);
  - «Completada · F de T a la primera · DD/MM/AAAA»: el resultado de tu última práctica completa (F son los ejercicios que acertaste al primer intento). Si vuelves a practicar una lección completada, al terminar se reemplaza por el nuevo resultado; si sales a medias, no cambia. Las lecciones completadas antes de la Etapa 14 dicen solo «Completada · DD/MM/AAAA»;
  - «Próximamente»: lecciones que todavía no existen. Se ven atenuadas y no se pueden abrir (tampoco escribiendo su dirección: la app vuelve a la ruta).
  - «Tiene partes REVISAR», debajo del estado, avisa que algo de la lección todavía no tiene una fuente segura (dentro de la lección cada parte lleva su etiqueta y su nota).
  - La estación de cada lección acompaña al texto: llena con ✓ (completada), con un punto (en curso), vacía (sin empezar) o punteada (próximamente).
  - En el teléfono se llega a la ruta con **«Ver todas las lecciones»** (tarjeta de Inicio); dentro de una lección, **«‹ Todas las lecciones»** vuelve a ella.
  - Arriba, **Continuar: Lección N · Título** abre la primera lección pendiente (la misma que «Seguir lección» de Inicio), y en la ruta esa fila va resaltada. Si ya completaste todas, el botón desaparece y se lee «Completaste todas las lecciones disponibles». Al lado está **Repasar (N)**.
- **Lección:** en este orden, «La idea», «El bloque» (las piezas de la frase), «Cómo pensarlo» (del español al francés), «Ejemplos» (cada uno con **Escuchar**), «Trampa común», «Practicar» y «Fuentes». Lo que está en REVISAR lleva la etiqueta escrita y su nota.
- **Practicar:** un ejercicio por vez («Ejercicio X/Y»), en el orden de la lección. **Comprobar** dice «Correcto.» o «No es correcta.», explica la regla y muestra «La respuesta es: …»; si fallaste, «Tu respuesta:» marca las palabras que cambian, faltan o sobran. Luego **Siguiente**.
  - **Ordenar:** toca las fichas en el orden correcto; pasan a «Tu frase». Toca una ficha de «Tu frase» para devolverla, o **Borrar todo**. No hay que arrastrar nada: funciona con el teclado (Tab y Enter) y con TalkBack.
  - **Completar y corregir:** escribe en el campo. Debajo hay una fila con las letras con acento (à â ç é è ê ë î ï ô ù û œ) que escribe la letra donde está el cursor.
  - Los acentos cuentan según «Exigir acentos» del Quiz. Si solo te falta un acento, ves «Ojo con el acento: …» con la frase bien escrita (también cuando cuenta como correcta).
  - Un ejercicio que fallas vuelve **una vez** al final de esa práctica. Si lo fallas **dos veces** (seguidas o en días distintos) aparece «Este ejercicio irá a tu repaso.».
  - La lección queda «Completada» cuando acertaste cada ejercicio al menos una vez.
- **Frase libre:** al terminar los ejercicios (o al abrir una lección ya terminada) aparece una situación («Situación 1/2»): escribe una frase en francés y toca **Comprobar**.
  - Si coincide con una respuesta modelo, la app dice «Correcta.» sin enviar nada.
  - Si no coincide, **se envía a Claude (Anthropic)** por tu servidor, con el mismo código de acceso de Conversar (si no lo guardaste, la app dice «Falta tu código de acceso.»: escríbelo primero en Conversar). El botón dice «Revisando…» mientras espera.
  - Claude responde «Correcta.» o «Corregida: …», con cada error (lo que escribiste → lo correcto, su tipo, Gramática, Sintaxis u Ortografía, y la explicación), una «Sugerencia» aparte si la frase no responde a la situación o no usa el patrón de la lección, y las «Respuestas modelo».
  - Si hubo errores: «Agregamos esta frase a tu repaso.».
  - **Sin conexión** no se envía nada: ves «Necesitas conexión para que Claude revise tu frase.» y las respuestas modelo para comparar. Hay un límite de 50 correcciones al día.
- **Repaso (`#/construir/repaso`, o «Repasar (N)» arriba de la ruta):** los ejercicios que fallaste dos veces y las frases que corrigió Claude, con la repetición espaciada que elegiste en los ajustes de Estudiar. Cada tarjeta aparece por primera vez **al día siguiente**. Funciona como Practicar, con «Repaso: X/Y».
  - Una frase tuya aparece como «Corrige tu frase», con la etiqueta REVISAR (la corrección es de Claude y puede equivocarse). Si crees que está mal, **Quitar del repaso** la borra después de confirmar.
  - Si no hay nada: «No tienes nada que repasar hoy. Los ejercicios que falles 2 veces aparecerán aquí.».
- **Sin conexión:** las lecciones vienen con la app, así que se leen, se practican y se repasan sin internet. Solo la corrección de la frase libre necesita conexión.
- **Tus datos:** el progreso se guarda en el teléfono (clave `app-frances-build`) y entra en la copia de seguridad. Si no hay espacio, la app lo avisa y la práctica sigue sin guardar.

## Servidor de conversación

La app no guarda ninguna clave. Habla con un servidor pequeño propio (un *Worker* de Cloudflare, carpeta `server/`) que guarda la clave de Anthropic, revisa el código de acceso, cuenta los mensajes del día y llama a Claude.

### Probarlo en tu computador

1. Crea `server/.dev.vars` (git lo ignora; **nunca** lo subas) con dos líneas: `ANTHROPIC_API_KEY=<tu clave>` y `ACCESS_CODE=<un código de prueba>`.
2. En una terminal: `cd server && npx wrangler dev --port 8787 --ip 127.0.0.1`. En otra: `npm start`.
3. Abre `http://127.0.0.1:8000/#/conversar`: en tu computador, la app usa el servidor local.

### Publicarlo en Cloudflare (la primera vez)

Todos los comandos se escriben **dentro de la carpeta `server/`** (`cd server`).

1. Crea una cuenta gratuita en Cloudflare.
2. Conecta Wrangler con tu cuenta: `npx wrangler login` (abre el navegador para autorizar).
3. Crea el almacén del contador: `npx wrangler kv namespace create CHAT_KV`. Wrangler ofrece escribir el `id` en `server/wrangler.jsonc` (campo `id` de `kv_namespaces`); si no lo hace, cópialo tú ahí. No es secreto.
4. Publica: `npx wrangler deploy`. Al final muestra la dirección `https://app-frances-chat.<tu-subdominio>.workers.dev`. Esa dirección, terminada en `/chat`, va en `PRODUCTION_CHAT_URL` de `js/lib/chat.js`.
5. Guarda la clave de Anthropic sin pegarla en ningún archivo:
   `tr -d '[:space:]' < ~/.config/app-frances/anthropic.key | npx wrangler secret put ANTHROPIC_API_KEY`
6. Genera tu código de acceso (20 letras y números en 4 grupos) y guárdalo como secreto:
   `node -e 'const a="abcdefghijklmnopqrstuvwxyz0123456789",b=require("crypto").randomBytes(20);let s="";for(let i=0;i<20;i++){s+=a[b[i]%36];if(i%5===4&&i<19)s+="-"}console.log(s)'`
   y después `npx wrangler secret put ACCESS_CODE` (pega el código cuando lo pida). Anótalo en un lugar seguro: lo escribirás una vez en el teléfono.
7. En la consola de Anthropic, fija un tope de gasto bajo.

### Después

- **Actualizar el servidor** tras un cambio en `server/`: `cd server && npx wrangler deploy`.
- **Cambiar el límite diario:** edita `DAILY_LIMIT` en `server/wrangler.jsonc` y vuelve a publicar.
- **Ver el contador de hoy:** `npx wrangler kv key get --binding CHAT_KV --remote "count:AAAA-MM-DD"` (fecha de Chile).
- **Cambiar el código de acceso:** repite el paso 6; en el teléfono, la app te pedirá el código nuevo.
- **Prueba de las 10 frases** (cuesta unos centavos y envía las frases a Anthropic): `npm run eval --prefix server`.
- **Corrección de frases (`/sentence`):** la frase libre de Construir frases va a la ruta `/sentence` del mismo servidor, con el mismo código de acceso. Tiene su propio contador diario, `SENTENCE_LIMIT` en `server/wrangler.jsonc` (50 al día), aparte de `DAILY_LIMIT`, `LOOKUP_LIMIT` y `STORY_LIMIT`. Para cambiarlo, edítalo y vuelve a publicar. El contador de hoy se ve con `npx wrangler kv key get --binding CHAT_KV --remote "sentence:AAAA-MM-DD"`.
- **Traducción de lecturas (`/translate`):** traduce las frases de las historias viejas de «Leer», con el mismo código de acceso. Tiene su propio contador diario, `TRANSLATE_LIMIT` en `server/wrangler.jsonc` (10 al día), aparte de `DAILY_LIMIT`, `LOOKUP_LIMIT`, `STORY_LIMIT` y `SENTENCE_LIMIT`. El contador de hoy se ve con `npx wrangler kv key get --binding CHAT_KV --remote "translate:AAAA-MM-DD"`. Además, `/story` ahora devuelve cada frase junto con su traducción.
- **Prueba de las 16 frases de Construir** (**cuesta dinero** y envía las frases a Anthropic; córrela solo cuando decidas pagarla, y nadie debe correrla sin tu permiso): `cd server && node eval/compare-sentence.mjs`. Usa la clave de `ANTHROPIC_API_KEY` o de `~/.config/app-frances/anthropic.key`. Al final dice si se cumple el criterio: 10 errores encontrados y corregidos (uno es una palabra que falta), 6 frases correctas sin errores inventados, 2 de 3 sugerencias y cero rechazos.

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
3. Abre la app desde el icono. Debe abrir normal y navegar entre las siete pantallas.
4. Desactiva el modo avión.

En el computador puedes comprobar lo mismo: en Chrome, `F12` → **Application** → **Service workers** → marca **Offline** y recarga; en Firefox, menú **≡** → **Más herramientas** → **Trabajar sin conexión**.

### 6. Palabras en el celular

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
- [ ] **Ver las N palabras dominadas** (cuando tengas alguna) muestra las palabras en el mismo orden que la pantalla Palabras.
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

### 11. Copia de seguridad en el celular

- [ ] En **Inicio**, **Guardar copia** descarga `copia-frances-AAAA-MM-DD.json` y dice cuántas palabras y respuestas guardó; el archivo aparece en **Descargas**.
- [ ] Anota la racha y los números de **Progreso** y cuántas palabras tienes.
- [ ] Borra los datos del sitio: en Chrome, ⋮ → **Configuración** → **Configuración de sitios** → **Todos los sitios** → `joakil255.github.io` → **Borrar y restablecer** (si usas la app instalada, ciérrala antes). Al volver a abrir la app solo están las 60 palabras iniciales y Progreso está vacío.
- [ ] **Restaurar copia** → elige el archivo de Descargas. La ventana dice qué tiene la copia y qué tienes ahora. **Cancelar** no cambia nada.
- [ ] Vuelve a elegirlo y pulsa **Restaurar**: la app se recarga, Inicio dice «Se restauró la copia del …», y las palabras, la racha, los números de Progreso y tus ajustes de Estudiar son los mismos que anotaste.
- [ ] Elige un archivo que no sea una copia (una foto o la exportación de Palabras): aparece un aviso que dice por qué y nada cambia.

### 12. Lector de pantalla (TalkBack)

- [ ] Activa **TalkBack** (Ajustes → Accesibilidad). Recorre Inicio, Palabras (abre una ficha), Estudiar (una tarjeta), Quiz y Progreso: cada botón se lee con su nombre, los avisos se anuncian y el gráfico de Progreso se lee con su resumen.

## Estructura

```
index.html              página única con las siete pantallas
sw.js                   service worker (caché para usar sin conexión)
manifest.webmanifest    datos de instalación de la PWA
css/styles.css          estilos (valores de DESIGN.md)
js/app.js               arranque: navegación y registro del service worker
js/lib/router.js        qué pantalla corresponde a cada dirección (#/…)
js/update.js            aviso «Actualizar» para versiones nuevas
js/screens/vocabulary.js pantalla Palabras (lista, ficha, formulario, importar/exportar)
js/screens/study.js     pantalla Estudiar (resumen, tarjetas, fin y ajustes)
js/screens/voice.js     oír en francés con los mismos avisos en todas las pantallas
js/screens/quiz.js      pantalla Quiz (modos, respuesta inmediata y resumen)
js/screens/progress.js  pantalla Progreso (racha, gráfico SVG, acierto y palabras)
js/screens/home.js      pantalla Inicio (tarjeta Construir frases y copia de seguridad)
js/screens/reader.js    pantalla Leer (biblioteca, lector con voz por frases y cuestionario)
js/screens/build.js     pantalla Construir frases (ruta, lección, práctica y repaso)
js/screens/build-free.js frase libre de Construir (modelos y corrección de Claude)
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
js/lib/backup.js        copia de seguridad: armar, validar y restaurar (sin dejar datos a medias)
js/lib/messages.js      catálogo único de mensajes de error
js/data/initial-words.js lista inicial de 60 palabras
js/lib/deck.js          carga del mazo A1 opcional
data/a1-deck.json       mazo de 100 palabras A1 (formato de exportación de la app)
fonts/                  fuentes .woff2 y sus licencias (SIL OFL)
icons/                  iconos de la app
tests/                  pruebas automáticas (*.test.js)
docs/superpowers/       diseños y planes de cada etapa
docs/contenido/         revisión del contenido (mazo A1: tabla completa y lista REVISAR)
docs/auditoria/         auditorías de accesibilidad y seguridad (y Lighthouse)
DESIGN.md               guía visual
```
