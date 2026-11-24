# Lighthouse (Etapa 7)

Medido con **PageSpeed Insights** (el Lighthouse de Google en sus servidores), porque en el computador de desarrollo no hay ningún navegador de la familia de Chrome: Chrome for Testing descargado aparte se cerraba con un fallo al arrancar (código 139).

## Antes (versión publicada en `main`)

- **Dirección:** https://joakil255.github.io/App-frances/
- **Fecha:** 23/11/2026, 21:06 (GMT-3). Lighthouse 13.6.0, HeadlessChromium 157, **móvil** (Moto G Power simulado, 4G lenta). Medido por el usuario; capturas revisadas.

| Categoría | Puntuación |
|---|---|
| Rendimiento | 98 |
| Accesibilidad | 100 |
| Prácticas recomendadas | 100 |
| SEO | 100 |

| Métrica | Valor |
|---|---|
| First Contentful Paint | 0,8 s |
| Largest Contentful Paint | 0,8 s |
| Total Blocking Time | 110 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 3,4 s (naranja) |

**Avisos («Insights»):**

| Aviso | Qué significa | Qué se hizo |
|---|---|---|
| Render-blocking requests (ahorro estimado 110 ms) | La hoja de estilos y las fuentes se descargan antes de dibujar | Nada por ahora: son necesarias para dibujar bien. Propuesta: precargar las dos fuentes principales (`<link rel="preload" as="font">`) y medir el efecto en el «después» |
| Network dependency tree | Cadena de archivos que se piden unos tras otros (página → estilos → fuentes; página → `app.js` → módulos) | Igual que el anterior: se medirá en el «después» |
| Use efficient cache lifetimes (146 KiB) | GitHub Pages pide al navegador guardar los archivos solo 10 minutos | **No se puede cambiar** en GitHub Pages. No afecta a las visitas siguientes: el service worker sirve toda la app desde su propia caché |

## Después (Etapa 7 publicada en `main`, commit `d1c19a3`)

- **Fecha:** 23/11/2026, 21:40. PageSpeed Insights, **móvil**, misma dirección. Medido por el usuario; capturas revisadas.

| Categoría | Antes | Después |
|---|---|---|
| Rendimiento | 98 | 100 |
| Accesibilidad | 100 | 100 |
| Prácticas recomendadas | 100 | 100 |
| SEO | 100 | 100 |

**Avisos:** los mismos que antes. Render-blocking requests con un ahorro estimado de 140 ms (antes, 110 ms); network dependency tree; use efficient cache lifetimes con 153 KiB (antes, 146 KiB: la diferencia son los tres módulos nuevos, `backup.js`, `messages.js` y `home.js`).

**Lectura:** esta etapa **no cambió nada de rendimiento**, así que la subida de 98 a 100 es la variación normal entre dos mediciones, no una mejora. Lo que importa es que no empeoró nada. Las capturas del «después» no muestran las métricas detalladas (FCP, LCP, TBT, CLS, Speed Index), por eso no se anotan.
