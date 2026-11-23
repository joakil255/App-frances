# Etapa 3 — Flashcards con repetición espaciada: diseño

**Intención.** Estudiar cada día lo que toca: tarjetas vencidas primero y luego nuevas hasta un límite, con un programador de repasos claro, probado con casos calculados a mano, y un historial que la Etapa 5 usará para mostrar el progreso.
**No-objetivos:** quiz, estadísticas, otros ejercicios (escritura, habla), exportar el progreso, pantalla de configuración general. **Anti-objetivos:** perder progreso al cerrar la app o al cambiar de algoritmo; dar más nuevas de las configuradas por reabrir la app; que «hoy» dependa de UTC.

## Decisiones

| Tema | Decisión | Alternativa | Motivo |
|---|---|---|---|
| Algoritmos | SM-2 simplificado **y** Leitner, elegibles en ajustes; cada repaso actualiza los dos — **elegida por el usuario** | Solo SM-2 | Decisión previa del usuario; cambiar no pierde progreso |
| Tarjetas | Una por palabra y dirección (`fr-es`, `es-fr`) — **elegida** | Una por palabra | Reconocer y producir avanzan a distinto ritmo |
| Código | `js/lib/dates.js`, `scheduler.js`, `queue.js`: funciones puras | — | Requisito; se prueban sin navegador |
| Guardado | Almacén propio en la clave `app-frances-study` — **elegida** | Ampliar el documento de la Etapa 2 | No toca código probado ni migra datos |
| Respuestas | Cuatro botones iguales, «Bien» primario (opción A) — **elegida** | Un color por respuesta | Responder por lo que recuerdas, no por el color |
| Ajustes | Botón «Ajustes del estudio» en Estudiar → ventana | Pantalla de configuración | Decisión de Claude; no hay pantalla de ajustes aún |

## «Hoy» y las fechas

- `localDate(now)`: fecha **local** `AAAA-MM-DD` (getters locales de `Date`); el día cambia a medianoche en la zona horaria del dispositivo.
- Fechas de repaso como días de calendario: `addDays('2026-11-23', 3) = '2026-11-26'`, `daysBetween(a, b)` = días de `a` a `b`. Se calculan con `Date.UTC` sobre año, mes y día para que el horario de verano no las mueva.
- Una tarjeta **vence** si `due <= hoy` (comparación de textos `AAAA-MM-DD`).

## Algoritmos (funciones puras de `scheduler.js`)

Respuestas: `again` (Otra vez), `hard` (Difícil), `good` (Bien), `easy` (Fácil). **Otra vez** siempre deja la tarjeta para **hoy** (`due = hoy`), así sigue en la cola aunque se cierre la app.

**SM-2 simplificado.** Estado `{ reps, interval, ease, lapses, due }`; nueva: `{ reps: 0, interval: 0, ease: 2.5, lapses: 0, due: null }`.

| Respuesta | Facilidad | `reps` = 0 | `reps` = 1 | `reps` ≥ 2 | `reps` después |
|---|---|---|---|---|---|
| Otra vez | −0,20 | intervalo 0, vuelve hoy | ← | ← | 0 (`lapses` + 1) |
| Difícil | −0,15 | 1 | 2 | `base × 1,2` | + 1 |
| Bien | = | 1 | 3 | `base × facilidad` | + 1 |
| Fácil | +0,15 | 4 | 6 | `base × facilidad × 1,3` (facilidad ya actualizada) | + 1 |

- `base` = `interval` para Difícil; para Bien y Fácil, `interval + floor(atraso / 2)`, con `atraso = max(0, daysBetween(due, hoy))`.
- Facilidad entre **1,3 y 3,0**, redondeada a 2 decimales tras cada cambio (evita errores de coma flotante: 2,3 − 0,2 = 2,1 exacto).
- Intervalo de Difícil/Bien/Fácil con `reps ≥ 2`: `Math.round`, al menos `interval + 1`, como máximo **365**. `due = addDays(hoy, interval)`.

**Leitner.** Estado `{ box, due }`; nueva: `{ box: 0, due: null }`. Días por caja: 1 → 1, 2 → 2, 3 → 4, 4 → 8, 5 → 16. Otra vez → caja 1, vuelve hoy. Difícil → `max(1, caja)`. Bien → `caja + 1`. Fácil → `caja + 2`. Máximo caja 5. `due = addDays(hoy, días(caja))`. El atraso no cuenta.

**`review(card, answer, today, now)`** aplica **los dos** algoritmos y devuelve la tarjeta nueva (no modifica la recibida); fija `introducedOn = today` si era nueva y `lastReviewedAt = now` (ISO). **`previewDays(card, algorithm, today)`** devuelve `{ again, hard, good, easy }` en días (0 = hoy) para mostrar en los botones.

### Casos calculados a mano (hoy = 2026-11-23)

| # | Algoritmo | Antes | Respuesta | Después |
|---|---|---|---|---|
| S1 | SM-2 | nueva | Bien | reps 1, int 1, ease 2,5, due 11-24 |
| S2 | SM-2 | nueva | Difícil | reps 1, int 1, ease 2,35, due 11-24 |
| S3 | SM-2 | nueva | Fácil | reps 1, int 4, ease 2,65, due 11-27 |
| S4 | SM-2 | reps 1, int 1, ease 2,5 | Bien | reps 2, int 3, due 11-26 |
| S5 | SM-2 | reps 1, int 1, ease 2,5 | Fácil | reps 2, int 6, ease 2,65, due 11-29 |
| S6 | SM-2 | reps 2, int 3, ease 2,5, due hoy | Bien | 3 × 2,5 = 7,5 → int 8, due 12-01 |
| S7 | SM-2 | reps 3, int 8, ease 2,5, due hoy | Fácil | ease 2,65; 8 × 2,65 × 1,3 = 27,56 → int 28, due 12-21 |
| S8 | SM-2 | reps 3, int 8, ease 2,5, due hoy | Difícil | ease 2,35; 8 × 1,2 = 9,6 → int 10, due 12-03 |
| S9 | SM-2 | reps 3, int 2, ease 1,3, due hoy | Difícil | 2 × 1,2 = 2,4 → 2 → mínimo int + 1 = 3 |
| S10 | SM-2 | reps 3, int 8, ease 2,5, lapses 0 | Otra vez | reps 0, int 0, ease 2,3, lapses 1, due 11-23 (hoy) |
| S11 | SM-2 | **racha**: nueva, 7 × Otra vez | — | ease 2,3 → 2,1 → 1,9 → 1,7 → 1,5 → 1,3 → 1,3; lapses 7; due hoy |
| S12 | SM-2 | reps 2, int 1, ease 2,5 (redondeo de ,5) | Bien | 1 × 2,5 = 2,5 → 3 (Math.round redondea ,5 hacia arriba) → int 3 |
| S13 | SM-2 | **muy atrasada**: reps 3, int 10, ease 2,5, due 2026-10-01 (53 días) | Bien | base 10 + 26 = 36; 36 × 2,5 = 90 → due 2027-02-21 |
| S14 | SM-2 | muy atrasada (como S13) | Difícil | sin bonificación: 10 × 1,2 = 12, ease 2,35 |
| S15 | SM-2 | reps 5, int 200, ease 2,5 | Bien | 500 → **365** (máximo) |
| S16 | SM-2 | reps 3, int 10, ease 2,95 | Fácil | ease 3,1 → **3,0** (máximo) |
| L1 | Leitner | nueva | Bien | caja 1, due 11-24 |
| L2 | Leitner | nueva | Difícil | caja 1, due 11-24 |
| L3 | Leitner | caja 1 | Fácil | caja 3, due 11-27 |
| L4 | Leitner | caja 2 | Difícil | caja 2, due 11-25 |
| L5 | Leitner | caja 3 | Otra vez | caja 1, due hoy |
| L6 | Leitner | caja 5 | Bien | caja 5, due 12-09 (16 días) |
| L7 | Leitner | caja 4 | Fácil | caja 5 (no 6), due 12-09 |
| D1 | Fechas | `localDate(23-11-2026 23:59 local)` | — | `2026-11-23`; a las 00:00 del 24 → `2026-11-24` |
| D2 | Fechas | `addDays('2026-10-24', 2)` (cruza el cambio de hora en Europa) | — | `2026-10-26` |

## Cola diaria (`queue.js`)

`buildQueue({ words, cards, settings, today })` → lista de `{ cardId, wordId, direction, isNew }`, solo de la dirección elegida y de palabras que existen:
1. **Vencidas** según el algoritmo elegido (`due <= today`), ordenadas por `due` (más antigua primero) y, a igual fecha, por `lastReviewedAt` (las falladas hoy al final).
2. **Nuevas** (sin estado guardado), en el orden de la lista de palabras (creación), hasta `newPerDay − introducidasHoy`, donde `introducidasHoy` = tarjetas de esa dirección con `introducedOn === today`.

La cola se recalcula tras cada respuesta (si pasa la medianoche durante el estudio, entra el nuevo día). Casos de prueba: Q1 vencidas antes que nuevas; Q2 límite de nuevas; Q3 tras introducir 4 hoy quedan 6; Q4 al día siguiente vuelven a ser 10; Q5 una «Otra vez» va al final; Q6 cambia de algoritmo → cambian las vencidas; Q7 solo la dirección elegida; Q8 palabra borrada → su tarjeta no aparece; Q9 `newPerDay = 0`.

## Datos

Clave `app-frances-study`: `{ schemaVersion: 1, cards: { [id]: Card }, history: Entry[], settings }`.
- `Card`: `{ id: '<wordId>:<direction>', wordId, direction, introducedOn, lastReviewedAt, sm2, leitner }`.
- `Entry` (historial, para la Etapa 5): `{ at: ISO, date: 'AAAA-MM-DD', cardId, wordId, direction, answer, algorithm }`.
- `settings`: `{ algorithm: 'sm2' | 'leitner', direction: 'fr-es' | 'es-fr', newPerDay: 10 }`; `newPerDay` entero de 0 a 100.
- `createStudyStore(backend, { now })`: `load()` → `{ cards, history, settings, corruptBackupKey }`; `recordReview(card, entry)` guarda tarjeta e historial **en una sola escritura**; `saveSettings(settings)` valida; `watchExternalChanges(target, onChange)`. Mismas reglas que la Etapa 2: primero guardar, después cambiar la memoria; datos dañados copiados a `app-frances-study-corrupt-<ISO>`; `StorageError` si no se puede guardar.
- **Prueba de persistencia:** repasar varias tarjetas, crear otro almacén sobre el mismo `backend` (= cerrar y reabrir) y comprobar tarjetas, historial, ajustes y que la cola restante es la misma (sin nuevas extra).

## Interfaz (DESIGN.md, sección Etapa 3)

Estudiar: resumen (vencidas / nuevas, dirección y algoritmo, **Empezar**, **Ajustes del estudio**) → tarjeta (anverso con altavoz si es francés, **Mostrar respuesta**) → reverso (francés + altavoz, español, ejemplo, cuatro botones con su intervalo: «hoy», «1 día», «N días») → fin («Terminaste por hoy», respuestas de la sesión y cuántas vencen mañana). Sin palabras: «Añade palabras en Vocabulario para empezar». Ajustes: dirección (radio), algoritmo (radio con una frase de explicación) y nuevas por día (número 0–100; error junto al campo: «Escribe un número entero entre 0 y 100.»). El progreso «Tarjeta N de M» cuenta las respondidas en la sesión más las que quedan en la cola. Teclado (solo en Estudiar, sin ventana abierta y fuera de campos de texto): `Espacio`/`Intro` mostrar respuesta, `1`–`4` responder, `O` oír; las pistas de teclas solo se ven con ratón (`(hover: hover) and (pointer: fine)`). Móvil: respuestas 2 × 2 de 56 px. Audio con `speech.js` y los mismos avisos que en Vocabulario. Todo texto del usuario con `textContent`. `sw.js`: `CACHE_VERSION = 'v7'` y archivos nuevos.

## Pruebas

TDD estricto: primero cada caso de las tablas (S, L, D, Q) como prueba, verla fallar, luego el código. Además: entrada inválida (`answer` desconocida → error), `review` no muta la tarjeta recibida, `previewDays` coincide con `review`, ajustes inválidos rechazados, almacén (persistencia al reabrir, datos dañados, cuota). Manual (README): recorrido en el celular, atajos en el computador, cambio de dirección y de algoritmo, modo avión.

## Riesgos

1. El historial crece ~1 MB al año y comparte los ~5 MB de `localStorage` con las palabras: suficiente para años; la Etapa 5 puede resumirlo.
2. El progreso no entra en la exportación de la Etapa 2 (pendiente para otra etapa).
3. La interfaz no tiene pruebas automáticas: se cubre con la lista del celular y la revisión final.
4. Elegir «Leitner» después de meses en SM-2 cambia las fechas de golpe (es lo esperado: cada algoritmo tiene su calendario).
