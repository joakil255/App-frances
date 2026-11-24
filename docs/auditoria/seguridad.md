# Auditoría de seguridad (Etapa 7)

Fecha: 23/11/2026. Rama `etapa-7-publicacion` (97 archivos versionados).

## Resumen

| Tema | Resultado |
|---|---|
| Secretos en los archivos actuales | Ninguno |
| Secretos en todo el historial de git | Ninguno |
| Archivos sensibles alguna vez versionados (`.env`, `.pem`, `.key`, `id_rsa`, credenciales) | Ninguno |
| `.gitignore` | Ignora `.env`, `.env.*`, `node_modules/` y `.superpowers/` |
| Texto del usuario como HTML | Nunca: prueba automática ampliada |
| Archivos importados y copias | Se validan antes de escribir nada |
| Dependencias (`npm audit`) | 0 vulnerabilidades |
| Recursos de otros sitios | Ninguno: la app no carga nada de internet (fuentes guardadas en `fonts/`) |

## Secretos

Comandos ejecutados:

```bash
git grep -n -I -i -E "api[_-]?key|secret|token|password|passwd|BEGIN [A-Z ]*PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,}" -- . ':!package-lock.json'
git log -p --all -I -U0 | grep -E "^[+-]" | grep -i -E "<los mismos patrones>"
git log --all --name-only --pretty=format: | sort -u | grep -i -E "(^|/)\.env|\.pem$|\.key$|id_rsa|credentials|\.p12$"
```

Resultado: las únicas coincidencias son la palabra «token» en dos sentidos que no son secretos (los **tokens de color** de DESIGN.md y `css/styles.css`, y las palabras de una frase en `tests/a1-deck.test.js`). Ninguna clave, contraseña ni archivo sensible en los archivos ni en el historial.

## Texto del usuario nunca como HTML

- `tests/security.test.js` recorre todo `js/` y `sw.js` y prohíbe `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write` y, desde esta etapa, `setHTMLUnsafe` y `createContextualFragment`.
- Prueba nueva: prohíbe `setAttribute('on…')` (atributos de evento escritos como texto). Asignar una función a `.onclick` o `.onerror` se permite: no convierte texto en código.
- Comprobado en el navegador: una palabra `<b>gras</b>` se ve como texto en Vocabulario, en Progreso y tras restaurar una copia.

## Archivos que entran en la app

| Entrada | Validación antes de escribir | Pruebas |
|---|---|---|
| Importar palabras (JSON/CSV) | `readImport` + `planImport` (UTF-8, formato, cada fila con `validateWord`, duplicadas); nada cambia hasta confirmar | `tests/transfer.test.js`, `tests/csv.test.js` |
| Mazo A1 | Igual que importar | `tests/a1-deck.test.js`, `tests/deck.test.js` |
| Restaurar copia | `readBackup`: UTF-8, formato, versión, cada palabra y cada tarjeta por dentro, ajustes; `restoreBackup` deshace si falla a medias | `tests/backup.test.js` |
| Datos guardados dañados | Se copian aparte sin tocar y la app empieza de cero, con aviso | `tests/storage.test.js`, `tests/study-storage.test.js` |

## Dependencias

```
$ npm audit
found 0 vulnerabilities
```

Las 80 dependencias son **solo de desarrollo** (`eslint`, `@eslint/js`, `globals` y las suyas): sirven para revisar el código y no llegan a la app publicada ni al teléfono. No se cambió ninguna.

## Recomendaciones (no aplicadas)

- **Content-Security-Policy:** una cabecera o `<meta>` que solo permita cargar archivos del propio sitio añadiría una segunda barrera. No se aplicó porque la prueba de arriba ya impide convertir texto en HTML, y la gráfica de Progreso usa un estilo en línea (`flex-basis`) que obligaría a permitir `'unsafe-inline'` en estilos. Es una decisión tuya para el futuro.
