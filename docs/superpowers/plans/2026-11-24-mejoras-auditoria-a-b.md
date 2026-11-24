# Mejoras A y B de la auditoría: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atributos de teclado móvil en los campos en francés de Vocabulario (A) y normalización del apóstrofo y sus espacios en la palabra francesa al guardar y al detectar duplicadas (B).
**Architecture:** A solo cambia `index.html`; B cambia `js/lib/words.js` (una función nueva usada por `cleanWord` y `duplicateKey`). Cada uno en su rama, B creada desde `main` después de unir A.
**Tech Stack:** HTML, JS (módulos), `node --test`, ESLint, Firefox sin ventana para comprobar.
**Spec:** `docs/superpowers/specs/2026-11-24-mejoras-auditoria-a-b-design.md`

## Global Constraints
- TDD estricto: prueba primero, verla fallar, código mínimo, verla pasar. Nunca debilitar una prueba.
- Una rama por mejora; commits en español; **sin push ni PR sin confirmación del usuario**.
- Sin dependencias nuevas; sin cambios en el modelo de datos.
- Cada cambio de archivos de la app sube `CACHE_VERSION` en `sw.js` (A: `v15`; B: `v16`, sobre `main` con A unida).

## Review Focus
1. En Android, el campo «Francés» de Vocabulario no pone mayúscula inicial ni corrige al español (comprobación del usuario en el celular; el HTML lo fija una prueba).
2. Editar una palabra antigua guardada como «l’ami» la guarda como «l'ami» sin marcarla como duplicada de sí misma (B: prueba con `ownId`).
3. Importar un CSV con «l’eau» sobre una lista que tiene «l'eau» la marca como «ya existe» (B: prueba de `planImport`).
4. Una palabra sin apóstrofo o con apóstrofo interno («aujourd'hui», «s'il vous plaît») no cambia (B: prueba).
5. Un ejemplo con comillas rectas (`Il dit 'oui'.`) se guarda igual (B: prueba).

---

### Task A: Teclado móvil en Vocabulario (rama `mejora-teclado-vocabulario`)
**Files:** Modify `index.html` (`#form-fr`, `#form-example-fr`), `sw.js` (`v15`); Test `tests/index-html.test.js`.
- [ ] Commit del diseño y este plan (`docs: diseño y plan de las mejoras A y B de la auditoría`).
- [ ] **Prueba primero:** en `tests/index-html.test.js`, el `<input>` `#form-fr` incluye `autocapitalize="none"`, `autocorrect="off"` y `spellcheck="false"`; `#form-example-fr` incluye `autocapitalize="sentences"`, `autocorrect="off"` y `spellcheck="false"`; los dos conservan `lang="fr"`. `node --test tests/index-html.test.js` → **FALLA**.
- [ ] Añadir los atributos; `sw.js` → `v15`. `npm test` y `npm run lint` → pasan. Comprobación en Firefox sin ventana: los atributos están en el DOM al abrir «Añadir palabra». Commit `fix: teclado móvil en los campos en francés de Vocabulario`.

### Task B: Normalizar la palabra francesa al guardar (rama `mejora-normalizar-palabras`, desde `main` con A unida)
**Files:** Modify `js/lib/words.js`, `sw.js` (`v16`); Test `tests/words.test.js`, `tests/transfer.test.js`.
**Produces:** `normalizeFrenchWord(value: string): string` = `normalizeText(value)` + `’ ‘ ʼ` → `'` + quitar espacios junto al apóstrofo (`/\s*'\s*/g` → `'`). `cleanWord` la usa solo para `fr`; `duplicateKey(fr)` = `normalizeFrenchWord(fr).toLowerCase()`.
- [ ] **Pruebas primero** (`tests/words.test.js`): `validateWord` guarda `fr` = `"l'ami"` para `'l’ami'`, `"l' ami"`, `'l ’ami'` y `'l ʼ ami'`; `'L’Ami'` → `"L'Ami"` (no cambia mayúsculas); `"aujourd'hui"` y `"s'il vous plaît"` no cambian; `exampleFr` `"Il dit 'oui'."` y `'L’œuf est là.'` no cambian; `duplicateKey("l' ami") === duplicateKey("l'ami") === duplicateKey('l’ami')`; guardar `"l' ami"` con una existente `'l’ami'` → error «ya está en tu lista»; editar esa misma (`ownId`) → sin error. `tests/transfer.test.js`: `planImport` de una fila CSV `l’eau` contra una lista con `l'eau` → 1 duplicada, 0 nuevas. **Ver fallar.**
- [ ] Implementar en `js/lib/words.js`; `sw.js` → `v16`. `npm test` y `npm run lint` → pasan (las pruebas existentes de apóstrofos siguen pasando). Commit `fix: normalizar el apóstrofo de la palabra francesa al guardar`.

### Cierre
- [ ] Para cada rama: releer el diff, informe de `CLAUDE.md` y **preguntar** antes de push y PR. Tras el merge de A, crear B desde `main` actualizado.
