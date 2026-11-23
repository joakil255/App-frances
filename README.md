# App-frances

Aplicación hecha con IA para aprender francés y programar un poco.

Es una app web instalable (PWA) para estudiar vocabulario francés de nivel A1. Funciona en Chrome de Android y en el computador, y guarda los datos en el navegador. Está en construcción: por ahora solo existe la base del proyecto.

## Requisitos

- **Node.js 20.19+, 22.13+ o 24+** (sirve para las pruebas y el linter; son las versiones que admite ESLint). Compruébalo con `node --version`.
- **Python 3** (sirve para el servidor local). Compruébalo con `python3 --version`.

## Primera vez

```bash
npm install
```

Instala ESLint, que solo se usa mientras programas. La app no tiene dependencias.

## Ejecutar la app

```bash
npm start
```

Abre `http://localhost:8000` en el navegador. Para detener el servidor, pulsa `Ctrl + C`.

- **No abras `index.html` con doble clic** (`file://`). La parte que permitirá usar la app sin conexión solo funciona si la página se sirve desde un servidor.
- Si sale el error `Address already in use`, el puerto 8000 está ocupado. Usa otro: `python3 -m http.server 8001` y abre `http://localhost:8001`.

## Probar

```bash
npm test       # pruebas automáticas (node --test)
npm run lint   # revisa el código con ESLint
```

Las dos deben terminar sin errores antes de cada commit.

## Construir

No hay paso de construcción: los archivos del repositorio *son* la app. Para publicarla basta con servirlos tal cual (por ejemplo, con GitHub Pages).

## Estructura

```
index.html              página de entrada
manifest.webmanifest    datos de instalación de la PWA
tests/                  pruebas automáticas (*.test.js)
docs/superpowers/       diseños y planes de cada etapa
eslint.config.js        configuración del linter
package.json            comandos y dependencias de desarrollo
```

Más adelante aparecerán `css/` (estilos), `js/` (código de la app), `js/lib/` (lógica probada) y `js/data/` (lista de palabras).
