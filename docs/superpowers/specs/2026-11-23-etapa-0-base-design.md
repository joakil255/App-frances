# Etapa 0 — Diseño de la base

**Intención.** App personal (PWA) para estudiar vocabulario francés A1 y, de paso, aprender a programar. Una sesión: leer la palabra, escucharla, ver su significado y una frase de contexto. Más adelante: ejercicios de escritura, traducción y habla, y agregar palabras propias.
**Objetivo de la etapa 0:** dejar decidida la base y crear el esqueleto mínimo con pruebas funcionando. **No-objetivos:** pantallas de estudio, algoritmo de repaso, *service worker*, iconos, publicación. **Anti-objetivo:** dependencias o herramientas que el usuario no entienda.

## Decisiones

| Tema | Decisión | Alternativa | Motivo |
|---|---|---|---|
| Stack | HTML + CSS + JS con módulos nativos, sin build (opción A, **elegida por el usuario**) | Vite + plugin PWA; Vite + Preact/Svelte | Cero dependencias en la app; lo que se escribe es lo que corre; mejor para aprender |
| Datos | `localStorage`, encapsulado en `js/lib/storage.js` | IndexedDB | Pocos KB de datos; API simple; aislado para cambiarlo luego |
| Pruebas | `node --test` (incluido en Node) | Vitest, Jest | Sin dependencias; suficiente para lógica pura |
| Servidor local | `python3 -m http.server 8000` | Script propio con `node:http` | Ya instalado, cero código; el *service worker* exige `http://localhost`, no `file://` |
| Linter | ESLint (`eslint`, `@eslint/js`, `globals`; solo desarrollo) — **elegido por el usuario** | `node --check` (cero dependencias) | Detecta variables sin definir y errores comunes, no solo sintaxis |
| Audio | Voz del sistema (`speechSynthesis`) — etapa futura | Grabaciones propias | Sin archivos ni licencias |

## Estructura de carpetas (se sirve la raíz)

```
index.html              página de entrada (etapa 0: "en construcción")
manifest.webmanifest    datos de instalación de la PWA
css/styles.css          estilos
js/app.js               arranque y pantallas
js/lib/                 lógica pura y probada (repaso, almacenamiento, validación)
js/data/words.js        lista inicial de palabras
tests/*.test.js         pruebas automáticas
docs/superpowers/       diseños y planes
package.json            scripts y ESLint (solo desarrollo)
```
En la etapa 0 solo se crean `index.html`, `manifest.webmanifest`, `package.json`, `tests/manifest.test.js` y el README. Las demás carpetas aparecen cuando una etapa las necesite.

## Modelo de datos (se define ahora, se implementa en etapas siguientes)

- **Palabra** (en `words.js`, no se guarda): `{ id: "maison", fr: "la maison", es: "la casa", gender: "f" | "m" | null, type: "noun" | "verb" | …, exampleFr, exampleEs, source: "builtin" | "user", needsReview: false }`. `id` fijo para que el progreso sobreviva a cambios en la lista; `needsReview` = marca REVISAR.
- **Tarjeta** = palabra + tipo de ejercicio: `{ id: "maison:reading", wordId, exercise: "reading" | "writing" | "translation" | "speaking", box: 1–5, dueDate: "2026-11-23", lastReviewedAt: null | ISO }`. Cada ejercicio tiene su propio repaso.
- **Historial**: una entrada por respuesta `{ at: ISO, cardId, correct: true | false }`. ~20 al día ≈ 600 KB/año; cabe en el límite de ~5 MB.
- **Configuración**: `{ newPerDay: 10, speechRate: 0.9, voiceURI: null }`.
- **Guardado**: una sola clave `app-frances` con `{ schemaVersion: 1, cards, history, settings, userWords: [] }`. `schemaVersion` permite migrar datos sin perderlos.

## Pruebas y comandos

- **Automático** (`node --test`): toda la lógica de `js/lib/` y la validación de `words.js` (ids únicos, sustantivos con artículo, acentos, campos vacíos, lista grande). El almacenamiento se prueba con un objeto falso que imita `localStorage`. En la etapa 0, una prueba de ejemplo real: `manifest.webmanifest` es JSON válido y tiene `name`, `start_url`, `display: "standalone"` y `lang: "es"` (la interfaz está en español).
- **Manual** (lista en el README): interfaz, modo sin conexión (Chrome DevTools → Offline), instalación y voz en Android.
- **Comandos**: `npm start` (servidor local), `npm test` (pruebas), `npm run lint` (ESLint). **No hay paso de construcción**: los archivos del repositorio *son* la app.

## Riesgos

1. Voz sin conexión: solo si Android tiene descargada la voz francesa; calidad variable.
2. Reconocimiento de voz (habla): en Chrome suele enviar audio a Google y requiere conexión. Decidir en esa etapa.
3. Borrar datos del navegador borra el progreso. Mitigación futura: exportar/importar copia en JSON y `navigator.storage.persist()`.
4. *Service worker* con caché desactualizada: versionar el nombre de la caché; mantener la lista de archivos a mano.
5. Errores en el francés de la lista inicial: marcar REVISAR; el usuario revisa.
6. Instalar en Android exige HTTPS: hace falta publicar (p. ej. GitHub Pages, repositorio público).
7. `DESIGN.md` no existe y `CLAUDE.md` lo exige para pantallas nuevas.

## Decisiones del usuario

1. ~~**Linter**~~ → decidido: ESLint.
2. **Publicación**: ¿GitHub Pages (gratis, HTTPS, el código queda público) u otro? Se decide antes de la etapa de instalación.
3. **Algoritmo de repaso**: cajas de Leitner (5 cajas: 1, 2, 4, 8, 16 días; fácil de entender) **o** SM-2 (más preciso, más difícil). Recomendación: Leitner. Se implementa en una etapa posterior.
4. **`DESIGN.md`**: ¿lo escribimos juntos antes de la primera pantalla?
