# Etapa 7 — Pulido y publicación: diseño

**Intención.** Que el usuario **no pueda perder su progreso**: hoy, si se borran los datos del navegador, se pierden las tarjetas y el historial porque «Exportar» solo guarda palabras. Además, cerrar el proyecto con mensajes de error claros en todos los casos, una revisión de accesibilidad y de seguridad con hallazgos y arreglos, y la publicación (que ya existe) documentada.

**Prioridades del usuario:** 1) copia de seguridad completa; 2) errores claros con pruebas; 3) accesibilidad; 4) seguridad; 5) documentar la publicación.
**Objetivos:** guardar y restaurar una copia con palabras, tarjetas (estado de repaso), historial y ajustes; el ciclo guardar → borrar → restaurar deja todo idéntico; un catálogo único de mensajes de error probado; auditoría de accesibilidad y de seguridad escritas, con sus arreglos; README completo (instalar, ejecutar, probar, publicar, actualizar, instalar en Android, restaurar una copia).
**No-objetivos:** combinar copias o sincronizar dispositivos; recordatorio o fecha de la última copia; copia automática o en la nube; pantalla de Ajustes; cambiar el alojamiento (sigue en GitHub Pages); Content-Security-Policy (se anota como recomendación si la auditoría la sugiere); el resumen diario de Inicio.
**Anti-objetivos:** una restauración que deje datos a medias (mitad copia, mitad datos viejos); restaurar un archivo dañado o ajeno y romper la app; cambiar algo antes de que el usuario confirme; **hacer push o cambiar la versión publicada sin confirmación del usuario**; arreglos visuales que empeoren la accesibilidad.

## Decisiones

| Tema | Decisión | Alternativas | Motivo |
|---|---|---|---|
| Restaurar | **Reemplaza todo** tras una confirmación clara — **elegido por el usuario** | Combinar; las dos | Recuperar el progreso tal cual; fácil de probar y de entender |
| Dónde | **Inicio**, sección «Copia de seguridad» con **Guardar copia** y **Restaurar copia** — **elegido por el usuario** | Vocabulario; pantalla Ajustes | Primera pantalla, no se confunde con exportar palabras, Inicio estaba vacío |
| Construcción | **Módulo propio** `js/lib/backup.js` con funciones puras que validan todo antes de escribir — **elegido por el usuario** | Copia «en crudo» del texto de `localStorage` | Probado sin navegador; un archivo dañado nunca entra |
| Errores | Catálogo único `js/lib/messages.js` usado por todas las pantallas — decisión de Claude, aceptada | Mensajes en cada pantalla (hoy repetidos en 5 sitios) | Mismos textos en todas partes y probados |
| Dependencias | `npm audit` **autorizado por el usuario** (envía `eslint` y `globals` al registro de npm) | Revisión manual | Datos de vulnerabilidades reales |
| Publicación | Sigue en GitHub Pages desde `main`; solo se documenta — **elegido por el usuario** | Netlify | Ya funciona, con su ruta base y el service worker |
| Lighthouse | **Lo decide el usuario al llegar a ese punto** (no hay Chrome en este computador) | — | — |
| Git | Todo en la rama local `etapa-7-publicacion`; **sin push ni cambios en Pages sin confirmación** — **pedido por el usuario** | — | — |

## Copia de seguridad

**Archivo** `copia-frances-AAAA-MM-DD.json` (fecha local), UTF-8, JSON con sangría de 2:

```json
{ "format": "app-frances-copia", "version": 1, "createdAt": "<ISO>",
  "words": [ /* palabras tal como están guardadas: id, fr, es, exampleFr, exampleEs, category, gender, needsReview, createdAt, updatedAt */ ],
  "study": { "cards": { }, "history": [ ], "settings": { } } }
```

No incluye las copias de datos dañados (`app-frances-corrupt-…`) ni nada que no sea de la app.

**Funciones puras** (`js/lib/backup.js`):
- `BACKUP_FORMAT = 'app-frances-copia'`, `BACKUP_VERSION = 1`, `MAX_BACKUP_BYTES = 10 * 1024 * 1024` (el historial crece ~1 MB al año; 2 MB, el límite de importar palabras, se quedaría corto).
- `buildBackup({ words, study, now }): string` y `backupFileName(now): string`.
- `readBackup(text): { fatal: string | null, backup: { words, study } | null, summary: { words, cards, answers, createdAt } | null }`. Valida **todo** antes de devolver nada:
  1. Texto con `U+FFFD` (no UTF-8) → error; JSON que no se lee → error.
  2. `format === 'app-frances-vocabulario'` → error que explica que es una **lista de palabras** y se importa en Vocabulario. Otro `format` → «no es una copia de la app».
  3. `version` mayor que 1 → copia de una versión más nueva de la app.
  4. `words`: array; cada palabra con `id` texto no vacío y único, y válida con `validateWord` de la Etapa 2 (sin repetir el francés con `duplicateKey`).
  5. `study`: válido con la regla del almacén (`cards` objeto, `history` array, ajustes válidos) **y además**, solo para copias, cada tarjeta y cada respuesta revisadas por dentro: tarjeta con `id === clave`, `wordId`, `direction` válida, `introducedOn` fecha o `null`, `sm2` (`reps`, `interval`, `ease`, `lapses` números; `due` fecha o `null`) y `leitner` (`box` 0–5, `due` fecha o `null`). **El historial solo tiene que ser una lista** (corrección durante la ejecución): Progreso ya ignora las respuestas raras, y exigir más campos podía dejar sin restaurar una copia hecha por la propia app. Además, **Guardar copia comprueba el archivo con `readBackup` antes de descargarlo** y, si no se pudiera restaurar, avisa en vez de descargarlo. La regla con la que el almacén carga los datos que ya tiene el usuario **no cambia** (endurecerla podría apartar como dañado un progreso real) — decisión de Claude tras la revisión.
  6. Las tarjetas de palabras que no estén en la copia se aceptan (la app ya las ignora).
- Los motivos de un archivo inválido son textos de una frase en `backup.js` (como los de `readImport` en `transfer.js`, que no se mueven); la pantalla los muestra bajo el título del catálogo «No se pudo restaurar la copia.». El tamaño (`MAX_BACKUP_BYTES`) lo comprueba la pantalla antes de leer el archivo — decisión de Claude tras la revisión.

**Restaurar** (`restoreBackup(backend, backup)`, en `backup.js`, probado con un almacenamiento falso): escribe la clave de palabras y después la de estudio, cada una con su `schemaVersion`. Si la segunda escritura falla, **vuelve a escribir el texto anterior** de la primera (o la borra si no existía) y lanza el `StorageError`: nunca queda a medias. Si todo sale bien, la pantalla recarga la app (`#/`) y, al volver, Inicio muestra «Se restauró la copia del 23/11/2026.» (aviso guardado un momento en `sessionStorage`) — recargar es la forma más simple de que todas las pantallas lean los datos nuevos; decisión de Claude.

**Pantalla Inicio** (`js/screens/home.js`, `index.html`, `css/styles.css`, skill frontend-design + DESIGN.md):
- Se mantiene la frase actual de Inicio. Debajo, `h2` «Copia de seguridad», un párrafo («Guarda en un archivo tus palabras, tu progreso y tu historial. Si se borran los datos del navegador, con ese archivo lo recuperas todo.») y los botones **Guardar copia** (primario) y **Restaurar copia** (secundario) con un `<input type="file" accept=".json">` oculto.
- **Guardar copia:** descarga el archivo (igual que Exportar de Vocabulario) y avisa «Se guardó la copia con N palabras y M respuestas.» en una región `role="status"`.
- **Restaurar copia:** elegir archivo → `readBackup` → si hay error, aviso con el mensaje; si no, ventana de confirmación (`<dialog>` como las de la Etapa 2) con el título «¿Restaurar la copia del 23/11/2026?», qué tiene la copia («160 palabras, 98 tarjetas estudiadas y 1 234 respuestas») y qué se reemplaza («Tus datos actuales: 158 palabras, 90 tarjetas y 1 100 respuestas. Se reemplazarán y no se puede deshacer. Si quieres conservarlos, guarda antes una copia.»). Botones **Cancelar** y **Restaurar** (peligro). El foco vuelve al botón al cerrar.
- Otras pestañas abiertas se enteran solas (evento `storage`, ya existente).

## Mensajes de error (`js/lib/messages.js`)

Cada mensaje es `{ title, text }`: el título dice qué pasó; el texto, qué hacer. Español claro, segunda persona, sin disculpas. Catálogo (los textos finales los fija el plan; estos son los casos):

| Caso | Dónde aparece | Qué hacer (idea del texto) |
|---|---|---|
| Almacenamiento lleno (`quota`) | Vocabulario, Estudiar, Quiz, Progreso, Inicio (restaurar) | Guarda una copia en Inicio y borra palabras que no uses |
| Almacenamiento no disponible | las mismas | Comprueba que no estás en modo privado y que el navegador deja guardar datos |
| Datos de palabras dañados | Vocabulario al cargar | Se guardó una copia aparte; si tienes una copia de seguridad, restáurala en Inicio |
| Progreso dañado | Estudiar al cargar | Igual, para el progreso |
| Importación fallida | Vocabulario y Inicio: título del catálogo («No se pudo importar…» / «No se pudo restaurar la copia.») + el motivo de `readImport` o `readBackup` | Qué falla y cómo arreglarlo (UTF-8, formato, versión, archivo de palabras en Inicio…) |
| Archivo demasiado grande | Vocabulario (2 MB), Inicio (10 MB) | Tamaño máximo |
| Falta de voz francesa | Vocabulario, Estudiar, Quiz | Pasos para instalar la voz (texto actual de `voice.js`) |
| La voz falló al leer | las mismas | Texto actual de `voice.js` |

- `storageMessage(error)` devuelve el mensaje de `quota` o `unavailable` según `StorageError.code`.
- **Pruebas** (`tests/messages.test.js`): cada caso existe, tiene título y texto no vacíos que terminan en punto, no se disculpa («perdón», «lo sentimos») y nombra una acción; `storageMessage` elige bien; una prueba recorre `js/screens/*.js` y comprueba que **los textos de esos casos solo están en `messages.js`** (no repetidos en las pantallas).

## Auditoría de accesibilidad

En el navegador (Firefox sin ventana, como en etapas anteriores) y leyendo el HTML, pantalla por pantalla y en cada ventana: contraste (las pruebas de `styles.test.js` amplían la comprobación a todos los pares texto/fondo de los tokens en claro y oscuro), etiqueta en cada campo, nombre accesible en cada botón (también los de icono), `lang="fr"` en el texto francés, orden de títulos, foco visible y orden de tabulación, foco al abrir y cerrar ventanas, avisos que se anuncian (`role="alert"`/`status`), objetivos táctiles de 44 px, sin desplazamiento lateral a 320 px y `prefers-reduced-motion`. Resultado: `docs/auditoria/accesibilidad.md` con una tabla `# | Pantalla | Hallazgo | Gravedad | Arreglo | Prueba`. Cada arreglo comprobable lleva una prueba primero; la lectura con TalkBack queda como comprobación manual del usuario en el README.

**Qué se arregla en esta etapa (las dos auditorías) — elegido por el usuario:** se arregla directamente, con su prueba, todo hallazgo que **no cambie el diseño ni el comportamiento** (una etiqueta o un nombre accesible que falta, `lang`, un rol o región de aviso, el foco de una ventana, un contraste corregido dentro de los colores de DESIGN.md). Lo que cambie cómo se ve o cómo funciona algo se anota en la tabla como «Pendiente de tu decisión» y se le presenta al usuario sin cambiarlo.

## Auditoría de seguridad

`docs/auditoria/seguridad.md` con: búsqueda de secretos en los archivos **y en todo el historial de git** (patrones de claves, tokens, contraseñas, `BEGIN PRIVATE KEY`, archivos `.env`), `.gitignore` revisado; texto del usuario nunca como HTML (prueba existente que prohíbe `innerHTML`, `outerHTML`, `insertAdjacentHTML` y `document.write`, ampliada a `setHTMLUnsafe` y a `setAttribute('on…')` (asignar `.onclick` o `.onerror` a una función no es inyectar HTML y se permite); los archivos importados y las copias se validan antes de usarse; `npm audit` con su salida real y la propuesta para cada aviso. **Cambiar o actualizar dependencias (`npm audit fix`, subir ESLint…) se pide antes al usuario**, como manda CLAUDE.md — decisión de Claude tras la revisión.

## Publicación (README)

Sin cambios en la publicación. El README documenta: URL `https://joakil255.github.io/App-frances/`; ruta base `/App-frances/` y por qué la app usa rutas relativas (el service worker y el manifiesto funcionan bajo esa ruta); cómo publicar una versión nueva (subir `CACHE_VERSION`, merge a `main`, esperar a Pages, comprobar `sw.js`; el aviso «Actualizar» en el teléfono); cómo instalar en Android (Chrome → menú → «Instalar app» / «Agregar a pantalla principal»); y una sección «Copia de seguridad» (guardar, dónde queda el archivo en Android —Descargas—, restaurar, qué se reemplaza). También instalar, ejecutar y probar al día. `sw.js`: `CACHE_VERSION = 'v14'` y los archivos nuevos (`js/lib/backup.js`, `js/lib/messages.js`, `js/screens/home.js`).

## Pruebas clave de la copia (`tests/backup.test.js`)

- **Ciclo completo:** almacenes reales sobre un almacenamiento falso con palabras, tarjetas, historial y ajustes → `buildBackup` → borrar el almacenamiento → `readBackup` + `restoreBackup` → almacenes nuevos cargan **exactamente** lo mismo (`deepEqual` de palabras, tarjetas, historial y ajustes) y la cola de Estudiar es la misma.
- Archivos inválidos (cada caso de la validación) → `fatal` con su mensaje y el almacenamiento **no se toca**.
- Fallo de espacio al escribir el estudio → la clave de palabras vuelve a su texto anterior y se lanza `StorageError('quota')`.
- Acentos y caracteres especiales sobreviven al ciclo (`l'élève`, `œ`, `<b>`); copia vacía (sin palabras ni historial) válida; copia grande (5 000 palabras y 20 000 respuestas) en menos de 1 s.

## Lighthouse

Al llegar a ese punto se pregunta al usuario cómo obtener resultados reales: ejecutarlo él en Chrome (DevTools o PageSpeed Insights) y pegar los resultados, o instalar Chromium aquí (dependencia del sistema, con su aprobación). «Antes» se mide sobre la versión publicada actual (`main`); «después», sobre la rama servida en local, o publicada si el usuario lo confirma.

## Riesgos

1. Restaurar reemplaza datos más nuevos que la copia: la ventana lo explica y sugiere guardar antes una copia.
2. En Android el archivo va a Descargas; si el usuario lo borra, no hay copia. El README lo explica.
3. Una copia de una versión futura de la app no se puede restaurar (mensaje claro).
4. La auditoría de accesibilidad automática no sustituye a TalkBack; queda como comprobación manual.
