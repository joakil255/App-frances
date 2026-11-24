# Etapa 8 — Conversación con IA: diseño (BORRADOR, pendiente de aprobación)

> **Estado:** borrador. No hay código. Proveedor elegido: Claude Haiku 5.5. Alojamiento: Cloudflare Workers + KV. Límite diario: 100 mensajes. Falta confirmar el modelo (prueba de las 10 frases), aprobar las dependencias y dar permiso para enviar datos. **Traspaso:** la implementación se hará en una sesión nueva; este documento es el punto de partida.

**Intención.** Practicar francés A1 conversando: la IA responde en francés sencillo y, al final de cada turno, corrige los errores del usuario con una explicación en español.

**Objetivos:** chat de práctica con nivel A1 ajustable; correcciones al final de cada turno; **proveedor intercambiable** (Claude, Gemini, Mistral, Groq) elegido por una variable de entorno del servidor; clave **solo en el servidor**; **límite diario de mensajes** contado en el servidor; errores claros en español y aviso sin conexión; pruebas del servidor y del manejo de errores; una prueba comparativa con 10 frases A1.
**No-objetivos:** voz (hablar o escuchar), guardar conversaciones en la nube, varios usuarios, cambiar de proveedor desde la app.
**Anti-objetivos:** cualquier clave en el repositorio o en el navegador; que otras personas puedan usar el servidor; gastos sin tope; enviar datos a un proveedor sin que el usuario lo haya aprobado.

## Arquitectura

```
PWA (GitHub Pages)  ──HTTPS──►  Cloudflare Worker  ──►  proveedor elegido (AI_PROVIDER)
  sin claves                    · código de acceso       Claude | Gemini | Mistral | Groq
  código de acceso local        · límite diario (contador en KV)
                                · instrucciones de práctica (nivel A1.1–A1.2)
                                · adaptador → respuesta normalizada
```

**Contrato común del adaptador** (`server/providers/<nombre>.js`), igual para los cuatro:

- Entrada: `{ level, history, message }` (historial recortado a los últimos N turnos).
- Salida normalizada: `{ reply: string, corrections: [{ original, corrected, explanation }] }`. `explanation` va en español; `corrections` puede estar vacía.
- Errores normalizados (los muestra la app con el catálogo de mensajes de la Etapa 7): `auth` (clave inválida), `rate_limit` (demasiadas peticiones), `quota` (sin saldo o cupo), `unavailable` (proveedor caído o sin respuesta a tiempo), `bad_output` (respuesta que no cumple el formato), `refused` (el proveedor rechazó la petición).
- El servidor **valida** siempre la salida con el mismo esquema, venga del proveedor que venga.

**Selección:** `AI_PROVIDER=claude|gemini|mistral|groq` y `AI_MODEL=<id>`. Cada proveedor lee **solo su** secreto (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`). Si falta la variable o el secreto del proveedor elegido, el servidor no arranca y lo dice.

**Protección del servidor:**
1. Código de acceso personal (cadena larga y aleatoria; secreto `ACCESS_CODE`, comparación en tiempo constante).
2. Solo peticiones desde el origen `https://joakil255.github.io` (complemento, no barrera).
3. Límite diario de mensajes (`DAILY_LIMIT`, por defecto **100**), contado en el servidor por fecha de Chile (`America/Santiago`) y guardado en Workers KV (clave por fecha, p. ej. `count:2026-11-23`). Al alcanzarlo, la app muestra en español que se llegó al límite de hoy.
4. Límite de gasto en la consola de cada proveedor que lo permita.

**Datos:** los mensajes del chat se envían al proveedor elegido; el usuario debe aprobarlo al aprobar esta etapa. La conversación se guarda solo en el teléfono (como el resto de la app) y no forma parte de la copia de seguridad salvo decisión posterior.

## Comparación de proveedores (documentación oficial, consultada el 23/11/2026)

| | **Claude (Anthropic)** | **Gemini (Google)** | **Mistral** | **Groq** |
|---|---|---|---|---|
| Precio por millón de piezas (entrada / salida) | Haiku 5.5: $0,10 / $0,50 · Sonnet 5.5: $2 / $10 · Opus 5.5: $4 / $20 — **verificado** | Gemini 3.5 Flash-Lite: $0,30 / $2,50 · Gemini 4 Carbon: $2 / $10 hasta el 30/11/2026, luego $4 / $20 — **verificado** | **No verificado** (la tabla de precios no se pudo leer; solo una cifra antigua en sus preguntas frecuentes) | **No verificado** (la página de precios no muestra modelos ni precios) |
| Plan gratuito | Créditos iniciales para probar; **cantidad no publicada** | Sí, en varios modelos Flash; **los modelos más capaces no** | **No verificado** para la API (el plan «Free» es de su app de chat) | **No verificado** |
| Límites | Nivel inicial: 4000 peticiones/min; tope de gasto de $500/mes que **puedes bajar** en la consola — **verificado** | Por proyecto, el diario se reinicia a medianoche del Pacífico; **cifras del plan gratuito para Flash no publicadas en la página** | **No verificado** (la página de niveles da error 404) | Ej. `openai/gpt-oss-20b`: 30 peticiones/min, 1000/día (plan Developer) — **parcial**; el resto, en la consola de la cuenta |
| ¿Entrenan con tus datos? | **No**, por defecto, en la API — verificado | Plan **gratuito: sí**, y **personas pueden leerlos**; plan de pago: no — verificado | **No**, salvo opciones, comentarios o modelos «Labs/Preview» — verificado (términos comerciales) | **No verificado** (la página no lo dice) |
| Conservación de datos | Se borran a los 30 días, con excepciones (abuso, retención cero) — verificado | Pago: registro «por un tiempo limitado» para detectar abusos — verificado (sin cifra) | **No verificado** | Por defecto **no se conservan**; hasta 30 días si hay abuso o fallos — verificado |
| Condiciones a tener en cuenta | — | **Mayores de 18**; uso «profesional o de negocio, no de consumo»; región disponible — verificado | — | Datos en EE. UU. — verificado |

**No pude verificar:** precios y límites de Mistral; precios, plan gratuito y uso para entrenamiento de Groq; cifras del plan gratuito de Gemini Flash; cantidad de créditos gratis y límites del nivel «Evaluation» de Claude. Se volverán a comprobar antes de usar cada proveedor.

**Recomendación para empezar: Claude**, porque es el único de los cuatro con **todo** verificado: precios, límites, tope de gasto ajustable y «no entrena con tus datos» por defecto. Empezar con **Claude Haiku 5.5** sería lo más barato (unos $0,40 al mes con 30 mensajes diarios); Sonnet 5.5 u Opus 5.5 cuestan más (unos $7 y $14 al mes). **La prueba de las 10 frases decide el modelo**, con datos y no con suposiciones. Gemini gratuito queda descartado para tus mensajes (los usan para entrenar y pueden leerlos personas); Gemini de pago es una alternativa válida.

## Prueba comparativa: 10 frases A1

`server/eval/frases-a1.json` + `server/eval/comparar.mjs`. Envía cada frase a cada proveedor configurado y genera una tabla: ¿encontró el error?, ¿la forma corregida es la esperada?, ¿explicó en español?, ¿inventó errores en las frases correctas? **Solo se ejecuta con permiso explícito** (cuesta dinero y envía las frases a cada proveedor) y con las claves en variables de entorno locales, nunca en archivos del repositorio.

| # | Frase del alumno | Corrección esperada | Qué pone a prueba |
|---|---|---|---|
| 1 | Je suis 20 ans. | J'ai 20 ans. | La edad se dice con *avoir* |
| 2 | Le maison est grande. | La maison est grande. | Género |
| 3 | Je habite à Santiago. | J'habite à Santiago. | Elisión |
| 4 | Nous allons à le marché. | Nous allons au marché. | Contracción *à + le* |
| 5 | Elle a deux chat. | Elle a deux chats. | Plural |
| 6 | Je mange un pomme. | Je mange une pomme. | Artículo y género |
| 7 | Ils est dans la cuisine. | Ils sont dans la cuisine. | Concordancia verbal |
| 8 | Je vais à la école. | Je vais à l'école. | Elisión con *la* |
| 9 | Il fait froid aujourd'hui. | (correcta) | Que no invente errores |
| 10 | Je ne mange pas de viande. | (correcta) | Que no invente errores |

## Pruebas automáticas (sin red y sin gastar)

- Contrato del adaptador para cada proveedor con un `fetch` falso: petición bien armada, respuesta normalizada, cada error del proveedor → error normalizado (401, 429, 5xx, tiempo agotado, salida inválida, rechazo).
- Servidor: sin código de acceso → 401; origen no permitido → 403; límite diario alcanzado → 429 con mensaje claro; cambio de día en Chile reinicia el contador; variable `AI_PROVIDER` desconocida o secreto ausente → no arranca.
- App: sin conexión → aviso «Necesitas conexión para conversar»; cada error normalizado → su mensaje del catálogo.
- Seguridad: la prueba existente se amplía para impedir claves con forma conocida (`sk-ant-`, `AIza`, `gsk_`…) en el repositorio.

## Decisiones tomadas

- **Proveedor y modelo inicial: Claude Haiku 5.5** (`claude-haiku-5-5`), elegido por el usuario («prefiero las IAs de Anthropic, solo Haiku para abaratar»). Precio verificado: $0,10 / $0,50 por millón de piezas; ≈ $0,36 al mes con 30 mensajes diarios. Esfuerzo propuesto: `low` (el razonamiento se paga como salida), a confirmar con la prueba de las 10 frases.
- Se descartaron por ahora Gemini (su plan gratuito usa los datos para entrenar y permite revisión humana), Mistral (precio verificado para Small 4, pero límites y conservación de datos sin verificar) y Ollama (privado y gratis, pero exige el computador encendido y corrige peor con la tarjeta disponible).

## Decisiones pendientes del usuario

1. ~~Proveedor inicial~~ → Claude Haiku 5.5. ~~Adaptador~~ → **se mantiene el adaptador intercambiable, con solo el de Claude implementado** (elegido por el usuario); Gemini, Mistral y Groq quedan como adaptadores futuros.
2. ~~Alojamiento~~ → **Cloudflare Workers + KV** (ver «Decisiones tomadas»).
3. Modelo inicial, tras la prueba de las 10 frases.
4. ~~Límite diario~~ → **100 mensajes** (ver «Decisiones tomadas»).
5. **Dependencias:** el adaptador de Claude usaría el SDK oficial `@anthropic-ai/sdk` (solo en el servidor). Para publicar el Worker: **Wrangler** (herramienta oficial de Cloudflare, solo de desarrollo); alternativa sin dependencia: pegar el código en el panel web de Cloudflare. Para Gemini, Mistral y Groq: SDK oficial de cada uno (`@google/genai`, `@mistralai/mistralai`, `groq-sdk`) o llamadas `fetch` directas sin dependencias. Cada dependencia necesita aprobación (CLAUDE.md).
6. Permiso para enviar los mensajes del chat (y las 10 frases de la prueba) al proveedor elegido.
- **Alojamiento: Cloudflare Workers, con el contador diario en Workers KV** (elegido por el usuario, 23/11/2026). Documentación oficial consultada ese día:
  - Plan gratuito de Workers: 100.000 peticiones al día; al pasarse devuelve un error (1027) y no cobra. 10 ms de CPU por petición (**por confirmar** que la espera a la respuesta del proveedor no cuenta como CPU).
  - KV gratuito: 100.000 lecturas y 1000 escrituras al día; al pasarse, la operación falla con error. Uso esperado: unas 100 escrituras al día.
  - No se pudo confirmar en esas páginas si la cuenta pide tarjeta, ni la consistencia de KV.
  - **Enfoques considerados:** (A) Workers + KV: el más simple; con mensajes casi simultáneos el contador podría contar uno de menos, un riesgo aceptable con un solo usuario y el tope de gasto de Anthropic. **Elegido.** (B) Workers + Durable Objects: contador exacto y también gratis, pero con más código y configuración para un caso que casi no ocurre. (C) Deno Deploy: **descartado**, porque cierra en abril de 2027 (aviso en su página de precios).
- **Límite diario: 100 mensajes** (elegido por el usuario: unos 20 minutos un día normal y hasta una hora un día con ganas). Gasto máximo estimado con Haiku 5.5: unos $1,20 al mes (≈ $0,0004 por mensaje).
