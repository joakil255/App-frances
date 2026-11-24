# Mejoras de la auditoría externa (A y B): diseño corto

**Origen.** Una IA externa auditó la app publicada. Verificado contra el código (23/11/2026): de las cuatro prioridades del usuario —apóstrofos y espacios en el Quiz, teclado móvil, botones de Estudiar en pantallas táctiles y aviso de voz francesa— tres ya estaban hechas desde las Etapas 3, 4 y 7. Quedan dos lagunas reales:

- **A — Teclado móvil en Vocabulario.** Los campos en francés del formulario «Añadir palabra» (`index.html:335` `form-fr`, `:360` `form-example-fr`) no tienen los atributos que sí tiene el Quiz (`index.html:214`). Gboard pone mayúscula inicial y corrige palabras francesas al español.
- **B — Normalizar la palabra al guardar.** `validateWord` guarda «l’ami» o «l' ami» tal cual, y `duplicateKey` (`js/lib/words.js`) no trata «l' ami» como igual a «l'ami».

**Aprobado por el usuario.** Cada mejora va en su propia rama, con las pruebas primero.

| Mejora | Decisión |
|---|---|
| A | `form-fr`: `autocapitalize="none" autocorrect="off" spellcheck="false"`. `form-example-fr`: `autocapitalize="sentences" autocorrect="off" spellcheck="false"` (las frases empiezan con mayúscula). Una prueba del HTML lo exige. |
| B | Al guardar, el campo **Francés** (`fr`) convierte `’ ‘ ʼ` en `'` y quita los espacios junto al apóstrofo: «l’ami», «l' ami» y «l ’ami» → «l'ami». `duplicateKey` aplica lo mismo, así que una palabra ya guardada como «l’ami» se reconoce como duplicada de «l'ami». **El ejemplo no se toca** (una comilla recta puede ser una cita, `Il dit 'oui'.`) — decisión de Claude. Las palabras ya guardadas no cambian hasta que se editan. |

**No-objetivos:** separar artículo y sustantivo, conjugación, conectar el Quiz con Estudiar y cambiar el umbral de «dominada» (pendientes de aprobación, tocan datos o decisiones anteriores).
**Modelo de datos:** ninguno de los dos cambios lo toca (`schemaVersion` sigue en 1); no hace falta migración.
