# Arreglo: volver desde el repaso de Construir — plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un enlace visible «‹ Todas las lecciones» en la pantalla de repaso de Construir.

**Architecture:** Solo marcado en `index.html` (copia del enlace de `#build-lesson`) y la versión de caché.

**Tech Stack:** HTML, `node --test`, ESLint.

**Spec:** `docs/superpowers/specs/2026-11-27-arreglo-volver-repaso-design.md`

## Global Constraints
- Marcado idéntico al de la lección: `<p class="build-back"><a class="text-link" href="#/construir"><span aria-hidden="true">‹</span> Todas las lecciones</a></p>`.
- Sin CSS ni JS nuevos. `CACHE_VERSION = 'v28'`.
- Sin commits hasta que el usuario vea el resultado. Rama `arreglo-volver-repaso`.

## Review Focus
1. **El enlace debe verse también cuando el repaso está vacío o terminado** (`#build-review-empty`, `#build-review-done`): va fuera de esos párrafos, como primer hijo de `#build-review` (Task 1, la prueba busca dentro de `#build-review`).
2. **Volver con el enlace a mitad de un repaso** → la ruta se muestra y el repaso se reinicia como al entrar de nuevo (`onShow` ya llama a `resetPractice`); se comprueba en el recorrido (Task 2).

---

### Task 1: Enlace y caché

**Files:** Modify `index.html` (`#build-review`, ~línea 467), `sw.js` (`CACHE_VERSION`). Test: `tests/index-html.test.js`, `tests/precache.test.js`.

- [ ] **Step 1: Pruebas que fallan.** En `tests/index-html.test.js`, junto a «cada lección tiene un enlace para volver a la ruta», agregar `test('el repaso tiene un enlace para volver a la ruta', …)`: extrae `<div id="build-review"…>…</div>` hasta `<!-- Lección`; exige un `<a … href="#/construir">` con «Todas las lecciones» y `<span aria-hidden="true">‹</span>`, sin `hidden` ni `nav-desktop-only` en la etiqueta, y que aparezca antes de `build-review-empty`. En `tests/precache.test.js`, renombrar la prueba de caché a `'la caché sube a v28 (arreglo del repaso)'` y esperar `'v28'`.
- [ ] **Step 2:** `npm test` → FAIL en esas dos.
- [ ] **Step 3:** Insertar el marcado de las Global Constraints como primer hijo de `#build-review`; `CACHE_VERSION = 'v28'`.
- [ ] **Step 4:** `npm test && npm run lint` → PASS. Sin commit.

### Task 2: Recorrido y entrega

- [ ] **Step 1:** Recorrido en Chromium sin interfaz (servidor local, perfil en el scratchpad y borrado al terminar), a 360 y 1280 px: Inicio → «Repasar» → enlace → ruta visible; ruta → «Repasar» → enlace; con repaso vacío y con una tarjeta pendiente a mitad de responder; solo teclado (Tab llega al enlace con foco visible); sin conexión tras la primera carga.
- [ ] **Step 2:** Mostrar al usuario el diff, las pruebas y el recorrido. Con su visto bueno: commit, push y PR.
