# Etapa 11 — Lecturas con audio: diseño (pendiente de aprobación)

> **Estado:** borrador para revisar. No hay código. Las decisiones las tomó el usuario el 24/11/2026, salvo las marcadas como **decisión del diseño** (propuestas que el usuario puede corregir).

## Intención

El usuario quiere **practicar la comprensión lectora y auditiva con textos a su nivel** (sus palabras). La etapa agrega una sección **«Leer»**:
- una **biblioteca** de textos con nivel, estado leído, y fuente y licencia;
- un **lector** que lee en voz alta frase por frase, resaltando la que suena, con pausa y velocidad;
- tocar una palabra abre la **tarjeta de la Etapa 10** para traducirla y guardarla;
- los textos son **historias originales que escribe Claude** a su nivel, con el adaptador de la Etapa 8, y quedan **REVISAR** hasta que el usuario las aprueba.

Depende de la Etapa 10: tarjeta de palabras, `/lookup` y la caché de consultas.

**Objetivos**
- Biblioteca con nivel (`A1.1`, `A1.2`, `A2`), estado REVISAR o aprobada, leída o no, y fuente y licencia por texto.
- Generar historias desde la app, con un límite diario aparte.
- **Lector:**
  - lee frase por frase con resaltado;
  - Escuchar, Pausa (al terminar la frase) y velocidad normal o lenta;
  - tocar una frase lee desde ahí.
- Tocar una palabra abre la tarjeta y permite guardarla con la frase de la historia como ejemplo.
- Aprobar o descartar una historia, y marcarla como leída.
- **Un cuestionario de comprensión por historia,** con 4 preguntas de opción múltiple y su resultado guardado (pedido por el usuario).
- Funcionar sin conexión con las historias ya guardadas; solo generar y consultar palabras nuevas necesita red.
- Modelo de datos compatible con varios idiomas.
- Pruebas automáticas.

**No-objetivos**
- LibriVox y cualquier texto o audio de terceros.
- Voz en la nube.
- Importar textos propios.
- Editar el texto de una historia.
- Resaltar palabra por palabra.
- Otros idiomas en la interfaz.

**Anti-objetivos (fracaso aunque funcione)**
- Incluir textos de terceros sin licencia confirmada.
- Enviar datos a alguien que no sea Anthropic.
- Mostrar una historia sin aprobar como si estuviera revisada.
- Perder historias o palabras.
- Que las historias consuman mensajes o consultas del día.
- Mostrar como HTML lo que escribe Claude.
- Que el lector quede «hablando solo» al salir de la pantalla.
- Una pantalla inaccesible o incómoda en el teléfono.

## Lo que se verificó (documentación oficial, consultada el 24/11/2026)

| | Voz del navegador | LibriVox | Voz en la nube |
|---|---|---|---|
| Disponibilidad | `speechSynthesis` en Chrome 33+, Chrome Android, Firefox 49+ y Safari 7+ (datos de compatibilidad de MDN); ya la usa la app | 21 969 grabaciones en el Internet Archive, **276 marcadas en francés** (API `advancedsearch` del Internet Archive) | Google Cloud TTS: unas 36 voces `fr-FR`, en una lista aproximada. Azure: no se pudo leer |
| Calidad en francés | La de la voz del teléfono | Voces de voluntarios; obras clásicas (Balzac, Loti, poesía), lejos de A1 | Voces neuronales; no se pudo comparar |
| Costo | Gratis | Gratis | Google: el precio no se veía. Azure: 0,5 millones de caracteres gratis al mes y el precio de pago no se veía |
| Licencia o datos | Las voces locales no envían datos | Los ítems revisados dicen *Public Domain Mark*; el dominio público es de EE. UU. | Google: *«no registra el texto ni el audio»*. Azure: *«no guarda el texto»*. Ninguna aclara el entrenamiento. Es otra empresa: necesitaría permiso |
| Resaltar la frase | El evento `boundary` está marcado como *«does not fire as expected»* en Chrome. Se resuelve leyendo **una frase por vez** | No se encontró sincronía | Google: marcas `<mark>`. Azure: eventos por palabra y por frase |
| Pausa en Android | *«In Android, `pause()` ends the current utterance»* | — | — |

**No se pudo verificar**
- Las páginas de LibriVox, que daban error 522 en todos los intentos: su licencia exacta, la de los textos y si hay sincronía.
- Los precios de pago de Google y Azure.
- La calidad de las voces en la nube y la lista de voces de Azure.
- Si Google o Azure entrenan con el texto.
- Que Anthropic no tiene voz (síntesis de voz) es conocimiento previo, no verificado de nuevo.

## Decisiones del usuario

1. Para qué: comprensión lectora y auditiva con textos a su nivel.
2. **Enfoque 1:** historias de Claude con la voz del navegador, frase por frase. LibriVox y la voz en la nube quedan fuera.
3. La biblioteca, la generación, REVISAR, el lector, los datos y el límite, como se describen abajo, aprobados como se los propuse.
4. **Navegación:** un séptimo botón «Leer» en la barra, si cabe a 360 px con 44 px de ancho por botón. Si no cabe, se le muestran alternativas antes de seguir.
5. **Cuestionarios de comprensión** («para comprobar que se hayan entendido»), como se describen en «App: cuestionario».
6. **Idioma de las preguntas a elección del usuario**, al pedir cada historia: Español o Francés. La app recuerda la última elección y la primera vez viene marcado Español. Se descartó cambiar el idioma dentro del lector, porque exigiría escribir las preguntas en los dos idiomas.

## Enfoques considerados

| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **1. Historias de Claude + voz del navegador frase por frase** | Voz algo robótica; la pausa espera al fin de la frase | **Elegido.** Sin empresas nuevas, gratis y sin conexión una vez guardada |
| 2. Historias de Claude + voz en la nube (Azure) | Permiso para Microsoft, cuenta, clave, ruta de audio y caché de audio; precio de pago no verificado | Para después, si la voz del teléfono no alcanza; la biblioteca no cambia |
| 3. Sumar LibriVox | Textos demasiado difíciles, sin resaltado y con la licencia por confirmar en Chile | Descartado |

## Diseño

### Modelo de datos de los textos
`app-frances-texts` → `{ schemaVersion: 1, texts: [...] }`. Cada texto:

| Campo | Qué es |
|---|---|
| `id` | UUID |
| `lang` | Idioma del texto; hoy `'fr'` |
| `title`, `body` | Título y texto, en el idioma de `lang` |
| `level` | `A1.1`, `A1.2` o `A2` (niveles MCER, válidos para cualquier idioma) |
| `status` | `'review'` (REVISAR) o `'approved'` |
| `readAt` | Fecha ISO en que se marcó como leído, o `null` |
| `source` | `{ kind: 'generated', name: 'Claude (Anthropic)', license: 'Historia original generada para uso personal' }`. `kind` deja lugar a otros orígenes en el futuro (`'own'`, `'public-domain'`…), cada uno con su licencia obligatoria. **Decisión del diseño** |
| `topic` | El tema pedido, o `''` |
| `quiz` | `{ lang: 'es' \| 'fr', questions: [{ question, options: [texto ×3 o 4], answer: índice, explanation, evidence }] }`. Siempre son 4 preguntas. `explanation` va en español. `evidence` es la frase exacta de `body` que tiene la respuesta |
| `quizResult` | `{ correct, total, at }` del último intento, o `null` |
| `createdAt`, `updatedAt` | Fechas ISO |

- **Validación** (`validateText`):
  - `lang` ∈ `['fr']`;
  - `level` en la lista;
  - `title` de 1 a 80 letras;
  - `body` de 1 a 3000 letras;
  - `status` en la lista;
  - `source.license` no vacío;
  - `quiz` con 4 preguntas; cada una con 3 o 4 opciones distintas, `answer` válido y `evidence` contenida en `body`;
  - `quizResult` nulo o con números válidos.
- Si el almacén está dañado, se copia aparte y empieza vacío, como el de palabras.
- **Copia de seguridad, versión 3:** incluye `texts`. Lee las versiones 1, 2 y 3, y al restaurar valida cada texto.
  - **Restaurar una v3** reemplaza las historias, igual que reemplaza las palabras. Las tres claves se escriben juntas y, si una falla, se deshace todo.
  - **Restaurar una v1 o v2**, que no traen historias, **no toca las historias guardadas**. Así una copia vieja nunca las borra. **Decisión del diseño** (tras la revisión del constructor).
  - La ventana de confirmación dice qué se reemplaza.

### Servidor: ruta `POST /story`
- Mismo Worker, código de acceso, origen y CORS.
- **Cuerpo:** `{ lang: 'fr', level, topic, quizLang }`, con `quizLang` ∈ `['es', 'fr']`. `topic` tiene de 0 a 60 letras, sin saltos de línea. Si no cumple: 400 `invalid_input`.
- **Contador aparte:** clave KV `story:AAAA-MM-DD` y `STORY_LIMIT=5`. Se reserva antes de llamar al proveedor; al llegar al tope responde 429 `story_limit`. No toca los otros contadores.
- **Adaptador:** `story({ lang, level, topic, quizLang })`, con salida estructurada (Haiku 5.5, esfuerzo `low`). La salida es `{ title, body, questions }`: la historia y sus 4 preguntas salen en una sola petición, que cuenta una vez en el límite.
- **Validación de la salida en el servidor:**
  - `title` de 1 a 80 letras;
  - `body` de 80 a 300 palabras y como máximo 3000 letras;
  - al menos 4 frases;
  - sin etiquetas HTML ni Markdown;
  - 4 preguntas; cada una con 3 o 4 opciones distintas, un `answer` dentro del rango, `explanation` no vacía y `evidence` que aparece tal cual en `body` (sin distinguir mayúsculas ni tipo de apóstrofo).
  - Si algo no cumple: `bad_output`.
- **Instrucciones**, en español, pidiendo una historia en francés:
  - para un hispanohablante del nivel pedido, con frases cortas y vocabulario frecuente;
  - presente y passé composé solo en `A2`;
  - género y concordancia correctos;
  - sin datos personales reales;
  - sobre el tema, si lo hay;
  - 4 preguntas de comprensión en el idioma `quizLang`, que se respondan con el texto, con una sola opción correcta y distractores creíbles, y la explicación en español.
- **Prueba real, con permiso:** generar 3 historias (una por nivel, con preguntas en español en dos y en francés en una) y comprobar con código la longitud, el número de frases, la ausencia de etiquetas y las preguntas (cantidad, una sola correcta, `evidence` en el texto). Las revisa a mano el controlador, que marca las dudas con REVISAR. **No se publica si alguna falla la validación.**

### App: biblioteca
- Pantalla **«Leer»** (`#/leer`), séptimo botón de la barra (decisión 4).
- **El lector tiene su propia dirección,** `#/leer/<id>`. Así, el gesto «atrás» de Android vuelve a la biblioteca y una recarga mantiene la historia abierta. El enrutador acepta `leer/<id>`; un `id` desconocido vuelve a la biblioteca. Salir de `#/leer/<id>` cuenta como salir del lector. **Decisión del diseño** (tras la revisión del constructor).
- **Lista de textos,** de más nuevo a más viejo. Cada uno muestra:
  - el título;
  - el nivel;
  - la marca **REVISAR** (con texto, no solo color) o nada;
  - «Leída» si `readAt` existe;
  - «Preguntas: 3/4» si hay `quizResult`.
- **Botón «Nueva historia»:**
  - abre una ventana con el nivel (por defecto `A1.2`), un tema opcional y **«Preguntas en: Español / Francés»** (recuerda la última elección; la primera vez, Español);
  - al enviar muestra «Escribiendo…»;
  - si funciona, guarda el texto con `status: 'review'` y lo abre en el lector;
  - los errores usan el catálogo (`chatMessage`) más el mensaje nuevo `story_limit`;
  - sin conexión: `chatOffline`.
- **Biblioteca vacía:** «Aquí verás tus lecturas. Pide a Claude una historia a tu nivel.»

### App: lector
- **Cabecera:**
  - el título;
  - el nivel;
  - la marca REVISAR (con «Esta historia aún no está revisada.»);
  - la fuente y la licencia en texto pequeño.
- **El texto** se corta en frases y palabras con `tokenize` (Etapa 10).
  - Cada frase empieza con un botón pequeño **«▶»**, con nombre accesible «Leer desde esta frase». Es la forma de leer desde ahí: un bloque tocable con botones dentro no es HTML válido y confunde al lector de pantalla.
  - Cada palabra válida es un botón que abre la tarjeta.
  - Todo con `textContent`.
  - **Decisión del diseño** (tras la revisión del constructor).
- **Reproductor:** `createSentencePlayer({ synth, voice, sentences, onSentence, onEnd })` (lógica pura, probada con un `speechSynthesis` falso).
  - `play(from)` lee la frase `from` y sigue con las siguientes. Cada frase es un `SpeechSynthesisUtterance`, y `onSentence(i)` se avisa al empezar cada una.
  - `pause()` deja de avanzar al terminar la frase actual.
  - `resume()` sigue desde la siguiente.
  - `stop()` cancela de inmediato.
  - `setRate(rate)` usa `RATES.normal` o `RATES.slow`.
  - Si la voz falla, se usa el aviso `voiceFailed` y se detiene.
  - Resalta la frase activa con una clase y `aria-current="true"`. El resaltado no depende solo del color.
- **El lector se detiene** al salir de la pantalla, al ocultar la página, al abrir la tarjeta de una palabra y cuando se activa el micrófono del chat.
- **Botones:** «Escuchar» o «Seguir», «Pausa», «Más lento» o «Normal», «Marcar como leída», y para REVISAR «Aprobar» y «Descartar».
- **Descartar** borra la historia para siempre, después de confirmar. Una historia aprobada también se puede borrar, con «Borrar historia» y confirmación. El almacén tiene `deleteText(id)` y no hay estado «descartada». **Decisión del diseño** (tras la revisión del constructor).
- **Guardar una palabra desde el lector:**
  - la frase de la historia queda como ejemplo;
  - `category: 'Lectura'`. `wordFromLookup(result, sentence, { category, needsReview })` recibe la categoría y la marca de revisión, y el chat sigue usando `'Conversación'` y `false`. **Decisión del diseño**;
  - **si la historia está en REVISAR**, la palabra se guarda con `needsReview: true` (la marca «revisar» que ya existe en Vocabulario), porque su ejemplo viene de un texto sin revisar. **Decisión del diseño** (tras la revisión del constructor);
  - las consultas cuentan en el límite de 200 de la Etapa 10.
- **La tarjeta de palabras se generaliza:** `refresh(root)` subraya dentro del contenedor que se le pase (chat o lector), sin depender de `#chat-log`.

### App: cuestionario
- En el lector, debajo del texto: **«¿Lo entendiste? Responder 4 preguntas»**.
- Una pregunta por vez: «1/4», la pregunta y sus opciones como botones de radio con etiqueta.
- **«Comprobar»** dice si es correcta («Correcto.» o «No es correcta. La respuesta es: …»), muestra la explicación en español y **resalta en el texto la frase `evidence`**. Después viene **«Siguiente»**.
- Al final: «Resultado: X de 4», con **«Volver a intentar»**. Se guarda `quizResult` con la fecha; repetir lo reemplaza.
- Funciona sin conexión.
- Mientras la historia está en REVISAR, el cuestionario se puede hacer, pero muestra la misma marca, porque las preguntas también son de Claude.
- No se mezcla con la pantalla Quiz, que repasa el vocabulario.
- Lógica pura y probada: `createReadingQuiz(quiz)` → `{ current(), answer(i), next(), result() }`.

### Mensajes nuevos
- `story_limit`: «Llegaste al límite de historias de hoy.» / «Puedes leer las que ya tienes; el límite se reinicia a medianoche, hora de Chile.»
- Los textos de la biblioteca y del lector van en el plan.

## Pruebas automáticas (sin red y sin gastar)

**Textos**
- `validateText` acepta y rechaza cada campo.
- El almacén guarda, lee, aprueba, descarta, marca leída y copia aparte los datos dañados.
- La copia de seguridad v3:
  - hace ida y vuelta con textos;
  - restaurar una v1 o v2 deja intactas las historias guardadas;
  - restaurar una v3 las reemplaza, y si falla una escritura, se deshace todo;
  - un texto inválido la marca como dañada.
- `deleteText`.

**Servidor**
- Validación de `/story`.
- Contador `story:` aparte (el 6.º del día da 429 `story_limit`; no toca `count:` ni `lookup:`).
- Normalización y rechazo de salidas: muy corta, muy larga, con HTML, con menos de 4 frases.
- Adaptador `story` con un `fetch` falso.

**Cuestionario**
- `createReadingQuiz`: avanza, puntúa y da el resultado.
- No deja responder dos veces la misma pregunta.
- Valida `evidence` y el rango de `answer`.
- `quizResult` se guarda y se reemplaza.
- El servidor rechaza preguntas con opciones repetidas, `answer` fuera de rango o `evidence` que no está en el texto.

**Reproductor**, con un `speechSynthesis` falso:
- recorre las frases en orden;
- `pause` espera al fin de la frase;
- `resume` sigue con la siguiente;
- `play(3)` empieza en la cuarta frase;
- `stop` cancela;
- la velocidad se aplica;
- un error de voz detiene la lectura y avisa una sola vez;
- texto de una sola frase y texto vacío.

**App**
- Orden de la biblioteca.
- Que `wordFromLookup` use la categoría y `needsReview`.
- Que el enrutador acepte `#/leer/<id>`.
- Que `refresh(root)` subraye solo dentro del contenedor.
- Seguridad: los archivos nuevos entran en la prueba que prohíbe `innerHTML`.

**Recorrido** a 360 y 1280 px, en modo claro y oscuro, con un servidor falso, y la prueba final en el teléfono.

## Estimación de tiempo
- **Programar y revisar con agentes:** unas **6 a 8 horas** de trabajo (los cuestionarios suman cerca de una hora). Comparado con la Etapa 10, que tuvo 6 tareas con su revisión: aquí son 7 tareas, y la pantalla es más grande. Puede necesitar **dos sesiones**, porque en la Etapa 10 se agotó una vez el límite de uso.
- **Tu tiempo:** unos 20 a 30 minutos. Lo usas en:
  - aprobar el plan;
  - dar permiso para la prueba real (3 historias, menos de un centavo);
  - confirmar la publicación del servidor y el push;
  - probar en el teléfono;
  - revisar tus primeras historias.

## Límites conocidos
- La voz del teléfono suena algo robótica.
- La pausa espera a que termine la frase actual.
- El francés de las historias lo escribe Claude: por eso quedan REVISAR hasta que las apruebas, y la prueba real las revisa a mano.
- No se verificó la licencia de LibriVox, que queda fuera.

## Lo que queda para el plan
- Los textos exactos de la biblioteca, el lector y la ventana «Nueva historia».
- Las instrucciones de la historia.
- El diseño visual, con frontend-design y DESIGN.md, y la medición de la barra con 7 botones.
- `CACHE_VERSION` y la precarga.
- Volver a publicar el servidor, con confirmación.
