# Etapa 8 — Conversación con IA: diseño (aprobado)

> **Estado:** **aprobado por el usuario el 23/11/2026.** No hay código. Todas las decisiones de abajo las tomó el usuario el 23/11/2026, salvo las marcadas como **decisión del diseño** (propuestas que el usuario puede corregir al revisar).

## Intención

Practicar francés A1 conversando: la IA responde en francés sencillo y, en cada turno, corrige los errores del último mensaje del usuario con una explicación en español. La usa una sola persona (hispanohablante, nivel A1.2), sobre todo desde Chrome en Android.

**Objetivos**
- Pantalla de chat de práctica, con nivel A1.1 o A1.2.
- Correcciones en cada turno: fragmento original, fragmento corregido y explicación en español.
- Servidor pequeño que guarda la clave y llama a Claude; la app nunca ve la clave.
- **Adaptador intercambiable:** el servidor habla con el proveedor a través de un contrato común; solo se programa el adaptador de Claude.
- Límite diario de mensajes contado en el servidor.
- Errores claros en español y aviso sin conexión.
- Pruebas automáticas sin red y sin gastar, y una prueba real de 10 frases que solo se ejecuta con permiso.

**No-objetivos:** voz (hablar o escuchar); guardar conversaciones en la nube; varios usuarios; elegir el proveedor desde la app; programar los adaptadores de Gemini, Mistral o Groq; incluir la conversación en la copia de seguridad.

**Anti-objetivos (fracaso aunque funcione):** una clave en el repositorio o en el navegador; que otra persona pueda usar el servidor; gastos sin tope; enviar datos a un proveedor no aprobado; que la app deje de funcionar sin conexión en sus otras pantallas.

## Arquitectura

```
PWA (GitHub Pages)  ──HTTPS──►  Cloudflare Worker  ──►  Claude Haiku 5.5 (API de Anthropic)
  sin claves                    · código de acceso
  código de acceso guardado     · límite diario (contador en Workers KV)
  conversación guardada         · instrucciones de práctica (nivel)
                                · adaptador → respuesta normalizada y validada
```

### Servidor (Cloudflare Worker)

- **Código:** carpeta `server/` del mismo repositorio, con su propio `package.json` (dependencias `@anthropic-ai/sdk` y `wrangler`), para que la app siga sin dependencias. **Decisión del diseño.**
- **Una ruta:** `POST /chat` con cuerpo `{ level, history, message }` y la cabecera `Authorization: Bearer <código de acceso>`. Responde `{ reply, corrections, remaining }` (`remaining`: mensajes que quedan hoy). **Decisión del diseño.**
- **Variables:** `AI_PROVIDER=claude`, `AI_MODEL=claude-haiku-5-5`, `AI_EFFORT=low`, `DAILY_LIMIT=100`. **Secretos** (con `wrangler secret put`, nunca en archivos): `ANTHROPIC_API_KEY`, `ACCESS_CODE`. Si falta una variable o un secreto, o `AI_PROVIDER` no es conocido, el Worker responde con un error de configuración sin llamar al proveedor. Un Worker no tiene un «arranque» donde fallar, así que se comprueba en cada petición.
- **Protección:**
  1. Código de acceso personal: cadena larga y aleatoria, comparada en tiempo constante. Si falta o no coincide, responde 401.
  2. Solo acepta el origen `https://joakil255.github.io` (CORS). Es un complemento, no una barrera. En desarrollo también se admite el origen local.
  3. Límite diario: clave KV por fecha de Chile (`America/Santiago`), por ejemplo `count:2026-11-23`. Al alcanzar `DAILY_LIMIT` responde 429 sin llamar al proveedor. El contador **sube antes de llamar al proveedor**, de modo que también cuentan las llamadas que fallan pero se cobran (`bad_output`, `refused`): así el límite frena también los fallos repetidos. Un mensaje fallido gasta uno de los 100. **Decisión del diseño** (cambiada tras la revisión: antes contaba solo las respuestas buenas, lo que dejaba sin tope los fallos cobrados).
  4. El usuario fija un tope de gasto bajo en la consola de Anthropic (sugerido: $5 al mes).
- **Validación de entrada:** `level` ∈ {`A1.1`, `A1.2`}; `message` no vacío y de 500 caracteres como máximo; `history`, una lista de turnos `{ role: "user"|"assistant", text }`, recortada en el servidor a los últimos 10 turnos (20 mensajes). Si algo no cumple, responde 400. **Decisión del diseño** (cifras ajustables).

### Contrato común del adaptador (`server/providers/<nombre>.js`)

- Entrada: `{ level, history, message }`, ya validada.
- Salida normalizada: `{ reply: string, corrections: [{ original, corrected, explanation }] }`. `corrections` puede estar vacía.
- Errores normalizados:
  - `auth`: clave inválida;
  - `rate_limit`: demasiadas peticiones;
  - `quota`: sin saldo;
  - `unavailable`: proveedor caído o sin respuesta a tiempo;
  - `bad_output`: la salida no cumple el formato;
  - `refused`: el proveedor rechazó la petición (en Claude, `stop_reason: "refusal"`; Haiku 5.5 no tiene respaldo automático en el servidor).
- El servidor **valida** siempre la salida con el mismo esquema, venga del proveedor que venga, y **descarta las correcciones en que `original` y `corrected` son iguales** (ignorando mayúsculas, apóstrofos tipográficos y puntuación final). En la prueba apareció una «corrección» así. **Decisión del diseño.**
- **Adaptador de Claude:** `client.messages.create` con `model`, `max_tokens: 4000`, `system` (las instrucciones de abajo), `output_config: { effort: "low", format: { type: "json_schema", schema } }` y `messages` (historial más mensaje). El parámetro `thinking` no se envía: Haiku 5.5 piensa de forma adaptativa por defecto. En las pruebas, `fetch` se reemplaza por uno falso. La librería reintenta sola los errores pasajeros (2 veces por defecto). El tiempo de espera debe quedar acotado, por ejemplo 30 s. **Decisión del diseño.**

### Instrucciones de práctica (probadas el 23/11/2026)

El servidor reemplaza `{level}` por el nivel elegido. Es el texto que acertó 20/20 en la prueba, con «A1.2» cambiado por `{level}`:

```
Eres un compañero de conversación para practicar francés. El alumno habla español y tiene nivel {level}. Tutéalo siempre (usa «tu», nunca «vous»).

En cada turno:
1. "reply": responde en francés muy sencillo (nivel A1, frases cortas, vocabulario frecuente) y sigue la conversación con una pregunta corta.
2. "corrections": revisa SOLO el último mensaje del alumno, palabra por palabra, buscando estos errores:
   - elisión: je, me, te, se, le, la, de, ne, que delante de vocal o h muda (je habite → j'habite; la école → l'école);
   - contracción: à + le → au, à + les → aux, de + le → du, de + les → des;
   - género del artículo, plural, concordancia entre sujeto y verbo, verbo correcto (la edad va con avoir).
   Por cada error real añade un objeto con:
   - "original": el fragmento exacto que escribió el alumno,
   - "corrected": ese mismo fragmento corregido,
   - "explanation": una o dos frases claras en español, sin repetir palabras innecesarias.
   Si el mensaje es correcto, deja "corrections" vacía. No corrijas el estilo ni inventes errores.
```

Esquema de salida: objeto con `reply` (texto) y `corrections` (lista de objetos con `original`, `corrected` y `explanation`, todos de texto). Todos los campos son obligatorios y no se admiten campos adicionales (`additionalProperties: false`).

### App (PWA)

- **Pantalla nueva «Conversar»** (ruta `#/chat`), diseñada con la skill frontend-design y DESIGN.md: lista de mensajes; bajo cada mensaje del usuario, sus correcciones (original → corregido, con la explicación); campo de texto en francés (sin autocorrección del teclado, como en Vocabulario); botón Enviar; selector de nivel; aviso de mensajes restantes del día; botón para empezar una conversación nueva.
- **Código de acceso:** se pide la primera vez que se abre la pantalla y se guarda en `localStorage`. No es una clave de API: solo abre el servidor propio y no da acceso a la cuenta de Anthropic.
- **URL del servidor:** constante en el código de la app. No es secreta.
- **Conversación:** se guarda solo en el teléfono (`localStorage`), fuera de la copia de seguridad, **sin tope de tamaño** (elegido por el usuario): se borra a mano con «Conversación nueva». Si al guardarla el navegador se queda sin espacio, la pantalla muestra el mensaje existente `storageQuota`. Todo texto del modelo o del usuario se muestra con `textContent`, nunca como HTML.
- **Mensajes nuevos en `js/lib/messages.js`:**
  - sin conexión: «Necesitas conexión para conversar.»;
  - código de acceso incorrecto;
  - límite diario alcanzado: «Llegaste al límite de hoy, vuelve mañana.»;
  - uno por cada error normalizado (`auth`, `rate_limit`, `quota`, `unavailable`, `bad_output`, `refused`) y uno para el error de configuración.

  Los textos exactos se escriben en el plan.
- **Sin conexión:** la pantalla carga igual, porque está en la precarga del service worker (se sube `CACHE_VERSION`), y muestra el aviso en vez de enviar. Las demás pantallas no cambian.

## Prueba real: 10 frases A1

Archivos `server/eval/a1-sentences.json` y `server/eval/compare.mjs` (nombres en inglés, según CLAUDE.md). El script envía cada frase al proveedor configurado y genera una tabla con cuatro preguntas: ¿encontró el error?, ¿la forma corregida es la esperada?, ¿explicó en español?, ¿inventó errores en las frases correctas? Llama **directamente al adaptador de Claude**, no al Worker publicado, y **califica sola**: la función de calificación (normalizar el texto, aceptar varias correcciones válidas, detectar correcciones inventadas) lleva pruebas automáticas. Que la explicación esté en español no se califica con código: la tabla la muestra para leerla. **Decisión del diseño.** Ejecutarla es **opcional** y **solo con permiso explícito**, porque cuesta dinero y envía las frases. La clave se lee de `~/.config/app-frances/anthropic.key` o de una variable de entorno local, nunca de un archivo del repositorio.

| # | Frase del alumno | Corrección aceptada | Qué pone a prueba |
|---|---|---|---|
| 1 | Je suis 20 ans. | J'ai 20 ans. | La edad se dice con *avoir* |
| 2 | Le maison est grande. | La maison | Género |
| 3 | Je habite à Santiago. | J'habite | Elisión |
| 4 | Nous allons à le marché. | au marché | Contracción *à + le* |
| 5 | Elle a deux chat. | deux chats | Plural |
| 6 | Je mange un pomme. | une pomme | Artículo y género |
| 7 | Ils est dans la cuisine. | Ils sont **o** Il est | Concordancia verbal (las dos son válidas) |
| 8 | Je vais à la école. | l'école | Elisión con *la* |
| 9 | Il fait froid aujourd'hui. | (correcta) | Que no invente errores |
| 10 | Je ne mange pas de viande. | (correcta) | Que no invente errores |

### Resultados del 23/11/2026 (script desechable, fuera del repositorio)

| Ronda | Instrucciones | Esfuerzo `low` | Esfuerzo `medium` |
|---|---|---|---|
| 1 (1 pasada) | primera versión, sin lista de errores ni «tutéalo» | 7/10 | 8/10 |
| 2 (2 pasadas) | versión de arriba | **20/20** | **20/20** |

- **Ronda 1:** falló sobre todo la elisión (#3 y #8) y mezcló «tu» y «vous». En el #7, «Il est» se contó como fallo, pero es válido: el criterio se corrigió para la ronda 2.
- **Ronda 2:**
  - Cero errores inventados y siempre usó «tu».
  - Defectos menores: alguna corrección duplicada («la école» y «à la école»); con `medium`, una «corrección» que no cambiaba nada y una explicación escrita en francés; algunas explicaciones con una frase de más; respuestas que a veces confunden quién habla («Elle a deux chats» → «tu as des animaux»).
- **Costo y tiempo medidos** (sin historial): `low` ≈ $0,000134 por mensaje, `medium` ≈ $0,000153; unos 2 s por respuesta. Toda la prueba costó ≈ $0,008.
- **Límite conocido:** 10 frases sueltas son una muestra pequeña. En conversaciones largas, con historial, podría comportarse distinto.

## Pruebas automáticas (sin red y sin gastar)

- **Adaptador de Claude** con un `fetch` falso:
  - la petición va bien armada (modelo, esfuerzo, esquema, instrucciones con el nivel);
  - la respuesta queda normalizada;
  - las correcciones que no cambian nada se descartan;
  - cada fallo del proveedor da su error normalizado: 401 → `auth`, 429 → `rate_limit`, saldo agotado → `quota`, 5xx o tiempo agotado → `unavailable`, JSON inválido o fuera del esquema → `bad_output`, rechazo → `refused`.
- **Worker**, con KV en memoria:
  - sin código de acceso o con uno incorrecto → 401;
  - origen no permitido → 403;
  - entrada inválida → 400;
  - límite alcanzado → 429, sin llamar al proveedor;
  - el contador sube antes de llamar al proveedor, también cuando la llamada termina en `bad_output` o `refused`;
  - el cambio de día en Chile reinicia el contador (incluido el cambio de horario);
  - una configuración incompleta o un `AI_PROVIDER` desconocido dan error de configuración;
  - el historial se recorta a 10 turnos.
- **App:**
  - sin conexión, aparece el aviso y no se envía nada;
  - cada error tiene su mensaje del catálogo;
  - el texto del modelo se muestra como texto, también cuando contiene `<script>`;
  - la conversación sobrevive a recargar la página.
- **Seguridad:**
  - la prueba existente se amplía para rechazar claves con forma conocida (`sk-ant-`) en el repositorio;
  - `.gitignore` incluye `.dev.vars` (los secretos locales de `wrangler dev`) y `.wrangler/`.
- **Casos límite:** mensaje vacío, acentos y apóstrofos tipográficos, mensaje de 500 caracteres, historial largo.

## Decisiones tomadas (con sus razones)

- **Proveedor y modelo: Claude Haiku 5.5 (`claude-haiku-5-5`), esfuerzo `low`.**
  - El usuario prefiere los modelos de Anthropic y quiere abaratar.
  - El esfuerzo `low` acertó lo mismo que `medium` (20/20) en la prueba, cuesta algo menos y tuvo menos rarezas.
  - Precio verificado: $0,10 / $0,50 por millón de piezas (entrada / salida).
  - Gasto esperado: ≈ $0,0002 por mensaje con historial, es decir, unos **$0,60 al mes con 100 mensajes diarios**.
- **Adaptador intercambiable, con solo el de Claude programado**, por petición del usuario. Gemini, Mistral y Groq quedan como adaptadores futuros: cada uno necesitará verificar sus condiciones, aprobar su dependencia y pedir permiso de datos.
- **Alojamiento: Cloudflare Workers, con el contador en Workers KV.** Datos de la documentación oficial, consultada el 23/11/2026:
  - Workers gratis: 100.000 peticiones al día; al pasarse responde con un error y no cobra. Permite 10 ms de CPU por petición, y la espera de red no cuenta. El Worker debe iniciar en menos de 1 s y puede pesar hasta 64 MiB.
  - KV gratis: 100.000 lecturas y 1000 escrituras al día.
  - No se confirmó si la cuenta pide tarjeta.
  - **Enfoques considerados:**
    - (A) Workers + KV, **elegido**. Con mensajes casi simultáneos podría contar uno de menos, un riesgo aceptable con un solo usuario y el tope de gasto.
    - (B) Workers + Durable Objects: contador exacto, pero con más código.
    - (C) Deno Deploy: descartado, porque cierra en abril de 2027.
- **Límite diario: 100 mensajes.** El usuario practica unos 20 minutos un día normal y hasta una hora un día con ganas.
- **Dependencias aprobadas:**
  - `@anthropic-ai/sdk` 1.13.0 (Apache-2.0), en el servidor. Su README oficial incluye Cloudflare Workers entre los entornos compatibles.
  - `wrangler` 4.167.0 (MIT o Apache-2.0), solo de desarrollo: pruebas locales, secretos y publicación.
  - **Enfoques considerados:**
    - SDK + Wrangler, **elegido**.
    - `fetch` + Wrangler: rehace a mano los reintentos y los errores.
    - `fetch` + panel web: el código publicado puede quedar distinto del repositorio y no se puede probar en local.
- **Permiso de datos:** se pueden enviar a Anthropic los mensajes del chat y las 10 frases de la prueba. El permiso vale **solo para Anthropic**.
- **Descartados por ahora:**
  - Gemini: su plan gratuito usa los datos para entrenar y deja que personas los lean.
  - Mistral: límites y conservación de datos sin verificar.
  - Ollama: privado y gratis, pero exige el computador encendido y, con la tarjeta disponible, corrige peor.

## Cuándo está terminada la etapa

**Con el servidor publicado y funcionando en el teléfono** (elegido por el usuario). Los pasos son:
1. El plan se detiene a la mitad para que el usuario cree su cuenta de Cloudflare (quizás pida una tarjeta) y siga una guía para crear el espacio KV y los secretos.
2. Se publica el Worker con `wrangler deploy`, y su dirección real queda como constante en la app.
3. La prueba final se hace en el teléfono, con Claude de verdad (costo de centavos).
4. **Publicar el Worker y actualizar la app en GitHub Pages (merge a `main`) requieren, cada uno, la confirmación del usuario.**

## Límites conocidos

- La conversación no tiene tope. Una muy larga podría llenar el espacio del navegador (unos 5 MB, compartidos con las palabras y el progreso) y hacer fallar el guardado en otras pantallas. El usuario lo aceptó.
- Con mensajes casi simultáneos, el contador de KV podría contar uno de menos.
- La prueba de 10 frases es una muestra pequeña.

## Lo que queda para el plan

- Textos exactos de los mensajes nuevos del catálogo.
- Diseño visual de la pantalla «Conversar», con frontend-design y DESIGN.md.
- La guía paso a paso para el usuario (cuenta de Cloudflare, KV, secretos y publicación).
- Cómo se ejecutan las pruebas del servidor junto a las de la app (`npm test`).

## Anexo: comparación de proveedores (documentación oficial, consultada el 23/11/2026)

| | **Claude (Anthropic)** | **Gemini (Google)** | **Mistral** | **Groq** |
|---|---|---|---|---|
| Precio por millón de piezas (entrada / salida) | Haiku 5.5: $0,10 / $0,50 · Sonnet 5.5: $2 / $10 · Opus 5.5: $4 / $20 — **verificado** | Gemini 3.5 Flash-Lite: $0,30 / $2,50 · Gemini 4 Carbon: $2 / $10 hasta el 30/11/2026, luego $4 / $20 — **verificado** | Small 4: $0,15 / $0,60 — verificado; el resto, no | **No verificado** |
| Plan gratuito | Créditos iniciales para probar; **cantidad no publicada** | Sí, en varios modelos Flash; **los modelos más capaces no** | **No verificado** para la API | **No verificado** |
| Límites | Nivel inicial: 4000 peticiones/min; tope de gasto ajustable en la consola — **verificado** | Por proyecto; cifras del plan gratuito no publicadas | **No verificado** | Ej. `openai/gpt-oss-20b`: 30/min, 1000/día — **parcial** |
| ¿Entrenan con tus datos? | **No**, por defecto, en la API — verificado | Plan **gratuito: sí**, y personas pueden leerlos; de pago: no — verificado | **No**, salvo opciones o modelos «Labs/Preview» — verificado | **No verificado** |
| Conservación de datos | Se borran a los 30 días, con excepciones — verificado | De pago: «por un tiempo limitado» — verificado (sin cifra) | **No verificado** | Por defecto no se conservan; hasta 30 días si hay abuso — verificado |
| Condiciones | — | Mayores de 18; uso profesional; región disponible — verificado | — | Datos en EE. UU. — verificado |
