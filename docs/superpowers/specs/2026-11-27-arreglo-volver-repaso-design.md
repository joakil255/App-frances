# Arreglo: volver desde el repaso de Construir — diseño corto (aprobado)

> **Estado:** aprobado por el usuario el 27/11/2026.

- **Intención:** desde `#/construir/repaso` no hay forma visible de volver a la ruta de lecciones; en el móvil la barra no tiene Construir y solo queda el «atrás» del navegador (hallazgo del recorrido de la Etapa 16, 20 fallas).
- **Objetivo:** el mismo enlace que ya tiene cada lección, «‹ Todas las lecciones» a `#/construir`, al principio de `#build-review`.
- **No-objetivos:** cambiar la barra de navegación; botón de «atrás en el historial»; otros cambios de pantalla.
- **Anti-objetivo:** un enlace que no se vea o no se pueda tocar en el móvil.
- **Restricciones:** mismo marcado y clase (`.build-back` + `.text-link`, 44 px de alto, subrayado, «‹» con `aria-hidden`, según DESIGN.md); sin CSS nuevo; `CACHE_VERSION` sube a `v28` porque `index.html` está en la precarga.
- **Enfoques:** enlace igual al de las lecciones (**elegido**); «atrás» del historial (descartado: el destino cambia según de dónde vengas); Construir en la barra del móvil (descartado: cambia toda la navegación por un caso).
- **Pruebas:** `tests/index-html.test.js` comprueba el enlace dentro de `#build-review`; `tests/precache.test.js` comprueba `v28`. Recorrido a 360 y 1280 px: llegar al repaso desde Inicio y desde la ruta con toques, volver con el enlace, solo teclado, sin conexión.
- **Commits:** ninguno hasta que el usuario vea el resultado.
