# Etapa 9 — Chat de voz en francés: diseño (pendiente de aprobación)

> **Estado:** borrador para revisar. No hay código. Las decisiones las tomó el usuario el 24/11/2026, salvo las marcadas como **decisión del diseño** (propuestas que el usuario puede corregir).

## Intención

El usuario quiere la voz **para practicar la pronunciación y entender francés hablado** (sus palabras). La Fase 1 agrega voz a la pantalla «Conversar» de la Etapa 8:
- hablas en francés y el navegador lo convierte en texto;
- ese texto se envía al mismo chat;
- la respuesta de Claude se escucha con la voz del navegador.

La Fase 2, evaluar la pronunciación con un servicio externo, **solo se compara y no se implementa**.

**Objetivos**
- Micrófono en «Conversar» con el reconocimiento de voz del navegador (Web Speech API, `fr-FR`).
- **Tu voz no se envía sola:** lo que entendió el navegador queda escrito en el campo, lo revisas y tocas **Enviar**. Ver qué palabras no se entendieron es la práctica de pronunciación.
- **Escuchar primero:** la respuesta de Claude se lee sola y su texto queda tapado hasta que tocas «Mostrar texto».
- Volver a oír cada respuesta a velocidad normal 🔊 o lenta 🐢, y oír la **forma correcta** de cada corrección 🔊.
- Aviso de privacidad la primera vez que se usa el micrófono.

**No-objetivos**
- Implementar la Fase 2.
- Usar un proveedor de audio distinto del navegador.
- Grabar o guardar audio.
- Enviar el mensaje automáticamente al terminar de hablar.
- Voz en otras pantallas.
- Forzar el modo local del reconocimiento.
- Cambiar el servidor o sus instrucciones.

**Anti-objetivos (fracaso aunque funcione)**
- Enviar audio sin el aviso previo, o fuera de un momento en que el usuario activó el micrófono.
- Perder el texto que el usuario ya había escrito en el campo.
- Romper el chat escrito o las demás pantallas sin conexión.
- Que sin micrófono o en un navegador sin reconocimiento la pantalla deje de servir: escribir debe seguir funcionando igual.
- Usar `innerHTML` con lo reconocido o con lo que responde Claude.

## Lo que se verificó (documentación oficial, consultada el 24/11/2026)

| Tema | Hallazgo | Fuente |
|---|---|---|
| Reconocimiento en Chrome de escritorio | `SpeechRecognition` sin prefijo desde la versión 139; con prefijo `webkit` desde la 33 | Datos de compatibilidad de MDN |
| Reconocimiento en Chrome para Android | Soportado (refleja a Chrome; el código usa `window.SpeechRecognition \|\| window.webkitSpeechRecognition`). `continuous` *«se puede activar, pero no tiene efecto»* | Datos de compatibilidad de MDN |
| Reconocimiento en Firefox | Escritorio: versión 160 según MDN; la propuesta de Mozilla dice que llega en la 161, *«strictly on device»*. Android: no | MDN; grupo dev-platform de Mozilla |
| ¿Adónde va el audio? | *«En algunos navegadores, el reconocimiento usa por defecto un servidor: tu audio se envía a un servicio web… y no funciona sin conexión, salvo que se exija el reconocimiento en el dispositivo»* | MDN SpeechRecognition |
| Modo local (`processLocally`, `available()`, `install()`) | Chrome 139 en Windows, Mac y Linux; paquete de unos 60 MB por idioma; `install()` necesita que el usuario acabe de tocar algo. **Android no lo tiene** (confirmado por Chrome en mayo de 2026) | MDN; intenciones de Chrome en blink-dev |
| Errores | `no-speech`, `aborted`, `audio-capture`, `network`, `not-allowed`, `service-not-allowed`, `language-not-supported`, `phrases-not-supported`, `bad-grammar` (obsoleto) | MDN SpeechRecognitionErrorEvent.error |
| Lectura en voz alta | `speechSynthesis` funciona en todos los navegadores principales (Chrome 33, Chrome Android, Firefox 49, Firefox Android 62, Safari 7). `localService: false` significa que la voz viene de un servicio remoto | Datos de compatibilidad de MDN; MDN localService |

**No se pudo verificar**
- Quién recibe el audio en Chrome para Android (probablemente Google; solo lo dicen foros) y cuánto lo guarda. La página de privacidad de Chrome ya no existe y su reemplazo no lo explica.
- Si existe paquete local en francés.
- Si Chromium 158 (no es Chrome) puede usar el servidor o el modo local.
- Si Firefox 160.0.1 ya lo trae activado o recién la 161.
- Si Chrome para Android lee en voz alta una respuesta que llega unos segundos después del toque en **Enviar**: la lectura podría exigir un toque reciente. Por decisión del usuario no se hace una prueba previa; el diseño tiene un plan de respaldo (ver «Escuchar primero») y se comprueba en la prueba final en el teléfono.

## Decisiones del usuario

1. **Privacidad: opción A.** El micrófono funciona en el teléfono aunque el audio salga a un servidor. La primera vez la app avisa que tu voz sale del teléfono al servicio de reconocimiento del navegador. Solo se envía audio mientras el micrófono está activo.
2. **Escuchar primero**, con un botón para mostrar el texto.
3. **Enfoque 1:** voz dentro de «Conversar», **sin cambiar el servidor**.
4. **Sin prueba previa en el teléfono:** la lectura automática se comprueba al final, en el teléfono. Si no funciona, rige el respaldo de «Escuchar primero».

## Enfoques considerados

| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **1. Voz dentro de «Conversar», sin cambiar el servidor** | Claude no sabe que el mensaje vino por voz. Una palabra mal reconocida puede llegar como «error» | **Elegido.** Es el más simple; el servidor ya descarta las correcciones que solo cambian mayúsculas o el punto final |
| 2. Lo mismo, más un aviso de voz al servidor | Cambiar el servidor, volver a publicarlo y repetir la prueba de las 10 frases; ganancia incierta | Queda para después, si el enfoque 1 da correcciones falsas |
| 3. Pantalla aparte «Hablar» | Un séptimo botón en una barra que ya va justa; repetir la lógica del chat | Descartado |

En el computador se usa el mismo modo que en el teléfono: el navegador decide. Es **decisión del diseño**, para tener un solo comportamiento que probar.

## Diseño

### Micrófono
- **Tocar para hablar** (no mantener pulsado): un toque empieza a escuchar y otro lo detiene. También se detiene solo cuando callas, como hace Chrome en Android. El botón usa `aria-pressed` y su texto cambia de «Hablar» a «Detener». **Decisión del diseño:** mantener pulsado es difícil con teclado y con lector de pantalla.
- `lang = 'fr-FR'`, `interimResults = true` y `maxAlternatives = 1`.
- **El texto parcial** se ve en una línea aparte bajo el campo («Escuchando: …»), no dentro del campo. **Solo el resultado final** se agrega al campo, así que puedes escribir mientras escucha sin que se borre nada. **Decisión del diseño** (tras la revisión del constructor).
- Lo reconocido **se agrega** al campo: si está vacío, lo llena; si tiene texto, lo pone a continuación con un espacio. Nunca borra lo que escribiste. Respeta el máximo de 500 caracteres.
- Mientras escucha, el botón **Enviar** sigue disponible; enviar detiene el micrófono.
- **Navegador sin reconocimiento** (por ejemplo, Firefox en Android): el botón no aparece y escribir funciona igual.
- **Sin conexión:** al tocar el micrófono se muestra el aviso existente `chatOffline` y no se activa.

### Aviso de privacidad (solo la primera vez)
- Antes de la primera escucha se abre una ventana:
  - el audio sale del dispositivo al servicio de reconocimiento del navegador; en Chrome para Android, probablemente Google;
  - solo se envía mientras el micrófono está activo;
  - no se guarda audio en la app.
- Botones **«Usar el micrófono»** y **«Cancelar»**. Al aceptar, el aviso no vuelve a aparecer y empieza la escucha.
- El permiso del micrófono del navegador se pide después, como siempre lo pide el navegador.

### Escuchar primero
- Interruptor **«Escuchar primero»**, encendido al empezar y guardado en el teléfono.
- Con el interruptor encendido:
  - cada respuesta nueva de Claude **se lee sola** con la mejor voz francesa (se reutiliza `playFrench` de `js/screens/voice.js`);
  - su texto queda oculto, con el atributo `hidden`, tras un botón **«Mostrar texto»** (`aria-expanded`).
- **Si la respuesta no se puede oír** (no hay `speechSynthesis`, no hay voz francesa, el motor falla o el navegador bloquea la lectura sin un toque reciente), **el texto se muestra solo** y aparece el aviso que corresponda una sola vez. Así nunca quedas atascado detrás de «Mostrar texto». Para eso, `playFrench` debe informar si pudo leer. **Decisión del diseño** (tras la revisión del constructor).
- Con el interruptor apagado, la respuesta se muestra y **no** se lee sola.
- Las respuestas cargadas del historial al abrir la pantalla siempre se muestran: no se tapan otra vez. **Decisión del diseño.**
- Las correcciones, que están en español, se ven siempre.

### Botones de escucha
- En cada respuesta de Claude: 🔊 a velocidad normal y 🐢 lenta (`RATES.normal` y `RATES.slow` de `js/lib/speech.js`).
- En cada corrección: 🔊 con la forma correcta (`corrected`).
- Si no hay voz francesa o el motor falla, se usan los avisos existentes `noSpeech`, `noFrenchVoice` y `voiceFailed`.
- Los botones tienen nombre accesible, por ejemplo «Escuchar la respuesta» y «Escuchar más lento». Los emojis van ocultos al lector de pantalla.

### Datos guardados
- Clave nueva `app-frances-voice` → `{ schemaVersion: 1, listenFirst: boolean, privacyAccepted: boolean }`. Va **fuera** de la copia de seguridad; `backup.js` no cambia.
- Si los datos guardados están dañados: `listenFirst: true`, `privacyAccepted: false`.
- La conversación (`app-frances-chat`) **no cambia** de formato. **Decisión del diseño.**

### Mensajes de error del micrófono
Mensajes nuevos en el catálogo `js/lib/messages.js`, por código de error del reconocimiento:
- `not-allowed` y `service-not-allowed`: permiso del micrófono negado; cómo activarlo en Chrome.
- `no-speech`: no se oyó nada.
- `audio-capture`: no hay micrófono.
- `network`: sin conexión con el servicio de reconocimiento.
- `language-not-supported`: el navegador no reconoce francés.
- Cualquier otro código: mensaje genérico.
- `aborted` no muestra nada: es el usuario deteniendo.

Los textos exactos se escriben en el plan.

### Servidor
**No cambia.** El mensaje de voz llega como cualquier mensaje escrito. Ya se descartan las correcciones que solo cambian mayúsculas o el punto final.

## Pruebas

- **Pruebas automáticas** de la lógica nueva, sin navegador real (TDD):
  - elegir el constructor de reconocimiento, con o sin prefijo, o ninguno;
  - que, con «Escuchar primero», una lectura que falla muestre el texto;
  - agregar lo reconocido al campo sin perder texto, con acentos, apóstrofos tipográficos y el límite de 500 caracteres;
  - convertir cada error en su mensaje, y `aborted` en ninguno;
  - el almacén de `app-frances-voice`, incluidos los datos dañados;
  - los mensajes nuevos del catálogo.
- **Recorrido** en el navegador a 360 y 1280 px, en modo claro y oscuro:
  - el reconocimiento se simula con un objeto falso;
  - se comprueban el aviso de privacidad, el texto tapado y «Mostrar texto», los botones de escucha y el modo sin conexión.
- **Prueba final en el teléfono**, hecha por el usuario. Comprueba el reconocimiento en `fr-FR`, la lectura automática tras la respuesta (y, si falla, que el texto aparezca solo), los resultados parciales y el aviso de privacidad.
- `sw.js`: `CACHE_VERSION = 'v18'` y los archivos nuevos en la precarga.

## Fase 2: evaluación de pronunciación (solo comparación)

| | **Azure AI Speech** | **Speechace** | **SpeechSuper** |
|---|---|---|---|
| Francés | `fr-FR`: exactitud, fluidez y completitud; sonidos y palabras. La prosodia solo en `en-US` | `fr-fr`: palabra, sonido, frase y habla libre (pronunciación y fluidez). Sin entonación | Francés solo con texto leído; el habla libre solo en inglés y chino |
| Costo | Se cobra como voz a texto; **5 horas gratis al mes**; el precio por hora no se veía en la página | **$40 al mes** por 5000 audios de 15 s; prueba gratis de duración no indicada | **$0,006 por frase**; mínimo de **$20 al mes** |
| Límites | 30 s por audio, o más con su librería | 15 o 30 s en el plan básico (su documentación se contradice) | 2–200 palabras |
| Datos | *«No guarda los datos»* en tiempo real | Guarda el audio **90 días**; no entrena con él | *«Lo descarta de inmediato»*; no dice si entrena; sede en China; política de mayo de 2024 |
| Clave | En un servidor | Debe llamarse desde un servidor (su FAQ) | No lo dicen |

Claude no recibe audio, solo texto. Es conocimiento previo y no se volvió a verificar.

**Recomendación: no vale la pena por ahora.** Sumaría otra empresa que recibe tu voz, otra cuenta, otra clave y una ruta nueva en el servidor para enviar audio. Si se retoma, **Azure** encaja mejor: sus horas gratis alcanzan para una persona y dice que no guarda el audio en tiempo real. Exigiría pedir permiso de nuevo. Antes conviene usar la Fase 1 unas semanas.

## Límites conocidos

- En el teléfono, el audio sale del dispositivo hacia un servicio que no se pudo identificar en un documento oficial. El usuario lo aceptó con aviso.
- El reconocimiento corrige hacia palabras que conoce: si pronuncias mal, puede «adivinar» la palabra correcta y el error no se notaría. No reemplaza una evaluación de pronunciación.
- Claude no sabe que el mensaje vino por voz (enfoque 1).
- No se verificó con TalkBack.

## Lo que queda para el plan

- Los textos exactos del aviso de privacidad y de los mensajes de error.
- El diseño visual, con la skill frontend-design y DESIGN.md.
- Cómo se reparte el código entre `js/lib/` y `js/screens/`. `js/screens/chat.js` tiene hoy 252 líneas: la voz puede ir en un archivo propio.
