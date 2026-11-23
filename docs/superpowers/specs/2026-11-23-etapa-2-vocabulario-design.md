# Etapa 2 — Vocabulario: diseño

**Intención.** La pantalla Vocabulario pasa a ser la lista de palabras del usuario: verlas, escucharlas, crearlas, editarlas, borrarlas, buscarlas, e importarlas o exportarlas sin perder datos. Es la base de la que tirarán Estudiar y Quiz.
**No-objetivos:** estudio, repaso, tarjetas, historial, configuración, sincronización. **Anti-objetivos:** perder o sobrescribir palabras sin que el usuario lo confirme; mostrar texto del usuario como HTML; depender de internet.

## Decisiones

| Tema | Decisión | Alternativa | Motivo |
|---|---|---|---|
| Lista inicial | ~60 palabras A1 que se cargan una vez y pasan a ser del usuario — **elegida por el usuario** | Lista fija aparte; posponerla | Una sola lista editable |
| Ejemplo | Opcional; si hay una frase, la otra es obligatoria — **elegida** | Obligatorio | Añadir rápido sin frases a medias |
| CSV | Lector/escritor propio (RFC 4180) — **elegida** | PapaParse | Sin dependencias; las pruebas son obligatorias igual |
| Guardado | `localStorage` tras una capa asíncrona (`js/lib/storage.js`) — **elegida** | IndexedDB | Lo aprobado en la Etapa 0; cambiar luego = un archivo |
| Pantalla | Lista + ventanas `<dialog>` — **elegida** | Subpantallas con dirección | Foco, `Esc` y «atrás» nativos; el router no cambia |
| Fila | Un botón **Oír** + ficha con lento, ejemplo, editar y borrar (opción B) — **elegida** | Dos botones por fila | Más espacio para el texto a 360 px |
| Velocidades | normal `rate = 1`, lenta `rate = 0.6` | Ajustable | Decisión de Claude; ajustable en la etapa de configuración |

## Datos

- **Palabra:** `{ id, fr, es, exampleFr, exampleEs, category, gender, needsReview, createdAt, updatedAt }`. `gender`: `"m" | "f" | null`; `category`: texto o `""`; ejemplos: texto o `""`; fechas ISO. `id`: `crypto.randomUUID()`; las de la lista inicial, `seed-<palabra>` fijo. Se quitan `type` y `source` del modelo de la Etapa 0 (no se pidieron).
- **Guardado:** clave `app-frances` con `{ schemaVersion: 1, words: [...] }`. Si la clave no existe, se escribe con la lista inicial (una sola vez: si luego se borran todas, no vuelve). Si existe pero no se puede leer (JSON dañado), se copia tal cual a la clave `app-frances-corrupt-<fecha ISO>`, se empieza con la lista vacía y se muestra un aviso: nunca se pierde el contenido en silencio. Si el navegador no deja guardar (cuota o bloqueo), la operación falla con un aviso y la lista queda como estaba.
- **Lista inicial** (`js/data/initial-words.js`, escrita por Claude): 60 palabras A1 frecuentes, 10 por categoría: Saludos, Familia, Casa, Comida, Tiempo y Verbos. Sustantivos con artículo y género; saludos y verbos sin género; cada una con frase de ejemplo corta y su traducción. Lo que no sea seguro lleva `needsReview: true`.
- **Capa de datos** (`createWordStore(backend)`, todo devuelve promesas): `listWords()`, `saveWord(word)` (crea o actualiza), `deleteWord(id)`, `applyImport(plan, { replaceDuplicates })`. `backend` es `localStorage` en la app y un objeto falso en las pruebas.

## Reglas

- **Normalización al guardar:** recortar espacios, juntar espacios repetidos, Unicode NFC. Se guarda lo que el usuario escribió (sin cambiar mayúsculas ni apóstrofos).
- **Validación:** `fr` y `es` obligatorios; máximo 200 caracteres por campo; si hay `exampleFr` o `exampleEs`, los dos; `gender` `m`, `f` o vacío. Si hay género, `fr` debe empezar por artículo (`le`, `la`, `l'`/`l’`, `les`, `un`, `une`, `des`), y `le`/`un` no pueden ir con femenino ni `la`/`une` con masculino. Cada error dice qué falta y cómo arreglarlo («Falta la traducción del ejemplo.», ««la» es femenino: cambia el género o el artículo.»).
- **Duplicada:** mismo `fr` tras normalizar, sin distinguir mayúsculas y con `’` igual a `'`. Los acentos cuentan (*a* ≠ *à*). No se puede crear ni editar una palabra para que quede duplicada.
- **Búsqueda:** en `fr` y `es`, sin mayúsculas ni acentos («etre» → *être*). **Filtros:** categoría (todas, cada categoría existente, «Sin categoría») y género (todos, masculino, femenino, sin género). **Orden:** alfabético francés ignorando el artículo (*la maison* va en la M). El contador dice «3 de 62 palabras» (`role="status"`).

## Importar y exportar

- **Exportar** siempre todas las palabras. JSON: `{ "format": "app-frances-vocabulario", "version": 1, "exportedAt", "words": [{ fr, es, exampleFr, exampleEs, category, gender, needsReview }] }`. CSV: UTF-8 con BOM, separador `,`, fin de línea `\r\n`, cabecera `frances,espanol,ejemplo_frances,ejemplo_espanol,categoria,genero,revisar`, comillas cuando el campo tiene `,` `;` `"` o salto de línea (comillas internas duplicadas), `genero` = `m`/`f`/vacío, `revisar` = `si`/vacío. Contra fórmulas en hojas de cálculo: un campo que empieza por `=`, `+`, `-` o `@` se exporta con `'` delante, y la importación quita ese `'`. Nombre: `vocabulario-AAAA-MM-DD.json|csv`.
- **Importar** `.json` o `.csv` de hasta 2 MB (por la extensión del nombre; otra extensión se rechaza: «Solo se pueden importar archivos .json o .csv»).
  - *Rechazo del archivo entero* (con mensaje): vacío; sin filas de palabras; contiene `�` (no es UTF-8: «Guárdalo como "CSV UTF-8"»); CSV sin columnas `frances` y `espanol`; JSON inválido o con otro `format`; más de 2 MB.
  - *CSV:* quita el BOM; detecta `,` o `;` por la cabecera; acepta `\r\n` y `\n`, comillas y saltos de línea dentro de campos; cabeceras sin importar mayúsculas ni acentos (`francés` = `frances`) y en cualquier orden; columnas desconocidas se ignoran y se nombran en el resumen; filas totalmente vacías se saltan. `genero` acepta `m`, `f`, `masculino`, `femenino` o vacío; `revisar` acepta `si`, `sí`, `1`, `true`, `no`, `0`, `false` o vacío.
  - *Revisión* (no cambia nada): cada fila pasa por la misma validación. Resultado: **nuevas**, **duplicadas** (ya existen en la lista; se guarda cuál) e **inválidas** (número de fila — línea del archivo en CSV, posición en JSON — y motivos). Una repetida dentro del archivo cuenta como inválida: «fila 9: repite la fila 4».
  - *Decisión:* «Importar N nuevas» (duplicadas intactas) o «Reemplazar duplicadas…», que pide una segunda confirmación con el número exacto. Reemplazar conserva el `id` y `createdAt` de la palabra existente.

## Voz

`speechSynthesis` con `lang = "fr-FR"`. Elección de voz: la primera `fr-FR` (también `fr_FR`) local, luego cualquier `fr-FR`, luego cualquier `fr-*` con nota «Voz francesa con otro acento». Si `getVoices()` llega vacío, se espera `voiceschanged` hasta 2 s. Sin voz francesa: aviso con los pasos para instalarla en Android. Sin `speechSynthesis`: aviso «Este navegador no puede leer en voz alta». Cada «Oír» cancela lo que estuviera sonando.

## Interfaz (DESIGN.md, sección Etapa 2)

Vocabulario: placa, buscador con etiqueta, dos filtros, «Añadir palabra» (primario), «Importar» y «Exportar» (secundarios), contador, lista `<ul>` de filas (opción B). Ventanas: ficha (francés grande, traducción, género y categoría, Oír / Oír lento, ejemplo, Borrar / Editar), formulario (añadir y editar), confirmar borrado, resumen de importación, confirmar reemplazo. Botón Oír con `aria-label="Oír «être»"`. La categoría del formulario sugiere las existentes con `<datalist>`. Al cerrar una ventana, el foco vuelve al elemento que la abrió; tras borrar, al buscador. Tras guardar o importar, la lista se actualiza y el contador lo anuncia. Todo texto del usuario con `textContent`.

## Archivos

`js/data/initial-words.js` (lista inicial) · `js/lib/words.js` (normalizar, validar, duplicados, buscar, ordenar) · `js/lib/csv.js` · `js/lib/transfer.js` (exportar, leer importación, planificar) · `js/lib/storage.js` · `js/lib/speech.js` (`pickFrenchVoice`) · `js/screens/vocabulary.js` (interfaz) · cambios en `index.html`, `css/styles.css`, `js/app.js`, `sw.js` (`CACHE_VERSION = 'v3'` y archivos nuevos en la lista).

## Pruebas

- **Automáticas** (`node --test`): validación (vacíos, solo espacios, 200 caracteres, ejemplo a medias, artículo y género, `l’`), duplicados (mayúsculas, espacios, acentos, `’`), búsqueda sin acentos y orden sin artículo; CSV (comas, comillas, comillas duplicadas, salto de línea en campo, `;`, `\r\n`, BOM, fórmulas, ida y vuelta exacta); importación (archivo vacío, solo cabecera, columnas faltantes, columnas desconocidas, `�`, JSON con otro formato, filas inválidas con motivo, duplicadas en lista y en archivo, 1.000 palabras en menos de 1 s); exportación (JSON y CSV, ida y vuelta de 1.000 palabras con caracteres especiales); capa de datos con un `localStorage` falso (primera carga con lista inicial, sin volver a sembrar, JSON dañado conservado, error de cuota sin cambios); lista inicial (ids únicos, sin duplicadas, artículos y género coherentes, pares de ejemplo); elección de voz; ningún archivo de `js/` usa `innerHTML`, `outerHTML`, `insertAdjacentHTML` ni `document.write`.
- **Manual:** lista de comprobación para el celular en el README (crear, editar, borrar, buscar con y sin acentos, oír normal y lento, aviso sin voz, exportar y abrir el archivo, importar con errores y duplicados, modo avión, gesto «atrás» con una ventana abierta).

## Riesgos

1. El francés de la lista inicial puede tener errores: lo dudoso va marcado «Revisar»; el usuario lo revisa.
2. Voces: dependen del teléfono; sin voz francesa descargada no hay sonido sin conexión.
3. Borrar los datos del navegador borra la lista: la exportación es la copia de seguridad (se dice en el README).
4. Excel en español abre mal un CSV con comas al hacer doble clic: el README explica cómo abrirlo; la importación acepta `;`.
5. Ventanas `<dialog>` y gesto «atrás» en Android: se comprueba a mano.
