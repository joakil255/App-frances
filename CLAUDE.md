# Reglas del proyecto: app web para aprender francés

## Contexto
- App web personal e instalable (PWA) para aprender francés. La usa una persona hispanohablante con nivel A1.2 y poca experiencia programando.
- Interfaz en español; contenido de estudio en francés. Debe funcionar en Chrome de Android y en computador, sin backend al inicio (datos guardados en el navegador).
- Nombres de variables, funciones y archivos en inglés. Comentarios breves en español.

## Forma de trabajar
- Trabaja solo en la etapa que el usuario indique. Nunca avances a la siguiente por tu cuenta.
- En cada etapa usa las skills de Superpowers: brainstorming para aclarar el diseño, writing-plans para el plan por tareas y executing-plans o subagent-driven-development para ejecutarlo. No escribas código hasta que yo apruebe el diseño y el plan. No uses el modo plan de Claude Code.
- Si algo es ambiguo o hay varias opciones razonables, pregunta. No inventes requisitos.
- Haz solo lo pedido. No agregues funciones, abstracciones ni dependencias que la etapa no pida. Prefiere la solución más simple que cumpla.
- Antes de añadir una dependencia: explica por qué, qué alternativa sin dependencia existe y espera aprobación.
- Explica en español sencillo, sin jerga, qué hiciste y por qué. El usuario está aprendiendo.

## Verificación obligatoria
- No digas que algo está terminado sin evidencia. Ejecuta las pruebas, el linter y la app, y muestra los comandos y la salida real. Si no pudiste verificar algo, dilo.
- La lógica (algoritmos, validaciones, importar y exportar) lleva pruebas automáticas, incluidos casos límite: vacío, acentos, datos grandes, sin conexión. Sigue test-driven-development: primero la prueba, verla fallar y luego el código mínimo.
- Si una prueba falla, busca la causa raíz. Nunca borres ni debilites una prueba para que pase.
- Antes de entregar, relée tu propio diff buscando errores, código sobrante y cosas que no se pidieron.
- Cierra cada etapa con este informe: 1) resumen de cambios, 2) archivos tocados, 3) cómo probarlo paso a paso, 4) pruebas ejecutadas y resultado, 5) problemas o límites conocidos, 6) lo que no se hizo.

## Git
- Una rama por etapa (etapa-N-nombre) creada desde main actualizado. Commits pequeños con mensajes claros en español.
- No hagas push a main, no fuerces push ni reescribas el historial.
- Nunca subas claves, archivos .env ni datos personales. Mantén el .gitignore al día.

## Seguridad
- Las claves de API nunca van en código que corre en el navegador.
- Todo texto que escriba el usuario o venga de un archivo importado se muestra como texto, nunca como HTML (usa textContent, no innerHTML).
- No envíes datos a servicios externos sin pedir permiso.
- Pide confirmación antes de cualquier comando destructivo (borrar carpetas, resetear git).

## Contenido en francés
- Francés correcto y natural: acentos, género, concordancia. Los sustantivos llevan artículo (le, la, l', les, un, une).
- Nivel A1: vocabulario frecuente y frases cortas.
- Si no estás seguro de una palabra, frase o traducción, márcala con REVISAR en lugar de adivinar.

## Interfaz
- Mobile-first y accesible: contraste suficiente, etiquetas, foco visible con teclado y botones táctiles grandes. Para toda pantalla o componente nuevo usa la skill frontend-design y sigue DESIGN.md; la estética nunca sustituye la accesibilidad ni el funcionamiento sin conexión.
- Debe funcionar sin conexión después de la primera carga.

## Límites del contexto
- Si la tarea crece o el contexto se llena, detente, resume el estado y propón cómo dividir el trabajo.
