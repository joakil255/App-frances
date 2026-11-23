# Etapa 4 — Quiz: diseño

**Intención.** Poner a prueba lo aprendido con tres modos en los que la app comprueba la respuesta: elegir la traducción, escribir en francés y escribir una frase dictada. Es práctica: no cambia el calendario de Estudiar, pero cada respuesta queda en el mismo historial que usará Progreso (Etapa 5).
**No-objetivos:** cambiar las fechas de repaso de Estudiar; modos mezclados en una sesión; teclado de acentos propio; repetir solo las falladas; reconocimiento de voz; estadísticas (Etapa 5). **Anti-objetivos:** dar por mala una respuesta correcta por mayúsculas, espacios, puntuación o el apóstrofo tipográfico; opciones repetidas o dos opciones iguales a la correcta; un segundo historial o entradas que copien el texto de las palabras.

## Decisiones

| Tema | Decisión | Alternativa | Motivo |
|---|---|---|---|
| Modos | (a) opción múltiple francés → español; (b) escribir: ves el español y escribes el francés con artículo; (c) dictado — **elegidos por el usuario** | (b) francés → español | (a) reconoce y (b) produce; (b) y (c) usan la misma comparación |
| Dictado | Solo la frase de ejemplo — **elegida por el usuario** | Palabra o frase al azar; solo la palabra | Entrena el oído con frases |
| Efecto en Estudiar | Ninguno: el quiz es práctica — **elegido por el usuario** | Contar como repaso | La opción múltiple es más fácil que recordar; no debe alargar intervalos |
| Palabras de la sesión | Primero estudiadas (al azar) y, si faltan, el resto (al azar); sin repetir — **elegido por el usuario** | Solo estudiadas; todas al azar | Pone a prueba lo aprendido y hay 10 preguntas desde el primer día |
| Construcción | Funciones puras + el mismo almacén e historial de la Etapa 3 — **elegida por el usuario** | Almacén aparte; motor común con Estudiar | Un solo historial sin rehacer lo que funciona |
| Sesión | Un modo por sesión, elegido al entrar — decisión de Claude | Modos mezclados | Más simple y claro |
| Acentos | Interruptor «Exigir acentos», apagado por defecto — decisión de Claude | Encendido | En el teclado del teléfono cuesta escribirlos |
| «No lo sé» | Botón en (b) y (c) que cuenta como fallada — decisión de Claude | Obligar a escribir algo | Un principiante necesita poder pasar sin inventar |

## Comparación de respuestas (`js/lib/answer-check.js`, función pura)

`checkAnswer(typed, expected, { requireAccents })` → `{ correct: boolean, accentOnly: boolean }`.

1. **Normalizar** (`normalizeAnswer`) las dos: Unicode NFC; minúsculas; `’` `‘` `ʼ` → `'`; quitar los espacios junto a un apóstrofo (`l' ami` → `l'ami`); cambiar por espacio la puntuación `. , ; : ! ? ¿ ¡ « » " … ( )`; todo espacio (también el no separable U+00A0 y el fino U+202F que el francés pone antes de `?`) cuenta como uno; recortar. El guion **cuenta** (`grand-père` ≠ `grand père`).
2. Si son iguales → `{ correct: true, accentOnly: false }`.
3. Si no, **quitar marcas** (`foldAccents`: NFD sin diacríticos, `œ` → `oe`, `æ` → `ae`) a las dos. Si entonces son iguales → error solo de acento: `{ correct: !requireAccents, accentOnly: true }`.
4. Si no → `{ correct: false, accentOnly: false }`. Una respuesta vacía siempre es `{ correct: false, accentOnly: false }`.

| # | Escrito | Esperado | Resultado |
|---|---|---|---|
| C1 | `ete` | `été` | solo acento: acierto si se toleran, fallo si se exigen |
| C2 | `l’ami` / `l'ami` | `l'ami` / `l’ami` | acierto (en los dos sentidos) |
| C3 | `le  chat ` (espacios dobles, tabulador, salto de línea, U+00A0) | `le chat` | acierto |
| C4 | `LE CHAT`, `ÉTÉ` | `le chat`, `été` | acierto |
| C5 | `bonjour marie ça va` | `Bonjour, Marie, ça va ?` (con U+202F) | acierto |
| C6 | `bonjour marie ca va` | ídem | solo acento (`ç`) |
| C7 | `le chien`; `chat` | `le chat` | fallo (falta el artículo = fallo) |
| C8 | `''`, `'   '` | `le chat` | fallo, sin acento |
| C9 | `l'oeuf` | `l'œuf` | solo acento |
| C10 | `le grand pere` | `le grand-père` | fallo (el guion cuenta) |
| C11 | `e` + U+0301 (é descompuesta) | `é` | acierto |
| C12 | `élève` | `élevé` | solo acento (`è` por `é` y al revés) |
| C13 | `l' ami`, `l ’ami` | `l'ami` | acierto |

## Lógica del quiz (`js/lib/quiz.js`, funciones puras; el azar entra como parámetro `random`)

- `QUIZ_LENGTH = 10`; `MODES = ['choice', 'write', 'dictation']`.
- `modeStatus({ words, hasVoice })` → `{ choice, write, dictation }`, cada uno `{ available, reason }`:
  - sin palabras → los tres no disponibles: «Añade palabras en Vocabulario para empezar.»
  - `choice`: hacen falta **4 traducciones distintas** (comparadas con `normalizeAnswer`, sin quitar acentos): «Necesitas al menos 4 palabras con traducciones distintas.»
  - `dictation`: hace falta una palabra con `exampleFr`: «Ninguna de tus palabras tiene frase de ejemplo. Añádelas en Vocabulario.»; y voz francesa: «Este dispositivo no tiene voz francesa.» (y en la pantalla, los pasos de siempre para instalarla).
- `pickQuizWords({ words, cards, mode, random, count = QUIZ_LENGTH })`: candidatas = todas (dictado: solo con `exampleFr`). **Estudiadas** = con alguna tarjeta en `cards` (cualquier dirección). Se barajan las estudiadas y el resto por separado (Fisher–Yates con `random`), se juntan (estudiadas primero) y se toman `count`. Sin repetir; con menos candidatas, la sesión es más corta.
- `buildChoiceOptions({ word, words, random })` → 4 opciones `{ wordId, text, isCorrect }` barajadas: la correcta (`word.es`) y 3 distractores de **otras palabras del usuario** cuyo texto normalizado no coincide con el de la correcta ni entre sí.
- `expectedAnswer(word, mode)`: `write` → `word.fr`; `dictation` → `word.exampleFr`.
- `summarizeQuiz(results)` → `{ total, correct, failed: results falladas en orden }`. Un acierto con solo-acento tolerado cuenta como acierto.

Casos de prueba (con un `random` fijo para que el orden sea predecible): QZ1 estudiadas primero; QZ2 se completa con no estudiadas; QZ3 sin repetir y con menos de 10 palabras sale más corta; QZ4 dictado solo con ejemplo; QZ5 opciones: 4, una correcta, distractores distintos de la correcta y entre sí (también con traducciones repetidas y diferencias solo de mayúsculas o espacios en la lista); QZ6 `modeStatus` con 0 palabras, 3 palabras, 4 palabras con 2 traducciones iguales, sin ejemplos y sin voz; QZ7 resumen.

## Datos (mismo almacén `app-frances-study` de la Etapa 3)

- **Historial:** nuevas entradas `{ kind: 'quiz', at: ISO, date: 'AAAA-MM-DD', wordId, mode: 'choice' | 'write' | 'dictation', correct, accentOnly }`. No se guarda el texto de la palabra ni lo escrito (sin duplicar datos). Las entradas de Estudiar no cambian; **una entrada sin `kind` es de Estudiar** (regla para la Etapa 5).
- `recordQuizAnswer(entry)`: añade la entrada en **una** escritura; mismas reglas: primero guardar; `StorageError` si no se puede, y entonces nada cambia.
- **Ajustes:** `settings.requireAccents` (booleano, por defecto `false`). Un documento guardado sin ese campo es válido y carga con `false` (no se trata como dañado). `saveSettings(input)` pasa a **mezclar** con los ajustes actuales antes de validar, para que guardar los ajustes de Estudiar no borre `requireAccents` ni al revés. Valor no booleano → error «Elige si se exigen acentos.».
- No se toca `cards`: el quiz no cambia las fechas de repaso.

## Interfaz (DESIGN.md, sección Etapa 4)

1. **Inicio del quiz:** tres botones de modo grandes («Opción múltiple», «Escribir en francés», «Dictado»), cada uno con una línea que explica qué harás; si no está disponible, el botón se desactiva y el motivo se lee debajo. Casilla «Exigir acentos» con una frase de ayuda.
2. **Pregunta:** «Pregunta N de M» y barra (color de línea del Quiz), tarjeta como la de Estudiar.
   - (a) francés con altavoz; cuatro opciones a lo ancho (56 px). Al tocar una, se responde.
   - (b) español; campo «Escribe en francés (con artículo)»; **Comprobar** (primario) y **No lo sé**.
   - (c) la frase suena al aparecer la pregunta; **Oír** y **Oír lento**; campo «Escribe lo que oyes»; **Comprobar** y **No lo sé**.
   - Campos: `lang="fr"`, `autocapitalize="none"`, `autocorrect="off"`, `spellcheck="false"`, `autocomplete="off"`, `enterkeyhint="done"`. `Intro` comprueba. Vacío → «Escribe tu respuesta o pulsa «No lo sé».» junto al campo (no cuenta).
3. **Respuesta (inmediata):** título con símbolo y texto, nunca solo color: «✓ Correcto», «✓ Correcto, pero ojo con el acento», «✗ Solo te falló el acento», «✗ Incorrecto». Debajo: respuesta correcta (francés con altavoz), «Escribiste: …» en (b) y (c), y la frase de ejemplo con su traducción (en el dictado: la palabra y su traducción). En (a) la opción correcta lleva «✓ Correcta» y la elegida mal «✗ Tu respuesta». **Siguiente** (o **Ver resumen** en la última); el foco va al título de la respuesta.
4. **Resumen:** «Acertaste N de M» y la lista de falladas (pregunta → respuesta correcta; en (b) y (c) también lo escrito). **Otro quiz** vuelve al inicio del quiz.
- **Detalles decididos por Claude:** las palabras de la sesión se eligen al pulsar el modo y no cambian durante la sesión; las opciones de (a) se generan al mostrar cada pregunta; el ajuste «Exigir acentos» se guarda al marcarlo (si falla, aviso y la casilla vuelve a su valor) y vale para toda la sesión que empieza; **No lo sé** se guarda como fallada y en el resumen no muestra «Escribiste»; la entrada se fecha con `localDate(now())`; en (a) `accentOnly` es siempre `false`; sin atajos de teclado aparte de `Intro` (comprobar en el campo y **Siguiente** con el foco en él).
- Entrar en `#/quiz` siempre muestra el inicio del quiz (las respuestas ya están guardadas). Si no se puede guardar una respuesta: aviso y la pregunta no avanza. Todo texto del usuario con `textContent`. Voz con `voice.js` (mismos avisos). `sw.js`: `CACHE_VERSION = 'v9'` y archivos nuevos.

## Pruebas

TDD estricto: primero C1–C13, QZ1–QZ7 y las del almacén (entrada de quiz en una escritura, `requireAccents` por defecto y en documentos antiguos, mezcla al guardar, valor inválido, cuota), verlas fallar y luego el código. HTML de la pantalla con pruebas como en la Etapa 3. Manual (README): en el celular con el teclado en pantalla (el campo no queda tapado, sin mayúscula automática, acentos con pulsación larga) y el audio del dictado; en el computador con teclado.

## Riesgos

1. El teclado en pantalla puede tapar el campo o los botones en teléfonos pequeños: se comprueba a mano.
2. Chrome puede no dejar sonar la voz sin un toque previo: el dictado suena tras **Empezar**/**Siguiente** (que son toques) y siempre hay **Oír**.
3. Comprobar la voz es asíncrono (hasta 2 s): el dictado aparece como «Comprobando la voz…» mientras tanto.
4. `normalizeAnswer` no corrige faltas de ortografía: solo mayúsculas, espacios, puntuación, apóstrofo y (si se toleran) acentos.
