# Etapa 7 — Pulido y publicación: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copia de seguridad completa (guardar y restaurar palabras, tarjetas, historial y ajustes) en Inicio, mensajes de error unificados y probados, auditorías de accesibilidad y seguridad con sus arreglos, Lighthouse antes y después, y README completo.
**Architecture:** `js/lib/backup.js` (funciones puras: armar, leer y validar, restaurar con vuelta atrás) y `js/lib/messages.js` (catálogo de mensajes); `js/screens/home.js` para Inicio; las pantallas existentes pasan a usar el catálogo. Auditorías en `docs/auditoria/`.
**Tech Stack:** JS (módulos) sin dependencias nuevas, `localStorage`, `node --test`, ESLint, Firefox sin ventana (WebDriver BiDi) para recorridos.
**Spec:** `docs/superpowers/specs/2026-11-23-etapa-7-publicacion-design.md` + `DESIGN.md`

## Global Constraints
- **TDD estricto:** pruebas primero, verlas fallar, luego el código. Nunca se debilita una prueba.
- **Git solo local:** rama `etapa-7-publicacion`, commits pequeños en español. **Sin `git push` ni cambios en GitHub Pages sin confirmación expresa del usuario.**
- Sin dependencias nuevas. Cambiar o actualizar dependencias (incluido `npm audit fix`) se pide antes al usuario.
- Texto con `textContent`; textos visibles en español; código en inglés; comentarios breves en español.
- La regla de carga de los almacenes (`isValidDoc` en `study-storage.js`, `load()` en `storage.js`) **no cambia**.
- Auditorías: se arregla directamente lo que **no cambia el diseño ni el comportamiento**; lo demás se anota como «Pendiente de tu decisión» sin tocarlo.
- `sw.js`: `CACHE_VERSION = 'v14'` y cada archivo nuevo en `PRECACHE_URLS` en su tarea.
- Claves: palabras `app-frances` → `{ schemaVersion: 1, words }`; estudio `app-frances-study` → `{ schemaVersion: 1, cards, history, settings }`.

## Review Focus
1. Restaurar desde Android eligiendo un archivo que **no** es JSON (una foto, un PDF) → mensaje claro y nada cambia (Tarea 4, recorrido con un archivo `.png` renombrado y uno binario).
2. Otra pestaña abierta durante la restauración → al terminar muestra los datos restaurados sin pisarlos (evento `storage`; Tarea 4, recorrido con dos pestañas).
3. Doble toque en **Restaurar** de la ventana de confirmación → una sola restauración y una sola recarga (Tarea 4: el botón se desactiva al primer toque; recorrido).
4. Cancelar la ventana o elegir y luego anular el selector de archivos → nada cambia y el foco vuelve a **Restaurar copia** (Tarea 4, recorrido).
5. Copia guardada justo después de un «Otra vez» del mismo día → al restaurar, la cola de Estudiar del día es la misma (Tarea 3, prueba del ciclo con una tarjeta fallada hoy).

---

### Task 1: Plan en la rama local
- [ ] Commit `docs: plan de la etapa 7` en `etapa-7-publicacion`. **Sin push.**

### Task 2: Catálogo de mensajes de error (TDD)
**Files:** Create `js/lib/messages.js`, `tests/messages.test.js`; Modify `js/screens/vocabulary.js`, `js/screens/study.js`, `js/screens/quiz.js`, `js/screens/progress.js`, `js/screens/voice.js`, `sw.js` (`v14`, archivo nuevo).
**Consumes:** `StorageError` (`code: 'quota' | 'unavailable'`) de `js/lib/storage.js`.
**Produces:** `MESSAGES` (objeto congelado) · `storageMessage(error): { title, text }` · `importFailed(fileName, reason): { title, text }` · `fileTooLarge(maxMb): { title, text }`. Textos exactos:

| Clave | title | text |
|---|---|---|
| `storageQuota` | No hay espacio para guardar. | Guarda una copia de seguridad en Inicio y borra palabras que no uses. |
| `storageUnavailable` | El navegador no deja guardar datos. | Comprueba que no estás en modo privado y que el navegador permite guardar datos de este sitio. |
| `corruptWords` | Tus palabras guardadas estaban dañadas. | Se guardó una copia aparte y la lista empezó vacía. Si tienes una copia de seguridad, restáurala en Inicio. |
| `corruptStudy` | Tu progreso guardado estaba dañado. | Se guardó una copia aparte y el estudio empezó de cero. Si tienes una copia de seguridad, restáurala en Inicio. |
| `restoreFailed` | No se pudo restaurar la copia. | (el motivo de `readBackup`) |
| `noSpeech` | Este navegador no puede leer en voz alta. | Abre la app en Chrome para oír el francés. |
| `noFrenchVoice` | No hay voz francesa en este dispositivo. | (el texto actual `VOICE_SETTINGS` de `voice.js`) |
| `voiceFailed` | El teléfono no pudo leer en voz alta. | (`VOICE_SETTINGS`; la pantalla añade « (Error: código.)») |

`importFailed(name, reason)` → title `No se pudo importar «${name}».`, text `reason`. `fileTooLarge(n)` → title `El archivo pasa de ${n} MB.`, text `Comprueba que elegiste el archivo correcto.`

- [ ] **Pruebas primero** (`tests/messages.test.js`): cada clave de la tabla existe con `title` y `text` no vacíos (salvo `restoreFailed`, cuyo text llega de fuera) que terminan en `.`; ningún texto contiene «perdón», «lo sentimos» ni «disculpa»; `storageQuota.text` y los dos `corrupt*` nombran «Inicio»; `storageMessage(new StorageError('quota'))` → `storageQuota`, `('unavailable')` → `storageUnavailable`, un `Error` cualquiera → `storageUnavailable`; `importFailed('a.csv', 'El archivo está vacío.')` y `fileTooLarge(2)` con los textos exactos; **ninguno** de los `title` estáticos del catálogo aparece literalmente en `js/screens/*.js` (leer los archivos y buscar la cadena). **Ver fallar.**
- [ ] Implementar `messages.js` y cambiar las pantallas para usarlo: `storageProblem` de vocabulario, estudio, quiz y progreso → `storageMessage(error)`; los errores dentro de ventanas (`vocabulary.js` y `study.js`, hoy cadenas combinadas) → `` `${m.title} ${m.text}` ``; los avisos de datos dañados → `corruptWords` / `corruptStudy`; la importación → `importFailed` y `fileTooLarge(2)`; `voice.js` → `noSpeech`, `noFrenchVoice`, `voiceFailed`. `sw.js`: `v14` y `js/lib/messages.js`.
- [ ] `npm test` y `npm run lint` → todo pasa. Commit `feat: catálogo único de mensajes de error`.

### Task 3: Copia de seguridad: armar, leer y restaurar (TDD)
**Files:** Create `js/lib/backup.js`, `tests/backup.test.js`; Modify `sw.js` (archivo nuevo).
**Consumes:** `validateWord`, `duplicateKey` (`words.js`); `validateSettings` (`study-storage.js`); `ANSWERS` (`scheduler.js`); `StorageError`, `toStorageError` (`storage.js`); `STORAGE_KEY` (`storage.js`), `STUDY_KEY` (`study-storage.js`).
**Produces:** `BACKUP_FORMAT = 'app-frances-copia'` · `BACKUP_VERSION = 1` · `MAX_BACKUP_BYTES = 10 * 1024 * 1024` · `buildBackup({ words, study, now }): string` (JSON con sangría de 2 y salto final; `study` = `{ cards, history, settings }`) · `backupFileName(now): string` (`copia-frances-AAAA-MM-DD.json`, fecha local) · `readBackup(text): { fatal: string | null, backup: { words, study, createdAt } | null, summary: { words: number, cards: number, answers: number, createdAt: string } | null }` · `restoreBackup(backend, backup): void` (lanza `StorageError`).

Motivos de `readBackup` (textos exactos, una frase):
- U+FFFD → «El archivo no está en UTF-8.»; JSON ilegible → «El archivo no se puede leer.»
- `format === 'app-frances-vocabulario'` → «Este archivo es una lista de palabras: impórtalo en Vocabulario con «Importar».»
- otro `format` → «Este archivo no es una copia de seguridad de la app.»
- `version > 1` → «La copia es de una versión más nueva de la app. Actualiza la app y vuelve a intentarlo.»
- cualquier otro defecto de `words` o `study` → «La copia está incompleta o dañada.»

Validación (todo antes de devolver): `words` array; cada palabra con `id` texto no vacío y único, `createdAt` y `updatedAt` textos, y `validateWord(palabra).ok`; francés sin repetir (`duplicateKey`). `study.cards` objeto (no array) y cada tarjeta con `id` igual a su clave, `wordId` texto, `direction` `fr-es`/`es-fr`, `introducedOn` fecha `AAAA-MM-DD` o `null`, `lastReviewedAt` texto o `null`, `sm2` con `reps`, `interval`, `ease`, `lapses` números finitos y `due` fecha o `null`, `leitner` con `box` entero 0–5 y `due` fecha o `null`. `study.history` array; respuesta sin `kind`: `at`, `date` (fecha), `cardId`, `wordId`, `direction` válida, `answer` en `ANSWERS`, `algorithm` `sm2`/`leitner`; con `kind: 'quiz'`: `at`, `date`, `wordId`, `mode` `choice`/`write`/`dictation`, `correct` y `accentOnly` booleanos. `validateSettings(study.settings).ok`. `createdAt` texto ISO.

`restoreBackup`: lee el texto actual de `app-frances`; escribe `app-frances` = `{ schemaVersion: 1, words }`; escribe `app-frances-study` = `{ schemaVersion: 1, cards, history, settings }`; si esta segunda escritura falla, vuelve a escribir el texto anterior de `app-frances` (o `removeItem` si era `null`) y lanza `toStorageError(error)`.

- [ ] **Pruebas primero** (`tests/backup.test.js`, almacenamiento falso en memoria como en `tests/storage.test.js` y `tests/study-storage.test.js`):
  - **Ciclo completo:** almacenes reales (`createWordStore`, `createStudyStore`) con palabras (incluidas `l'élève`, `le cœur`, `<b>gras</b>`), 3 tarjetas repasadas con `review` (una con «Otra vez» hoy), historial de Estudiar y Quiz y ajustes no por defecto (`leitner`, `es-fr`, 5, `requireAccents: true`) → `buildBackup` → almacenamiento nuevo vacío → `readBackup` + `restoreBackup` → almacenes nuevos cargan con `deepEqual` las mismas palabras, tarjetas, historial y ajustes, y `buildQueue` del mismo día da la misma cola (Review Focus 5).
  - `readBackup`: cada motivo de arriba con su texto exacto; una tarjeta `{}`, una respuesta con `answer: 'maybe'`, un `box: 7`, `cards` como array, una palabra sin `id`, dos palabras con el mismo `id`, dos con el mismo francés → «La copia está incompleta o dañada.»; copia válida sin palabras ni historial → sin `fatal`; `summary` con los conteos correctos.
  - `restoreBackup`: si `setItem('app-frances-study')` lanza `QuotaExceededError`, `app-frances` vuelve a su texto anterior exacto y se lanza `StorageError` con `code: 'quota'`; si antes no había `app-frances`, queda sin esa clave.
  - `backupFileName(new Date(2026, 10, 23, 23, 59))` → `'copia-frances-2026-11-23.json'`.
  - Copia grande (5 000 palabras, 20 000 respuestas): `buildBackup` + `readBackup` en menos de 1 s.
- [ ] `node --test tests/backup.test.js` → **FALLA** (no existe el módulo).
- [ ] Implementar `js/lib/backup.js`. `sw.js`: archivo nuevo.
- [ ] `npm test` y `npm run lint` → pasa. Commit `feat: copia de seguridad completa (armar, validar y restaurar)`.

### Task 4: Inicio con «Guardar copia» y «Restaurar copia»
**Files:** Create `js/screens/home.js`; Modify `index.html` (`#screen-home` y una ventana `#restore-confirm`), `css/styles.css`, `js/app.js`, `sw.js`, `DESIGN.md`; Test `tests/index-html.test.js`.
**Consumes:** Tarea 3; `MESSAGES`, `storageMessage`, `fileTooLarge` (Tarea 2); `wordStore.getWords()`, `studyStore.getState()`.
**Produces:** `initHome({ wordStore, studyStore, now = () => new Date() })`.

- [ ] **Skill frontend-design** con DESIGN.md y el boceto del diseño antes del CSS.
- [ ] **Pruebas primero** (`tests/index-html.test.js`): en `#screen-home` se mantiene la frase actual; existen `#home-notice` (`role="alert"`, oculto), `#home-status` (`role="status"`), `<h2>Copia de seguridad</h2>`, el párrafo exacto del diseño, `<button type="button" class="button button-primary" id="backup-save">Guardar copia</button>`, `<button type="button" class="button button-secondary" id="backup-restore">Restaurar copia</button>` e `<input type="file" id="backup-file" accept=".json,application/json" hidden>`; `<dialog id="restore-confirm" class="dialog" aria-labelledby="restore-title">` con `#restore-title`, `.restore-text`, botón `data-action="close"` «Cancelar» y `<button type="button" class="button button-danger" data-action="confirm">Restaurar</button>`. **Ver fallar.**
- [ ] Implementar `home.js`: **Guardar** → `buildBackup` con los datos actuales, descarga (mismo método que Exportar de Vocabulario) y en `#home-status` «Se guardó la copia con N palabras y M respuestas.». **Restaurar** → selector; tamaño > `MAX_BACKUP_BYTES` → `fileTooLarge(10)`; `readBackup` con `fatal` → aviso `restoreFailed` + motivo; si no, ventana con título «¿Restaurar la copia del DD/MM/AAAA?» y el texto con los conteos de la copia y los actuales del diseño. **Restaurar** (se desactiva al primer toque) → `restoreBackup(window.localStorage, backup)`; si lanza → cerrar la ventana y `storageMessage`; si no, `sessionStorage['app-frances-restored'] = createdAt`, `location.hash = '#/'` y `location.reload()`. Al iniciar, si existe esa clave de `sessionStorage`, mostrar «Se restauró la copia del DD/MM/AAAA.» en `#home-status` y borrarla. El foco vuelve a **Restaurar copia** al cerrar la ventana. `app.js`: `initHome` tras cargar los almacenes. `sw.js`: `js/screens/home.js`. `DESIGN.md`: sección Inicio (Etapa 7).
- [ ] `npm test`, `npm run lint`. Recorrido en Firefox sin ventana con capturas a 320 px y 1280 px, claro y oscuro: datos con 160 palabras, repasos, quiz y ajustes cambiados → **Guardar copia** (capturar el texto descargado) → borrar `localStorage` y recargar → **Restaurar copia** con ese archivo → confirmar → tras la recarga, mismas palabras, mismo Progreso (racha, 14 días, acierto, palabras por estado) y mismos ajustes; mensaje de restaurada. Además: Review Focus 1–4; teclado (foco al abrir y cerrar la ventana). Commit `feat: guardar y restaurar la copia de seguridad en Inicio`.

### Task 5: Auditoría de accesibilidad
**Files:** Create `docs/auditoria/accesibilidad.md`; Modify los archivos que necesite cada arreglo; Test `tests/styles.test.js`, `tests/index-html.test.js` y otros según el hallazgo.
- [ ] **Contraste:** ampliar `tests/styles.test.js` para comprobar todos los pares texto/fondo de los tokens de DESIGN.md en claro y oscuro (≥ 4,5:1 texto, ≥ 3:1 bordes de campos y elementos gráficos con información). Ver qué falla.
- [ ] **Recorrido** pantalla por pantalla y en cada ventana (Firefox sin ventana): por script, listar campos sin etiqueta, botones sin nombre accesible, imágenes/SVG informativos sin texto alternativo, texto francés sin `lang="fr"`, saltos en el orden de títulos, objetivos táctiles < 44 px, desplazamiento lateral a 320 px; con `Tab`, orden y foco visible (capturas); foco al abrir y cerrar cada ventana; avisos con `role="alert"`/`status`; `prefers-reduced-motion`.
- [ ] Escribir la tabla `# | Pantalla | Hallazgo | Gravedad | Arreglo | Prueba` en `docs/auditoria/accesibilidad.md`. Para cada hallazgo que no cambie diseño ni comportamiento: prueba que falla → arreglo → prueba que pasa. Lo demás: «Pendiente de tu decisión».
- [ ] `npm test`, `npm run lint`. Commit `fix: arreglos de accesibilidad de la auditoría` (más `docs: auditoría de accesibilidad`).

### Task 6: Auditoría de seguridad
**Files:** Create `docs/auditoria/seguridad.md`; Modify `tests/security.test.js`, `.gitignore` si hace falta.
- [ ] **Pruebas primero:** `tests/security.test.js` también prohíbe `setHTMLUnsafe` y `setAttribute('on` en `js/` y `sw.js`. Ver pasar o fallar y anotar.
- [ ] Secretos: `git ls-files` + `git log -p --all` buscando `/api[_-]?key|secret|token|password|passwd|BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|\.env/i`; `git log --all --name-only` buscando archivos `.env`, `*.pem`, `*.key`; revisar `.gitignore`. Anotar los comandos y la salida.
- [ ] `npm audit` (autorizado por el usuario) → anotar la salida real y la propuesta para cada aviso; **no** cambiar dependencias sin preguntar.
- [ ] Revisar que importar palabras, el mazo y restaurar copia validan antes de escribir (citar las pruebas). Escribir `docs/auditoria/seguridad.md`. Commit `docs: auditoría de seguridad`.

### Task 7: Lighthouse antes y después
- [ ] **Preguntar al usuario** cómo obtener resultados reales (él en Chrome/PageSpeed y pega los resultados, o instalar Chromium con su aprobación). «Antes» = versión publicada (`main`); «después» = la rama servida en local (`npm start`) o publicada si el usuario lo confirma. Guardar los resultados (las cuatro puntuaciones y los avisos principales) en `docs/auditoria/lighthouse.md`; arreglar lo que salga sin cambiar el diseño, con prueba cuando se pueda. Commit `docs: Lighthouse antes y después`.

### Task 8: README y cierre
- [ ] README: **Instalar**, **Ejecutar**, **Probar** al día; **Publicación** (URL `https://joakil255.github.io/App-frances/`, ruta base `/App-frances/` y rutas relativas del service worker y el manifiesto, cómo publicar una versión nueva: subir `CACHE_VERSION`, merge a `main`, esperar a Pages, comprobar `sw.js`, aviso «Actualizar»); **Instalar en Android** (Chrome → ⋮ → «Instalar app» o «Agregar a la pantalla principal»); **Copia de seguridad** (guardar, dónde queda en Android —Descargas—, restaurar, qué se reemplaza, que no incluye los respaldos de datos dañados); comprobaciones manuales nuevas (ciclo guardar → borrar datos del sitio en Chrome → restaurar; TalkBack); estructura con los archivos nuevos; quitar la frase «La exportación de Vocabulario no incluye el progreso del estudio» y enlazar a la copia.
- [ ] `npm test`, `npm run lint`; releer `git diff main`; revisión final de la rama; informe de `CLAUDE.md`. **Preguntar al usuario** antes de cualquier push o cambio en Pages.
