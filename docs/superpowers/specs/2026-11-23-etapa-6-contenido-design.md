# Etapa 6 — Contenido inicial A1: diseño

**Intención.** Ampliar las 60 palabras que la app carga la primera vez con **100 palabras A1 nuevas**, sin repetir ninguna, cada una con una frase de ejemplo corta. El usuario las añade cuando quiera desde Vocabulario con un botón que usa la importación de la Etapa 2. El contenido lo revisa el usuario: esta etapa **no lo declara validado**.

**Objetivos:** archivo `data/a1-deck.json` con 100 entradas en 6 categorías; botón «Añadir 100 palabras A1» en Vocabulario; comprobaciones automáticas (duplicados, campos, UTF-8, importación sin errores, reglas de contenido); documento de revisión con el número de entradas por categoría, la tabla completa y la lista de REVISAR con el motivo de cada duda.
**No-objetivos:** cambiar las 60 palabras iniciales o su carga automática; números a partir del 21; categorías Casa y Tiempo; audio grabado; traducciones a otras variantes del español; varios mazos o un catálogo de mazos.
**Anti-objetivos:** repetir una palabra de las 60; francés incorrecto o poco natural; traducciones de España donde en Chile se dice otra cosa («vosotros», «patata», «zumo», «coche»); declarar el contenido revisado; un archivo que la importación de la Etapa 2 rechace o marque con filas inválidas.

## Decisiones

| Tema | Decisión | Alternativas | Motivo |
|---|---|---|---|
| Relación con las 60 | **Amplía**: solo palabras nuevas — **elegido por el usuario** | Repetir y dejar que la importación las marque; sustituir la lista | Más vocabulario sin duplicados |
| Cómo se ofrece | Botón en Vocabulario que abre la ventana de importar de siempre — **elegido por el usuario** | Solo el archivo para Importar; pregunta al abrir la app por primera vez | Sin buscar archivos, funciona sin conexión y muestra qué se añadirá antes de hacerlo |
| Reparto | Saludos 12 · Números 21 (0–20) · Familia 12 · Comida 20 · Verbos 20 · Lugares 15 = **100** — **elegido por el usuario** | 17 por categoría | Las 60 ya cubren lo más frecuente de saludos y familia |
| Variante del español | **Español de Chile**; «tú» y «ustedes» (nunca «vosotros») — **elegido por el usuario** | Latinoamérica general; las dos formas | Es el español del usuario |
| Formato | **JSON con el formato de exportación de la app** (`format: 'app-frances-vocabulario'`, `version: 1`) — **elegido por el usuario** | CSV; módulo JS | Lo lee exactamente `readImport` de la Etapa 2; sin problemas de Excel con comas y acentos |
| Nombres de categoría | Los existentes («Saludos», «Familia», «Comida», «Verbos») y dos nuevos («Números», «Lugares») — decisión de Claude, aceptada | «Verbos básicos» | Se agrupan con las 60 en el filtro de Vocabulario |
| Documento de revisión | `docs/contenido/a1-deck.md`: conteo por categoría, tabla completa y lista REVISAR con motivos; una prueba comprueba que coincide con el JSON — decisión de Claude | Solo la lista REVISAR | El usuario revisa en un documento legible que no puede quedar desfasado |

## Reglas del contenido (cada una con prueba automática salvo las marcadas «revisión humana»)

Cada entrada del JSON tiene exactamente: `fr`, `es`, `exampleFr`, `exampleEs`, `category`, `gender`, `needsReview`.

1. **Campos completos:** `fr`, `es`, `exampleFr`, `exampleEs` y `category` no vacíos; `gender` es `'m'`, `'f'` o `null`; `needsReview` booleano.
2. **Sustantivos con artículo y género:** si `gender` no es `null`, `fr` empieza por `le`, `la`, `l'` o `les` (artículo definido, como la lista de 60) y el género concuerda (`le` → `m`, `la` → `f`; con `l'` y `les` el género se pone según la palabra). Todo sustantivo lleva género (revisión humana + la validación de la Etapa 2). Verbos, números, saludos y expresiones: `gender: null`, sin artículo.
3. **Verbos** en infinitivo (`venir`); el ejemplo usa una forma conjugada frecuente (presente). Prueba automática: los verbos terminan en `-er`, `-ir`, `-re` u `-oir`; que el ejemplo esté conjugado queda a revisión humana (con `aller + infinitivo` permitido, una prueba fallaría con frases correctas) — decisión de Claude tras la revisión.
4. **Ejemplo:** frase en francés de **3 a 7 palabras**. Se cuentan los trozos separados por espacios que tengan al menos una letra o cifra (la puntuación suelta como `?`, `!`, `«` no cuenta; `J'ai`, `qu'est-ce` y `aujourd'hui` cuentan como una). Empieza en mayúscula y termina en `.`, `!` o `?`. Tipografía francesa: espacio antes de `?` y `!` (como en la lista de 60) y apóstrofo recto `'`. La traducción española es natural en Chile, no palabra por palabra.
5. **Nivel A1:** vocabulario muy frecuente; las frases solo usan presente (y, si hace falta, el futuro próximo `aller + infinitivo`) y vocabulario A1 (revisión humana).
6. **Español de Chile:** papa, jugo, auto, durazno, palta, frutilla, porotos, departamento…; «tú» y «ustedes». Las traducciones con varias opciones frecuentes se separan con coma, como en la lista de 60 («la hija, la chica»). Prueba automática con una lista de formas de España prohibidas en `es` y `exampleEs` (palabras completas): vosotros, vosotras, patata, zumo, coche, fresa, melocotón, aguacate, judías, piso, ordenador, móvil, gafas; además, que no aparezcan las terminaciones de «vosotros» más comunes (`-áis`, `-éis`) — decisión de Claude tras la revisión. El resto de la naturalidad en Chile es revisión humana.
7. **Sin duplicados**, comparando el francés con `duplicateKey` de la Etapa 2 (sin mayúsculas ni espacios de más; los acentos cuentan): ninguno dentro del mazo y **ninguno con las 60** de `js/data/initial-words.js`.
7b. **Qué es repetir** (revisión humana; **elegido por el usuario**): se permiten expresiones con **su propio uso** aunque compartan una palabra con las 60 («s'il te plaît», informal frente a «s'il vous plaît»; «à demain»; «bonne journée»; «les grands-parents»). No se permite lo que solo **intensifica o cambia la forma** de una de las 60 («merci beaucoup», «ça va bien», «le parent», «bonne soirée» frente a «bonsoir»). Las palabras con forma masculina y femenina van como **dos entradas** con su género («le cousin» y «la cousine»), igual que «le frère» y «la sœur» — **aprobado por el usuario**.
8. **Cantidades exactas** por categoría (tabla de arriba) y total 100.
9. **UTF-8 correcto:** el archivo se lee como UTF-8 sin `U+FFFD`, sin BOM, todo el texto en forma **NFC** (las letras acentuadas en un solo carácter), sin espacios dobles ni al principio o final de un campo, y sin `’` (se usa `'`).
10. **Se importa sin errores:** `readImport(texto, 'a1-deck.json')` sin `fatal`, y `planImport(filas, [])` da **100 nuevas, 0 duplicadas y 0 inválidas**; contra las 60 iniciales da **100 nuevas y 0 duplicadas**.
11. **REVISAR:** toda entrada de la que no haya total seguridad (traducción que cambia en Chile, uso poco claro, frase dudosa) lleva `needsReview: true`, y su motivo está en la lista REVISAR del documento de revisión. Prueba: el conjunto de entradas con `needsReview: true` es **igual** al de la lista REVISAR.
12. **Nada del contenido se declara validado:** el documento y el informe dicen «Pendiente de revisión del usuario» (prueba: el documento contiene esa frase).

## Archivos

- `data/a1-deck.json` (nuevo): `{ "format": "app-frances-vocabulario", "version": 1, "exportedAt": "<fecha ISO de creación>", "words": [...] }`, ordenado por categoría en el orden de la tabla y, dentro, en un orden de estudio razonable (los números de 0 a 20 en orden). JSON con sangría de 2 espacios, UTF-8 sin BOM, salto de línea final.
- `docs/contenido/a1-deck.md` (nuevo): estado «Pendiente de revisión del usuario»; tabla «Entradas por categoría»; una tabla por categoría con columnas `Francés | Español | Género | Ejemplo | Traducción | REVISAR`; sección «Lista REVISAR» con `Francés | Motivo`.
- `js/lib/deck.js` (nuevo): `A1_DECK_URL = 'data/a1-deck.json'`, `A1_DECK_NAME = '100 palabras A1'` y `loadDeck(fetchImpl, url)`: descarga el archivo y devuelve lo mismo que `readImport`; si la red falla o la respuesta no es correcta (`!response.ok`), devuelve `{ fatal: 'No se pudo cargar el mazo. Conéctate a internet una vez y vuelve a intentarlo.', rows: [], ignoredColumns: [] }`.
- `js/screens/vocabulary.js`, `index.html`: botón secundario **«Añadir 100 palabras A1»** junto a Importar y Exportar. Al pulsarlo: `loadDeck` → si hay `fatal`, aviso en `#vocab-notice`; si no, `planImport` contra la lista actual y la **misma ventana** de importar, con el título «Revisión de «100 palabras A1»». Importar, reemplazar y cancelar funcionan igual que con un archivo. El foco vuelve al botón que abrió la ventana. El botón está siempre visible: si ya se añadió, la ventana dice «0 palabras nuevas para importar · 100 ya existen en tu lista» y no ofrece importar.
- `sw.js`: `CACHE_VERSION = 'v12'` y `data/a1-deck.json` en `PRECACHE_URLS` (funciona sin conexión). La prueba de completitud de la caché pasa a incluir la carpeta `data/`.
- `README.md`: qué es el mazo, cómo añadirlo, que el contenido está pendiente de revisión y el enlace al documento de revisión; pasos para comprobarlo en el celular.
- `DESIGN.md`: el botón usa el estilo secundario existente; se anota en la sección de Vocabulario (se aplica la skill frontend-design al colocarlo).

## Pruebas (`tests/a1-deck.test.js`, `tests/deck.test.js`)

TDD: las pruebas de las reglas 1–4, 6 (lista de formas de España) y 7–12 se escriben **antes** del contenido, se ven fallar (el archivo no existe) y luego se escribe el contenido hasta que pasan. Casos límite de `loadDeck`: red caída (el `fetch` falso lanza), respuesta 404, respuesta correcta con el JSON → mismas filas que `readImport`. Caso de UTF-8: una prueba de la propia comprobación con un texto con `U+FFFD` y otro con `e` + acento combinado (forma NFD) que deben detectarse.

## Verificación

- `npm test` y `npm run lint`.
- En el navegador (Firefox sin ventana, como en etapas anteriores): pulsar el botón con la lista inicial → «100 palabras nuevas para importar · 0 ya existen · 0 filas con errores»; importar → la lista pasa de 60 a 160 y aparecen «Números» y «Lugares» en el filtro; volver a pulsarlo → «0 nuevas · 100 ya existen»; sin conexión (tras la primera carga) el botón sigue funcionando; con el archivo no disponible → aviso.
- Importar `data/a1-deck.json` a mano con **Importar** da el mismo resumen.

## Riesgos y límites

1. Algunas traducciones al español de Chile pueden no ser las más usadas: van con REVISAR y el usuario decide.
2. La regla de 3 a 7 palabras y la de campos se comprueban solas; la corrección y naturalidad del francés **no**: solo la revisión humana la confirma.
3. La importación compara con la lista **actual** del usuario: si él ya añadió a mano una palabra del mazo, la ventana la muestra como «ya existe» y no la duplica.
4. Pulsar «Reemplazar» tras haber editado palabras del mazo sobrescribe esas ediciones (comportamiento de la Etapa 2, avisado en su ventana).
