# Etapa 13 — Lecciones 7 a 9 de Construir frases: diseño corto (borrador)

> **Estado:** **borrador, pendiente de aprobación del usuario.** No hay código. Las decisiones del usuario son del 25/11/2026. Lo marcado como **decisión del diseño** es una propuesta que el usuario puede corregir.

## Intención
Terminar la primera tanda de Construir frases (Etapa 12) con los temas A1 que faltan: adjetivos, verbos irregulares frecuentes, futuro próximo y la forma educada de pedir. La mecánica ya funciona en el teléfono; esta etapa es contenido.

## Decisiones del usuario
1. Hacer las lecciones 7 y 8 del orden original con la misma mecánica de la Etapa 12.
2. **Dividir la lección 8 en dos:** 8 = *aller* y *faire* + futuro próximo; 9 = *vouloir, pouvoir, devoir* + infinitivo y *je voudrais*.
3. Enfoque: solo agregar lecciones como datos (sin tipos de ejercicio nuevos).

## Enfoques considerados
| Enfoque | Qué cuesta | Resultado |
|---|---|---|
| **Agregar las lecciones como datos con la mecánica actual** | Solo contenido, pruebas de contenido y la caché | **Elegido** |
| Un tipo de ejercicio nuevo (tabla de conjugación) | Programar y probar otra vez la pantalla; nadie lo pidió | Descartado |
| Lecciones generadas por IA | Contradice el contenido fijo, revisable y con fuentes | Descartado |

## Objetivos
- Tres lecciones nuevas en `data/lessons/fr/`: `fr-a1-07`, `fr-a1-08` y `fr-a1-09`, en el mismo formato y con las mismas cuentas que las lecciones 1 a 6:
  - 4 a 6 ejemplos;
  - 8 a 10 ejercicios, con al menos 2 de cada tipo;
  - 1 o 2 situaciones con 2 a 4 modelos.
- Sus secciones en `docs/contenido/construir-frases.md`.
- La prueba de contenido exige 9 lecciones en orden.
- La caché sube a `v23`, con los tres archivos en la precarga.

## Contenido
| # | Título | Contenido | Áreas |
|---|---|---|---|
| 7 | Los adjetivos | Concordancia en género y número (*petit, petite, petits, petites*); los que ya terminan en *-e* no cambian en femenino (*rouge*); posición: la mayoría va después (*une voiture rouge*, *une amie chilienne*) y unos pocos cortos y frecuentes van antes (*grand, petit, bon, jeune, joli, mauvais*) | Gramática, sintaxis, ortografía |
| 8 | *Aller*, *faire* y el futuro próximo | Presente de *aller* y *faire*; futuro próximo *aller* + infinitivo (*je vais manger*); su negación (*je ne vais pas manger*); *aller au / à la* (repasa la lección 3) | Gramática, sintaxis |
| 9 | Querer, poder y deber | Presente de *vouloir, pouvoir, devoir*; + infinitivo (*je peux venir*); *je voudrais* + sustantivo o infinitivo para pedir con educación, y la diferencia con *je veux* | Gramática, sintaxis |

**Decisión del diseño:** quedan fuera de A1, y por eso de esta etapa:
- las formas *bel, nouvel, vieil* y los femeninos irregulares (*belle, vieille, nouvelle*);
- *beau, vieux* y *nouveau*, salvo que una fuente los confirme como A1. Si no se confirman, se dejan fuera en vez de marcarlos REVISAR.

## Fuentes y verificación (iguales que en la Etapa 12)
1. **Inventaire:** anexo D, págs. 49–52; anexo E, págs. 56–57; anexo F, págs. 62–67.
   - Los adjetivos (place et accords): A1 clave.
   - *devoir, pouvoir, vouloir* + infinitivo: A1 clave.
   - Futuro próximo: A1 clave.
   - *Je voudrais* como condicional de cortesía: A1 clave.
2. **Niveau A2 pour le français**, capítulo 5:
   - pág. 106: flexión de *aller, vouloir, pouvoir, devoir, faire*;
   - pág. 108: GN V VInf;
   - pág. 109: Adj N / N Adj.
3. **Banque de dépannage linguistique (OQLF):** artículos de concordancia y posición del adjetivo.

Lo que no se confirme queda **REVISAR** con su nota. Las páginas citadas se comprueban contra el texto de la fuente.

**Reglas aprendidas en la Etapa 12** (las comprueban las revisiones):
- nunca rechazar una respuesta correcta: aceptar las variantes naturales o forzar una en el enunciado y explicar la otra;
- no enunciar reglas absolutas que tienen excepciones;
- todo dato sin fuente, incluida la pronunciación, va REVISAR;
- después de escribir, pasar cada ejercicio por `checkExercise`.

## Prueba real de Claude (decisión del diseño)
- Agregar 3 casos de error a `server/eval/sentence-cases.json`, uno por lección:
  - `Ma sœur est petit.` → `Ma sœur est petite.`;
  - `Je vais mange une pomme.` → `Je vais manger une pomme.`;
  - `Tu peux viens demain ?` → `Tu peux venir demain ?`.
- El criterio pasa a 10 de 10 errores corregidos.
- Se ejecuta **solo con tu permiso** (menos de un centavo). Si falla, se ajustan las instrucciones, hasta 3 veces.
- El servidor se vuelve a publicar solo si cambian las instrucciones.

## No-objetivos
- Cambios de código o de pantallas.
- Otros tipos de ejercicio.
- La segunda tanda.
- Los detalles menores de las lecciones 1 a 6 anotados en la Etapa 12. Se pueden hacer aparte si los pides.

## Anti-objetivos
- Francés incorrecto.
- Reglas falsas.
- Ejercicios que rechacen respuestas correctas.
- Datos sin fuente presentados como verificados.

## Pruebas
- `tests/lessons-content.test.js`, ampliada a 9 lecciones. Ya comprueba:
  - validación;
  - cuentas;
  - elisión;
  - espacio antes de `?`;
  - sincronía del documento con los JSON.
- Precarga y `CACHE_VERSION = 'v23'`.
- Pasada de `checkExercise` sobre todos los ejercicios.
- `npm test`, `npm run lint` y `cd server && node --test`.
- La prueba real, con permiso.
- Una revisión rápida en el navegador: abrir las tres lecciones a 360 px.

## Estimación
- **Mi trabajo:** unas 3 a 4 horas (dos tareas de contenido con revisión independiente, más la prueba real y la publicación).
- **Tu tiempo:** unos 45 minutos, sobre todo para revisar las tres lecciones y probarlas en el teléfono.

## Para el plan
- Tarea 1: lección 7.
- Tarea 2: lecciones 8 y 9.
- Tarea 3: la prueba real, el push y la prueba en el teléfono, conmigo.
- Rama: `etapa-13-lecciones-7-a-9`.
