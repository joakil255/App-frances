# Etapa 1 — Esqueleto responsive y PWA: diseño

**Intención.** Dejar el armazón de la app: cinco pantallas vacías con navegación, instalable en Android y usable sin conexión, con la identidad visual definitiva (`DESIGN.md`). Las etapas siguientes rellenan pantallas sin tocar esta base.
**No-objetivos:** lógica de estudio, palabras, guardado de datos, selector manual de tema. **Anti-objetivos:** que la app se quede con una versión vieja sin avisar; que algo dependa de internet después de la primera carga.

## Decisiones

| Tema | Decisión | Alternativa | Motivo |
|---|---|---|---|
| Dirección visual | «Métro» (`DESIGN.md`) — **elegida por el usuario** | «Cahier Seyès» | Preferencia del usuario |
| Navegación | Direcciones con `#` (`#/vocabulario`) — **elegida** | Direcciones limpias (History API) | Funciona en GitHub Pages sin trucos y sin conexión |
| Caché | Copia completa con versión, sirve desde caché — **elegida** | Red primero; actualización silenciosa | Abre al instante sin conexión; permite el botón |
| Actualización | Aviso «Hay una versión nueva» + botón **Actualizar** — **elegida** | Silenciosa al reabrir | Nunca cambia a mitad de algo |
| Fuentes | `.woff2` en `fonts/` con licencia OFL — **elegida** | Fuentes del sistema | Mismo aspecto en todo dispositivo, sin conexión |
| Tema | Sigue al sistema (`prefers-color-scheme`) | Selector manual | El selector necesita guardar datos: etapa de configuración |
| Publicación | GitHub Pages desde la rama `etapa-1-pwa`; vuelve a `main` tras el merge | Probar por USB | Pedido por el usuario (repo ya público) |
| Auditoría | PageSpeed Insights por su API — **permitido por el usuario** | Chromium local | Sin instalar nada; Lighthouse ya no tiene categoría PWA |

## Qué se construye

- **Pantallas y direcciones:** Inicio `#/`, Vocabulario `#/vocabulario`, Estudiar `#/estudiar`, Quiz `#/quiz`, Progreso `#/progreso`. Ids en código: `home`, `vocabulary`, `study`, `quiz`, `progress`. Una dirección desconocida o vacía muestra Inicio. Se ignoran mayúsculas y la barra final.
- **`index.html`:** enlace «Saltar al contenido», `<nav aria-label="Principal">` con cinco `<a href="#/…">`, y `<main>` con cinco `<section>` (solo la activa visible, el resto `hidden`). Cada sección lleva su placa (`<h1 tabindex="-1">`) y una frase de pantalla vacía:
  Inicio «Bonjour. Aquí verás cada día lo que te toca repasar.» · Vocabulario «Todavía no hay palabras. Aquí aparecerá la lista para explorar.» · Estudiar «Aquí estudiarás cada palabra: leerla, escucharla y entender su significado.» · Quiz «Aquí pondrás a prueba lo que has aprendido.» · Progreso «Aquí verás cuánto has avanzado.»
- `<script type="module" src="js/app.js">`; `<meta name="theme-color">` claro `#233A7A` y oscuro `#1A2B5C` (con `media`).
- **Al cambiar de pantalla:** se actualizan `hidden` y `aria-current="page"`, el título de la pestaña («Vocabulario · App de francés») y el foco pasa al `<h1>` de la pantalla (no en la primera carga).
- **Service worker (`sw.js`, en la raíz, script clásico sin `import`):** `CACHE_VERSION = 'v1'` (se sube a `v2`, `v3`… en cada cambio), lista `PRECACHE_URLS` con todos los archivos de la app (rutas relativas, `index.html` incluido; no `./`).
  - *install*: guarda la lista completa en la caché `app-frances-<versión>`; si falta un archivo, la instalación falla entera (la versión anterior sigue funcionando); no se activa solo.
  - *activate*: borra las cachés `app-frances-*` de otras versiones y toma el control.
  - *fetch* (solo GET del mismo origen; lo demás no se toca): las navegaciones (abrir o recargar la app) reciben siempre `index.html` de la caché; el resto responde desde la caché y, si no está, va a la red.
  - *message* `SKIP_WAITING`: se activa (lo envía el botón **Actualizar**).
- **Página:** registra `./sw.js`; si hay un service worker nuevo esperando **y** la página ya estaba controlada por uno (no en la primera instalación), muestra el aviso (`role="status"`); al pulsar **Actualizar** envía `SKIP_WAITING` y recarga una sola vez cuando cambia el controlador.
- **Manifiesto:** se añaden `id: "./"`, `scope: "./"`, `theme_color: "#233A7A"`, `background_color: "#FAFBFC"`, `description`, e iconos 192 y 512 (`purpose: "any"`) y 512 *maskable*.
- **Iconos (`icons/`):** `icon.svg` (también favicon) y `icon-maskable.svg`, con la «ç» en trazos (extraída de Source Serif 4 con `fonttools`, una sola vez; no se guarda el script). PNG generados con `rsvg-convert`; el comando queda en el README.
- **Pages:** al empezar, Claude publica la rama `etapa-1-pwa` (`gh api …/pages`); tras el merge la cambia a `main`.
- **Otros:** `.nojekyll` (Pages sirve los archivos tal cual), `.superpowers/` en `.gitignore`, globales `serviceworker` para `sw.js` en ESLint.

## Estructura nueva

```
index.html  sw.js  manifest.webmanifest  DESIGN.md  .nojekyll
css/styles.css           tokens de DESIGN.md, claro/oscuro, móvil y ≥ 900 px
js/app.js                arranque: navegación + registro del service worker
js/lib/router.js         resolveRoute(hash) → id de pantalla (lógica pura)
js/update.js             aviso de versión nueva y botón Actualizar
fonts/                   5 .woff2 + licencias OFL
icons/                   icon.svg, icon-maskable.svg, icon-192.png, icon-512.png, icon-maskable-512.png
```

## Pruebas

- **Automáticas (`node --test`, sin dependencias nuevas):**
  - `resolveRoute`: cada dirección, vacía, `#`, `#/`, mayúsculas, barra final, desconocida.
  - `sw.js` ejecutado en `node:vm` con un entorno falso (`self`, `caches`, `fetch`): guarda la lista al instalar, borra cachés viejas al activar, responde desde caché, devuelve `index.html` sin conexión, ignora peticiones de otros orígenes, `SKIP_WAITING` llama a `skipWaiting`.
  - Lista de caché: cada archivo existe en el disco, y cada `.css`, `.js`, `.woff2`, `.svg` y `.png` de `css/`, `js/`, `fonts/` e `icons/`, más `index.html` y el manifiesto, está en la lista (las licencias `.txt` no se guardan en caché).
  - Iconos: los PNG miden lo que dice el manifiesto (cabecera PNG leída con `node:fs`).
  - Manifiesto e `index.html`: campos de instalación y rutas relativas.
- **Manuales (pasos en el README):** navegación a 360 px y 1280 px (modo responsive del navegador), teclado (Tab, Intro, foco visible), tema oscuro, instalación en Android, modo avión, aviso de actualización.
- **Auditoría:** PageSpeed Insights (móvil y computador) sobre la dirección de Pages; se muestran las puntuaciones reales.

## Riesgos

1. Olvidar subir `CACHE_VERSION` al cambiar archivos → el teléfono no se actualiza. Mitigación: paso obligatorio en el README. Las pruebas no pueden detectarlo.
2. No puedo ver la app en un navegador real: la navegación a 360/1280 px y la instalación las comprueba el usuario siguiendo el README; PageSpeed da capturas del móvil como evidencia parcial.
3. GitHub Pages tarda unos minutos en publicar y su caché HTTP puede servir un `sw.js` viejo durante ~10 min.
4. La «ç» del icono a 24 px se distingue menos (aceptado al verla).
