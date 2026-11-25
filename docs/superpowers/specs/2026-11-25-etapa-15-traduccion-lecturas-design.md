# Etapa 15 — Traducción en Leer: diseño

> **Estado:** borrador para aprobar. No hay código. Las decisiones las tomó el usuario el 25/11/2026, salvo las marcadas como **decisión del diseño** (propuestas que el usuario puede corregir).

## Intención

Mientras lee una historia, el usuario **no está seguro de estar entendiendo y quiere poder comprobarlo** (sus palabras). La traducción sirve para **confirmar frase por frase**, no para leer en español: lee en francés, cree que entendió y toca para confirmar.

Depende de la Etapa 11 (Leer, `/story`, almacén de textos, cuestionario) y de la Etapa 10 (tarjeta de palabras).

**Objetivos** (los 7 requisitos del usuario)
1. Cada historia nueva se genera como **frases emparejadas francés-idioma de apoyo en una sola petición**, con salida estructurada y validada en el servidor.
2. La traducción está **oculta por defecto** y se revela por frase con un toque. Un ajuste global **«Mostrar traducción siempre»** se recuerda.
3. La traducción **se guarda con la historia** y funciona sin conexión.
4. Las historias ya guardadas sin traducción muestran **«Generar traducción»**.
5. El flujo **REVISAR/Aprobar cubre ambos idiomas**.
6. Compatible con el **toque de palabra** y con el **audio**.
7. El modelo de datos **no asume que el idioma de apoyo es español**.

Además: estimación de costo, lista de lo no verificado y pruebas automáticas.

**No-objetivos**
- Leer la historia completa en español o escucharla en español.
- Traducir las preguntas del cuestionario o la tarjeta de palabras (ya tienen su idioma).
- Elegir otro idioma de apoyo en la interfaz: hoy solo existe `es`; el modelo de datos lo permite, la pantalla no lo ofrece.
- Editar la traducción a mano.
- Registrar qué frases revelaste.

**Anti-objetivos (fracaso aunque funcione)**
- Que una frase francesa quede con la traducción de otra (desalineación).
- Que el cuestionario se pueda contestar mirando la traducción.
- Que la traducción tape o estorbe el toque de palabra.
- Que una traducción sin revisar parezca revisada.
- Que la app vieja instalada en el teléfono deje de poder generar historias cuando se publique el servidor nuevo.

## Restricciones
- Sin dependencias nuevas.
- Todo texto de Claude se pinta con `textContent`.
- Claves solo en el servidor (Cloudflare Worker), modelo `claude-haiku-5-5`, esfuerzo `low`, como hoy.
- Accesible y mobile-first (DESIGN.md, skill frontend-design): botones táctiles grandes, foco visible, contraste.
- Funciona sin conexión después de la primera carga; solo generar historias o traducciones necesita red.

## Enfoques considerados

| Enfoque | Qué implica | Resultado |
|---|---|---|
| **A. El servidor entrega las frases ya emparejadas** `sentences: [{ text, translation }]` y arma el `body` uniéndolas | El lector usa la lista guardada y nunca vuelve a partir el texto | **Elegido** (el usuario lo aprobó el 25/11/2026) |
| B. Mantener `body` y pedir la traducción como un bloque aparte alineado después | El servidor cuenta frases con una regla (regex) y la app parte con otra (`Intl.Segmenter`): se desalinearía | Descartado |
| C. Generar la historia y traducirla en una segunda petición | Contradice el requisito 1 y paga dos veces la entrada | Descartado |

Para las historias viejas, `/translate` tiene **un límite propio de 10 al día** (opción A del usuario), no comparte el de 5 historias.

## Decisiones del usuario (25/11/2026)
- Traducción oculta por defecto; botón **«Ver traducción»** debajo de cada frase; volver a tocar la oculta.
- Ajuste **«Mostrar traducción siempre»** arriba del texto, recordado en el navegador.
- **Durante el cuestionario se ocultan todas las traducciones y se desactivan el botón por frase y el ajuste**; al terminar (o al salir) vuelven según el ajuste.
- El enfoque A y el límite propio de 10 `/translate` al día.
- La traducción tiene su propia marca REVISAR cuando se genera para una historia ya aprobada (propuesta aceptada con el diseño).

## Modelo de datos

Campos nuevos y **opcionales** en cada texto (las historias viejas no los tienen y siguen siendo válidas):

```js
{
  // …campos de hoy (id, lang, title, body, level, status, quiz, …)
  sentences: ['Léa habite à Lyon.', 'Le matin, elle prend le bus.', …],  // frases en el idioma del texto
  translation: {
    lang: 'es',                // idioma de apoyo; lista permitida SUPPORT_LANGS = ['es']
    status: 'review',          // 'review' | 'approved', independiente de text.status
    sentences: ['Léa vive en Lyon.', 'Por la mañana, toma el bus.', …],  // mismo largo que text.sentences
  },
}
```

- `sentences` puede existir sin `translation` (no ocurre hoy, pero se permite); `translation` exige `sentences`.
- **Validación (`validateText`)**, decisión del diseño:
  - `sentences`: arreglo de 1 a 60 cadenas no vacías de hasta 600 letras; **al unirlas y quitar todos los espacios** deben dar el `body` sin espacios (tras `normalize('NFC')`). Así la evidencia del cuestionario sigue valiendo, no se cuela texto distinto, y no falla cuando el texto viejo no tiene espacio entre frases («fin.Début»).
  - `translation.lang` en `SUPPORT_LANGS`; `translation.status` en `['review', 'approved']`; `translation.sentences` del mismo largo que `sentences`, cadenas no vacías de hasta 600 letras.
- **Nombre del idioma:** `translation.lang` indica el idioma; la pantalla pone `lang="es"` (o el que sea) en cada traducción, para lectores de pantalla.

### Aprobar y REVISAR
- Historia nueva: `status: 'review'` y `translation.status: 'review'`. **«Aprobar» aprueba las dos.** «Descartar» borra la historia como hoy.
- Historia ya aprobada a la que se le genera la traducción: `translation.status: 'review'`. Junto al ajuste aparece la marca REVISAR con **«Aprobar traducción»** y **«Descartar traducción»** (borra solo la traducción y vuelve a mostrar «Generar traducción»). Decisión del diseño.
- Historia en REVISAR a la que se le genera la traducción: «Aprobar» sigue aprobando las dos.
- **Dónde se ve que la traducción no está revisada** (decisión del diseño, tras la revisión del constructor): en la biblioteca, la marca REVISAR aparece si `status === 'review'` **o** `translation.status === 'review'`; en el lector, junto al ajuste. Las traducciones reveladas no llevan marca propia, para no recargar cada renglón.
- Métodos nuevos del almacén: `approve(id)` también aprueba la traducción si existe; `addTranslation(id, { sentences, translation })`, `approveTranslation(id)`, `discardTranslation(id)`.

### Ajuste del lector
- Se guarda en `app-frances-reader` (la clave que ya guarda `quizLang`): `{ quizLang, showTranslation }`. **Hoy `saveQuizLang` sobrescribe el objeto entero: debe pasar a mezclar los campos**, para que guardar uno no borre el otro.
- Si `localStorage` falla, no se recuerda y queda oculto (valor por defecto `false`).
- No entra en la copia de seguridad, igual que los ajustes de voz.

### Copia de seguridad
- Sube a la **versión 6**: los textos pueden traer `sentences` y `translation`. Restaurar v1–v5 sigue funcionando (sus textos no traen esos campos y son válidos). Una app más vieja rechaza la v6 por «más nueva», como ya hace.

## Servidor

### `/story` (cambia)
- Entrada: se agrega `supportLang` **opcional** (`'es'` por defecto). Opcional para que **la app vieja que ya está en el teléfono siga funcionando** cuando se publique el servidor nuevo.
- Esquema de salida (`STORY_SCHEMA`): `title`, `sentences: [{ text, translation }]`, `questions` (igual que hoy). Ya no se pide `body` al modelo.
- `normalizeStory`:
  - cada `text` y `translation` es texto no vacío y sin HTML ni Markdown (`HAS_MARKUP`);
  - entre 4 y 60 frases; cada traducción de hasta 600 letras;
  - `body = sentences.map(s => s.text).join(' ')`; sobre ese `body` se aplican las reglas de hoy (80–300 palabras, máximo 3000 letras) y la evidencia del cuestionario;
  - si algo no cumple, `bad_output` como hoy.
- Respuesta: `{ title, body, sentences, questions, remainingStories }`. **Se sigue enviando `body`** para la app vieja; la app nueva usa `sentences`.
- Instrucciones (`STORY_INSTRUCTIONS`): cada elemento de `sentences` es **una sola frase**, en orden; `translation` es su traducción natural y fiel al {idioma de apoyo}, sin explicaciones ni notas. El idioma de apoyo entra como dato (`{supportLangName}`), no fijo en español.

### `/translate` (nuevo)
- Entrada: `{ lang: 'fr', supportLang: 'es', level, sentences: string[] }`; de 1 a 60 frases, cada una de hasta 600 letras, sin saltos de línea; `level` en la lista de niveles.
- Salida del modelo: `{ translations: string[] }`. **El servidor exige el mismo número de traducciones que de frases**, no vacías, sin HTML ni Markdown, de hasta 600 letras cada una; si no, `bad_output`.
- Contador aparte `translate:` con `TRANSLATE_LIMIT = 10` (nueva variable en `wrangler.jsonc` y en `readConfig`). El 11.º del día da 429 `translate_limit`. No toca `count:`, `lookup:`, `story:` ni `sentence:`.
- Mismo código de acceso, CORS y manejo de errores que las otras rutas.
- Respuesta: `{ translations, remainingTranslations }`.

### Orden de publicación
1. Publicar el servidor (acepta la app vieja y la nueva).
2. Publicar la app con `CACHE_VERSION` subido (en `main` hoy `v25` → `v26`) y los archivos nuevos en la precarga si los hay.

Ambas publicaciones piden confirmación al usuario.

## App

### Generar
- **Historia nueva:** `textFromStory` guarda `sentences` (los `text`) y `translation` (`lang: 'es'`, `status: 'review'`, las `translation`).
- **Historia vieja:** en el lugar del ajuste aparece **«Generar traducción»**. Al tocarlo, la app parte el `body` con `splitSentences` (como hoy), envía esa lista a `/translate` y guarda `sentences` + `translation` con `addTranslation`. **Antes de enviar**, la app comprueba con las mismas reglas que `validateText` (1 a 60 frases, cada una de hasta 600 letras, reconstrucción del `body`); si no cumple (por ejemplo, un navegador sin `Intl.Segmenter` deja todo el texto como una frase), en lugar del botón se lee «Esta historia no se puede traducir frase por frase.» y no se gasta ninguna de las 10 traducciones del día. Decisión del diseño, tras la revisión del constructor. Sin conexión, el botón explica que necesita internet (mensaje de los que ya existen para `/story`). Mientras espera, el botón queda ocupado y no se puede tocar dos veces.
- Mensaje nuevo `translate_limit`: «Llegaste al límite de traducciones de hoy.» / «Puedes leer tus historias; el límite se reinicia a medianoche, hora de Chile.»

### Lector
```
 [ ] Mostrar traducción siempre   REVISAR (si toca)
 ▶ Léa habite à Lyon avec sa sœur.        ← tocar una palabra: tarjeta
   [ Ver traducción ]                     ← botón táctil grande
 ▶ Le matin, elle prend le bus.
   Por la mañana, toma el bus.            ← ya revelada
```
- El lector usa `text.sentences` si existe; si no, `splitSentences(text.body)` como hoy.
- Debajo de cada frase, **un botón aparte** «Ver traducción» (con `aria-expanded` y `aria-controls`). Al revelarse, la traducción aparece en su lugar con otro estilo y `lang` del idioma de apoyo; se oculta al tocarla de nuevo. Va aparte para no chocar con los botones de palabra.
- El ajuste es una casilla con etiqueta. Activado: todas visibles y los botones por frase se ocultan; desactivado: todas ocultas.
- **Toque de palabra:** sin cambios; la traducción no tiene botones de palabra (la tarjeta es para francés). `wordCard.refresh(textEl)` sigue subrayando solo el francés (las traducciones no llevan `data-word`).
- **Audio:** el reproductor recibe solo las frases francesas, como hoy. El resaltado de la frase que suena abarca su fila, incluida la traducción si está visible.
- **Cuestionario (opción A del usuario):** al empezar, se ocultan todas las traducciones y se desactivan el ajuste y los botones por frase; al terminar, al repetirlo o al salir de la historia, vuelven según el ajuste. La evidencia se sigue resaltando en la frase francesa.

### Diseño visual
Lo decide el plan con frontend-design y DESIGN.md: estilo de la traducción (distinto del francés, contraste suficiente en claro y oscuro), tamaño del botón y medición a 360 px.

## Costo estimado (sin medir)

Precio de `claude-haiku-5-5` (tabla de la skill claude-api, actualizada el 03/11/2026): **0,10 USD por millón de tokens de entrada y 0,50 USD por millón de salida.**

| Caso | Tokens extra (estimados) | Costo extra |
|---|---|---|
| Historia nueva con traducción | +450 a 550 de salida (unas 20 frases en español más la estructura de pares); +~60 de entrada por las instrucciones | **≈ +0,0003 USD** (entre un 25 y un 40 % más que hoy) |
| Traducir una historia vieja | ~700 de entrada (instrucciones + frases) y ~500 de salida, más lo que piense el modelo | **≈ 0,0003 a 0,0005 USD** |
| Peor mes (5 historias y 10 traducciones al día, 30 días) | — | **≈ 0,05 + 0,15 = 0,20 USD** |

Es una estimación hecha a mano. Se mide en la prueba real (abajo) con `usage` de la respuesta.

## Pruebas automáticas (sin red y sin gastar)

**Almacén y validación (`texts.js`)**
- `validateText` acepta un texto sin `sentences` ni `translation` (historias viejas).
- Acepta uno con ambos; rechaza: `translation` sin `sentences`; largos distintos; frase vacía; `lang` no permitido; `status` no permitido; `sentences` que no reconstruyen el `body`; traducción de más de 600 letras.
- Acentos y apóstrofos tipográficos («l’école», «ç», «é») en `sentences` y `body` no rompen la reconstrucción; espacios dobles o saltos de línea en el `body` viejo tampoco.
- Datos grandes: 60 frases pasan, 61 no.
- `approve` aprueba también la traducción; `addTranslation`, `approveTranslation` y `discardTranslation` guardan y, si falla la escritura, no cambian la memoria.

**Copia de seguridad**
- v6 hace ida y vuelta con `sentences` y `translation`.
- Restaurar v5 (sin traducciones) sigue funcionando.
- Una traducción inválida marca la copia como dañada.

**Ajuste del lector**
- Guardar `showTranslation` no borra `quizLang` y al revés; `localStorage` que lanza da `false` sin romper.

**App (lógica pura)**
- `textFromStory` arma `sentences` y `translation` desde los pares, recortando bordes.
- `sendStory` acepta la respuesta nueva; `sendTranslation` (nuevo, `story.js` o `translate.js`) valida que `translations` tenga el largo pedido y no lanza nunca.
- La elección de frases del lector: con `sentences` usa esas; sin ellas, `splitSentences`.
- Un texto vacío o de una frase.
- Sin conexión: «Generar traducción» no llama a `fetch`.
- Historia vieja que no se puede partir bien (una sola frase de más de 600 letras, más de 60 frases): no llama a `fetch` y da el estado «no se puede traducir».
- «fin.Début» (sin espacio entre frases) se reconstruye y valida.
- La biblioteca marca REVISAR una historia aprobada con traducción en revisión.

**Servidor**
- `validateStoryInput`: `supportLang` ausente → `es`; uno no permitido → rechazo.
- `normalizeStory`: pares válidos dan `body` unido; rechaza traducción vacía, con HTML o Markdown, menos de 4 frases, más de 60, `body` fuera de 80–300 palabras, evidencia que no está en el `body` unido.
- `validateTranslateInput`: vacío, 61 frases, frase con salto de línea, frase de 601 letras, nivel o idioma no permitido.
- Normalización de `/translate`: largo distinto al pedido → `bad_output`; traducción vacía o con HTML → `bad_output`.
- Contador `translate:`: el 11.º da 429 `translate_limit` y no toca los otros contadores.
- `readConfig` exige `TRANSLATE_LIMIT`.
- Adaptador con `fetch` falso para `story` (esquema nuevo) y `translate`.
- La respuesta de `/story` incluye `body` (compatibilidad con la app vieja).

**Seguridad:** los archivos nuevos entran en la prueba que prohíbe `innerHTML`.

**Recorrido** a 360 y 1280 px, en claro y oscuro, con un servidor falso, entrando desde Inicio con toques (no por URL): revelar una frase, activar el ajuste, recargar y ver que se recuerda, hacer el cuestionario y ver que se ocultan, escuchar con traducciones visibles, tocar una palabra, generar la traducción de una historia vieja, aprobarla, y todo de nuevo sin conexión. Prueba final en el teléfono.

**Prueba real** (con permiso del usuario, cuesta menos de un centavo): 3 historias nuevas y 2 traducciones de historias viejas con `server/eval/compare-story.mjs` ampliado. Se anotan los tokens reales para corregir la estimación de costo, y el usuario revisa a mano la calidad de las traducciones.

## Lo que no se pudo verificar en el diseño
- **El costo real:** la tabla es una estimación; los tokens que gasta el modelo pensando con esfuerzo `low` no se conocen hasta medirlos.
- **La calidad de las traducciones:** las escribe Claude; por eso quedan REVISAR hasta que el usuario las aprueba.
- **Que Haiku respete «una frase por elemento»:** el servidor valida la cantidad y el contenido, no que cada elemento sea exactamente una frase (las abreviaturas como «M.» harían fallar una regla estricta). Si junta dos frases en un elemento, la alineación sigue siendo correcta, pero ese renglón es más largo.
- **Con qué frecuencia Haiku devuelve un número distinto de traducciones** en `/translate`: si pasa, el usuario ve el error de «salida no válida» y puede reintentar. Se mide en la prueba real.
- **El precio:** viene de la tabla de la skill (03/11/2026), no de la página de precios del día.

## Lo que queda para el plan
- Los textos exactos de botones y mensajes, y las instrucciones del modelo para `/translate`.
- El diseño visual con frontend-design y DESIGN.md.
- `CACHE_VERSION` y la precarga.
- Si `sendTranslation` va en `story.js` o en un archivo nuevo.
- Volver a publicar el servidor y la app, con confirmación.
