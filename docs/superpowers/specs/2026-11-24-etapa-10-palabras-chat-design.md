# Etapa 10 — Consultar y guardar palabras desde el chat: diseño (pendiente de aprobación)

> **Estado:** borrador para revisar. No hay código. Las decisiones las tomó el usuario el 24/11/2026, salvo las marcadas como **decisión del diseño** (propuestas que el usuario puede corregir).

## Intención

El usuario quiere **aprender vocabulario nuevo mientras conversa y repasarlo después** (sus palabras). En «Conversar», cada palabra de una respuesta de Claude se puede tocar para ver una tarjeta con:
- su traducción **en esa frase**;
- su forma base;
- su artículo y género, si los tiene;
- un botón para escucharla.

Desde la tarjeta se **guarda** en el vocabulario con la frase como ejemplo, sin duplicar formas de una palabra que ya tienes. En el chat se **subrayan** las palabras que ya están en tu vocabulario.

**Objetivos**
- Palabras tocables en las respuestas de Claude, con la tarjeta de consulta.
- Consulta por el servidor de la Etapa 8, con una ruta y un esquema nuevos, validada en el servidor.
- Guardar desde la tarjeta: la palabra entra sola al repaso espaciado.
- Evitar duplicados entre formas conjugadas o flexionadas y su forma base.
- Subrayar las palabras guardadas.
- Guardar en el teléfono las consultas ya hechas.
- Un modelo de datos preparado para estudiar otros idiomas en el futuro.
- Pruebas automáticas, sobre todo de duplicados y de la migración de las palabras existentes.

**No-objetivos**
- La interfaz para otros idiomas.
- Tocar palabras de tus propios mensajes.
- Consultar sin conexión algo que no esté en la caché.
- Editar la forma base a mano.
- Cambiar el algoritmo de repaso.
- Diccionarios o traductores distintos de Claude.

**Anti-objetivos (fracaso aunque funcione)**
- Perder o dañar palabras o tarjetas de repaso al migrar.
- Crear duplicados al guardar desde el chat.
- Mostrar como HTML algo que venga de Claude o del usuario.
- Que las consultas consuman los mensajes de conversación del día.
- Enviar datos a alguien que no sea Anthropic.
- Que la pantalla sea incómoda al tocar en el teléfono o inaccesible con teclado y lector de pantalla.

## Lo que se verificó

### Alternativas gratuitas (documentación oficial, consultada el 24/11/2026)

| Opción | ¿Traduce al español? | ¿Forma base y género? | ¿En el teléfono? | Datos y licencia |
|---|---|---|---|---|
| Traductor integrado de Chrome (Translator API) | Sí: `fr` y `es` están en su lista (el par fr→es solo se deduce del ejemplo es→fr) | No dice devolverlos | **No**: *«These APIs don't work on mobile devices»*. Chrome 138+ y Edge 148+ de escritorio; Firefox y Safari no | Traducción en el dispositivo. Crear el traductor exige un toque reciente; el tamaño de descarga no se publica |
| FreeDict francés-español | Sí, 52 659 entradas (versión 2025.11.23) | No dice | Habría que incluirlo en la app | Sin conexión. **Licencia no vista** |
| Lexique 4.10 | **No** | Forma base en 190 000 formas; el género no aparece en la página | Habría que incluirlo en la app | Sin conexión; CC BY-SA 4.0 (obliga a compartir igual) |
| kaikki.org (Wiktionary) | No queda claro (definiciones en inglés) | No detalla campos | Archivo de 565 MB, marcado como obsoleto | Licencia no indicada |

**Conclusión:** ninguna opción gratuita da la traducción **en contexto** en el teléfono. Por eso se usa Claude, dentro del permiso de datos ya dado (solo Anthropic).

**No se pudo verificar**
- La licencia de FreeDict francés-español y la de kaikki.
- Si Lexique incluye el género.
- La calidad del traductor de Chrome con palabras sueltas y el tamaño de su descarga.

### Cortar en palabras
- `Intl.Segmenter` está en Chrome desde la versión 87 (y Chrome para Android), en Firefox desde la 125 y en Safari desde la 14.1, según los datos de compatibilidad de MDN.
- Probado en Node 26:
  - «l'école» y «aujourd'hui» quedan enteras;
  - «Qu’est-ce» da «Qu’est» y «ce»;
  - «n’est-ce pas» da «n’est», «ce» y «pas».
- La app quita la parte elidida antes de consultar (ver «Palabras tocables»).

## Decisiones del usuario

1. Para qué: aprender vocabulario conversando y repasarlo después.
2. La tarjeta, el guardado, el subrayado, un **contador aparte de 200 consultas al día** y la caché de consultas, como se describen abajo. El usuario los aprobó como se los propuse.
3. **Modelo de datos, enfoque 1:** agregar campos sin renombrar.

## Enfoques considerados (modelo de datos)

| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **1. Agregar `lang` y `lemma` sin renombrar `fr` y `es`** | Los nombres quedan raros para otro idioma; la copia de seguridad acepta los campos nuevos | **Elegido.** Prepara el futuro sin romper nada; migración local y fácil de probar |
| 2. Renombrar a campos genéricos (`term`, `translation`…) | Tocar todas las pantallas, la copia de seguridad, el CSV y el mazo A1 | Descartado: mucho riesgo para un idioma que aún no existe |
| 3. Índice aparte de formas base | Dos fuentes de verdad; las palabras agregadas a mano quedan fuera; fuera de la copia de seguridad | Descartado |

También se descartó meter la consulta dentro de `/chat` con una bandera: complica la validación y el contador.

## Diseño

### Modelo de datos de las palabras (versión 2)
`app-frances` → `{ schemaVersion: 2, words: [...] }`. Cada palabra:

| Campo | Qué es |
|---|---|
| `id`, `fr`, `es`, `exampleFr`, `exampleEs`, `category`, `gender`, `needsReview`, `createdAt`, `updatedAt` | Igual que hoy. `fr` es la palabra **en el idioma que se estudia**, como se muestra, con su artículo si es sustantivo («la maison») |
| `lang` (nuevo) | Código del idioma estudiado. Hoy siempre `'fr'` |
| `lemma` (nuevo) | Forma base para detectar duplicados: sin artículo, en minúsculas, NFC, con apóstrofo recto («maison», «école», «manger»). Para una expresión, la expresión entera |

- El idioma propio (español) queda implícito. Agregar `nativeLang` se deja para cuando haga falta. **Decisión del diseño.**
- `lemmaOf(fr, gender)` (lógica pura):
  - normaliza como `normalizeFrenchWord`;
  - pasa a minúsculas;
  - **solo si la palabra tiene género** (es un sustantivo), quita **un** artículo inicial: `le `, `la `, `les `, `un `, `une `, `des ` o `l'`.
  - Sin género queda entera: «un peu», «la plupart», «des fois» y «s'appeler» no cambian.
  - **Regla invariable:** toda palabra guardada cumple `lemma === lemmaOf(fr, gender)`, venga de donde venga. Por eso la forma base se puede recalcular siempre (al migrar, restaurar, importar o editar en Vocabulario) y la copia de seguridad hace ida y vuelta idéntica. **Decisión del diseño** (tras la revisión del constructor).
- **Toda palabra nueva** sale con `lang` y `lemma`, venga del formulario, del mazo A1, de una importación, de una copia restaurada o del chat.
  - Siempre `lemma = lemmaOf(fr, gender)`. Desde el chat, `fr = baseWithArticle`, y el servidor garantiza que eso da el mismo `lemma` que devolvió la consulta.
- **Duplicados:**
  - El formulario, la importación y el mazo **no cambian**: siguen comparando `duplicateKey(fr)`. Así «le livre» y «la livre» se pueden tener las dos. **Decisión del diseño.**
  - **Guardar desde el chat** se bloquea si alguna palabra del mismo `lang` tiene el mismo `lemma` **o** la misma `duplicateKey(fr)`.

### Migración v1 → v2 (al abrir la app)
- Si el documento guardado tiene `schemaVersion` 1, o no la tiene, se migra **una vez**:
  1. se copia el texto original intacto en `app-frances-v1-<fecha ISO>`;
  2. a cada palabra se le agregan `lang: 'fr'` y `lemma: lemmaOf(fr, gender)`;
  3. se guarda con `schemaVersion: 2`.
- **Si guardar falla** (por ejemplo, sin espacio), la app sigue con los datos v1 en memoria, migrados solo en memoria, y muestra el aviso de almacenamiento. Lo guardado no cambia.
- Las tarjetas de repaso usan el `id` de la palabra, así que **no cambian**.
- La regla de datos dañados existente sigue igual.
- **Copia de seguridad:**
  - `BACKUP_VERSION` pasa a 2: las palabras incluyen `lang` y `lemma`.
  - Se siguen leyendo copias versión 1, migrando sus palabras al restaurar.
  - Una copia más nueva que 2 sigue dando el aviso «versión más nueva».
- **CSV:** no cambia; `lang` y `lemma` se calculan al importar.
- **Exportación JSON del vocabulario:** incluye `lang` y `lemma`. Al importar se aceptan los archivos con y sin ellos.

### Servidor: ruta `POST /lookup`
- Mismo Worker, mismo código de acceso, mismo control de origen y mismas cabeceras.
- **Cuerpo:** `{ lang: 'fr', word, sentence }`.
  - `lang` ∈ `['fr']`.
  - `word`: 1 a 40 letras, solo letras (incluidas las acentuadas), apóstrofo y guion.
  - `sentence`: 1 a 1000 letras, y debe contener `word` sin distinguir mayúsculas.
  - Si no cumple: 400 `invalid_input`.
- **Contador aparte:** clave KV `lookup:AAAA-MM-DD`, variable `LOOKUP_LIMIT=200`.
  - Se reserva antes de llamar al proveedor, como en el chat.
  - Al llegar al tope responde 429 `{ error: 'lookup_limit' }`.
  - **No** toca el contador de mensajes.
- **Adaptador:** el contrato suma `lookup({ lang, word, sentence })`. Claude lo implementa con salida estructurada (Haiku 5.5, esfuerzo `low`), con los mismos errores normalizados que `chat`.
- **Salida validada en el servidor:**
  `{ contextTranslation, lemma, lemmaTranslation, partOfSpeech, gender, baseWithArticle, sentenceTranslation }`
  - `partOfSpeech` ∈ `noun`, `proper_noun`, `verb`, `adjective`, `adverb`, `pronoun`, `article`, `preposition`, `conjunction`, `number`, `interjection`, `expression`, `other`.
  - `gender` ∈ `m`, `f`, `null`.
  - **Sustantivo (`noun`):**
    - exige `gender` (`m` o `f`) y un `baseWithArticle` que sea `le `, `la `, `les ` o `l'` seguido del `lemma`;
    - `le` exige `m` y `la` exige `f`;
    - con `l'` o `les` vale cualquiera de los dos. Así caben «l'école», «le héros» y los sustantivos que solo se usan en plural, como «les vacances» o «les gens».
  - **Nombre propio (`proper_noun`):** «Paris», «Marie». `gender: null` y `baseWithArticle` igual a la palabra con su mayúscula; el `lemma` va en minúsculas.
  - **Otros tipos:** `gender: null` y `baseWithArticle` igual al `lemma`. Una expresión («un peu») es su propio `lemma`.
  - El servidor solo normaliza el `lemma` (minúsculas, NFC, apóstrofo recto). **Nunca le quita artículos.** Comprueba que `lemmaOf(baseWithArticle, gender)` dé ese mismo `lemma`.
  - Si algo no cumple: `bad_output`.
- **Respuesta 200:** la salida más `remainingLookups`.
- **Instrucciones y prueba real:** las instrucciones de consulta se escriben y ajustan con una prueba real de 10 casos (`server/eval/`), con permiso, por menos de un centavo. Casos:

  | Palabra | Frase | Forma base esperada | Tipo | Qué pone a prueba |
  |---|---|---|---|---|
  | manges | Tu manges souvent ? | manger | verb | Verbo conjugado |
  | école | Je vais à l'école. | école («l'école», f) | noun | Sustantivo tras elisión |
  | chats | J'ai deux chats. | chat («le chat», m) | noun | Plural |
  | petite | une petite maison | petit | adjective | Adjetivo femenino |
  | vais | Je vais bien. | aller | verb | Verbo irregular |
  | au | Je vais au marché. | au | preposition | Contracción (se guarda «au», que traduce «al / a la») |
  | est | Qu'est-ce que c'est ? | être | verb | Verbo dentro de una expresión (se consulta la palabra, no la expresión) |
  | souvent | Tu manges souvent ? | souvent | adverb | Adverbio |
  | livre | Le livre est sur la table. | livre («le livre», m) | noun | Homógrafo: el contexto elige «el libro» |
  | vacances | Je suis en vacances. | vacances («les vacances», f) | noun | Sustantivo solo plural |

  **Criterio para publicar:** forma base y tipo correctos en al menos **9 de 10**, cero respuestas rechazadas por el esquema, y la traducción en contexto revisada a mano. Si no se cumple, se ajustan las instrucciones y se repite, hasta 3 veces; si sigue sin cumplirse, se le consulta al usuario antes de publicar. **Decisión del diseño** (tras la revisión del constructor).

  Costo estimado: unos $0,0001 por consulta; con 200 al día, unos $0,60 al mes como máximo.

### App: palabras tocables
- **Solo en las respuestas de Claude:**
  - el texto se corta con `Intl.Segmenter('fr', { granularity: 'word' })`;
  - cada segmento con `isWordLike` y al menos una letra es un `<button type="button">` con `textContent`;
  - espacios y puntuación quedan como texto.
  - Si el navegador no tiene `Intl.Segmenter`, no hay palabras tocables y el chat funciona igual.
- **Palabra que se consulta:** el segmento sin una parte elidida inicial (`l'`, `d'`, `j'`, `m'`, `t'`, `s'`, `n'`, `c'`, `qu'`, `jusqu'`, `lorsqu'`, `puisqu'`, con apóstrofo recto o tipográfico). «l'école» se consulta como «école»; «aujourd'hui» queda entero.
- **La frase** es la oración que contiene la palabra, obtenida con `Intl.Segmenter` en modo `sentence`.
- **Con «Escuchar primero»:** las palabras de una respuesta tapada se pueden tocar en cuanto se muestra el texto.
- **Botones táctiles grandes:** el área tocable crece con relleno sin mover el texto. El foco es visible y el nombre accesible es la palabra.

### App: la tarjeta
- Un `<dialog>` modal (en el teléfono, una hoja abajo), con `aria-labelledby` en la palabra.
- **Contenido:**
  - la palabra tocada → su traducción en la frase;
  - «Forma base: …» con su traducción y el tipo de palabra en español;
  - si es sustantivo, `baseWithArticle` y el género;
  - 🔊 «Escuchar»: lee `baseWithArticle` con `playFrench`;
  - **Guardar**, o «Ya está en tu vocabulario» desactivado.
- **Estados:**
  - «Buscando…» mientras llega la respuesta;
  - un error muestra su mensaje del catálogo;
  - sin conexión y sin caché: `chatOffline`.
- Se cierra con Escape, con «Cerrar» o tocando fuera. El foco vuelve a la palabra.
- **Con el micrófono escuchando,** abrir la tarjeta lo detiene (se reutiliza el aviso de la Etapa 9 antes de hablar).

### App: guardar
- **Guarda una palabra con:**
  - `lang: 'fr'`;
  - `fr = baseWithArticle`;
  - `es = lemmaTranslation`;
  - `lemma`;
  - `gender`;
  - `exampleFr` = la frase y `exampleEs = sentenceTranslation`, solo si la frase cabe en 200 letras; si no, la palabra se guarda sin ejemplo. **Decisión del diseño.**
  - `category: 'Conversación'` y `needsReview: false`.
- Pasa por la validación normal de palabras. Si falla, el error se muestra en la tarjeta.
- Tras guardar, el botón dice «Guardada» y el chat vuelve a subrayar.
- La palabra entra al repaso como cualquier palabra nueva. El algoritmo no cambia.

### App: subrayado
- Un botón-palabra se subraya, con un estilo que no depende solo del color, si su forma limpia en minúsculas **o** el `lemma` de su consulta en caché coincide con el `lemma` de alguna palabra del vocabulario.
- Para el lector de pantalla, el nombre accesible suma «, en tu vocabulario».
- Se recalcula al guardar, al abrir la pantalla y cuando otra pestaña cambia el vocabulario (evento `storage`).

### App: caché de consultas
- Clave `app-frances-lookups` → `{ schemaVersion: 1, entries: { [clave]: { result, usedAt } } }`.
- La clave es `lang|palabra en minúsculas|frase normalizada`.
- Guarda como máximo 500 entradas y descarta las de uso más antiguo. **Decisión del diseño.**
- Va fuera de la copia de seguridad.
- Si está dañada, empieza vacía. Si guardar falla, la consulta se muestra igual.

### Mensajes nuevos
- `lookup_limit`: «Llegaste al límite de consultas de hoy.» / «Puedes seguir conversando; las consultas se reinician a medianoche, hora de Chile.»
- Textos de la tarjeta: los exactos van en el plan.

## Pruebas automáticas (sin red y sin gastar)

**Duplicados**
- Guardar desde el chat «manges» cuando existe «manger» se bloquea por la forma base.
- «école» se bloquea cuando existe «l'école».
- Se respetan mayúsculas, acentos y el apóstrofo tipográfico.
- Las palabras de otro `lang` no chocan.
- El formulario sigue permitiendo «le livre» y «la livre».

**`lemmaOf`**
- Con género: cada artículo, y `l'` recto y tipográfico.
- Sin género: «un peu», «la plupart» y «s'appeler» quedan enteras.
- Texto vacío y NFC.
- La regla invariable `lemma === lemmaOf(fr, gender)` se cumple tras migrar, importar, restaurar, editar y guardar desde el chat.

**Migración**
- De v1 a v2 agrega `lang` y `lemma` sin cambiar ningún otro campo ni ningún `id`.
- Guarda la copia v1 intacta.
- No se repite si ya es v2.
- Funciona con 1000 palabras.
- Con almacenamiento que falla, lo guardado no cambia.
- Los datos dañados siguen la regla de siempre.
- Las tarjetas de repaso siguen apuntando a las mismas palabras.

**Copia de seguridad, importación y exportación**
- Una copia v1 se restaura migrada.
- La copia v2 hace ida y vuelta idéntica.
- El CSV y el JSON importados calculan `lemma`.

**Servidor**
- Validación de `/lookup`.
- Contador aparte: no toca el de mensajes y da 429 `lookup_limit` al llegar al tope.
- Normalización y rechazo de salidas inválidas (sustantivo sin género, artículo y género que no coinciden).
- Adaptador `lookup` con un `fetch` falso.

**App**
- Corte en palabras: elisión, «aujourd'hui», guiones, números, emoji y sin `Intl.Segmenter`.
- Frase que contiene la palabra.
- Caché: clave, tope de 500, datos dañados.
- Coincidencia del subrayado.
- El texto de Claude con `<script>` queda como texto.

**Recorrido:** a 360 y 1280 px, con teclado, y la prueba final en el teléfono.

## Límites conocidos
- En las palabras viejas que no son sustantivos, la forma base es la palabra tal como está escrita. Si alguna estaba conjugada («mange» en vez de «manger»), su duplicado no se detecta.
- Dos palabras distintas que se escriben igual («le livre» / «la livre») cuentan como duplicado al guardar desde el chat.
- La calidad de la traducción depende de Claude; la prueba de 10 casos la mide.

## Lo que queda para el plan
- Los textos exactos de la tarjeta.
- Las instrucciones de consulta, ajustadas con la prueba real.
- El diseño visual, con frontend-design y DESIGN.md.
- `CACHE_VERSION` y los archivos nuevos en la precarga.
- Volver a publicar el servidor, con confirmación.
