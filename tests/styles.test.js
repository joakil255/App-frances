import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
const PLAQUE = { light: '#233A7A', dark: '#2D4A9A' };

// Contraste WCAG entre dos colores #RRGGBB
function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Valor de una propiedad dentro de la regla con ese selector exacto; resuelve var(--x) de :root
function propertyOf(selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`(?:^|\\n|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`))?.[1];
  assert.ok(block, `falta la regla ${selector}`);
  const value = block.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`))?.[1]?.trim();
  assert.ok(value, `${selector} no define ${property}`);
  const variable = value.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!variable) return value;
  return css.match(new RegExp(`${variable}:\\s*(#[0-9A-Fa-f]{6})`))[1];
}

test('la opción de género elegida se lee aunque tenga error (≥ 4,5:1)', () => {
  const color = propertyOf('.segmented input:checked[aria-invalid="true"] + label', 'color');
  for (const [theme, background] of Object.entries(PLAQUE)) {
    assert.ok(contrast(color, background) >= 4.5, `${theme}: ${color} sobre ${background}`);
  }
});

test('el foco de teclado se ve sobre la opción de género elegida (≥ 3:1)', () => {
  const color = propertyOf('.segmented input:checked:focus-visible + label', 'outline-color');
  for (const [theme, background] of Object.entries(PLAQUE)) {
    assert.ok(contrast(color, background) >= 3, `${theme}: ${color} sobre ${background}`);
  }
});

// Colores de un bloque de variables (#RRGGBB)
const lightTokens = css.match(/:root\s*\{([^}]*)\}/)[1];
const darkTokens = css.match(/prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/)[1];
const token = (block, name) => block.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];

test('el verde de acierto y el rojo de fallo se leen sobre la tarjeta y el fondo (≥ 4,5:1)', () => {
  for (const [theme, block] of Object.entries({ claro: lightTokens, oscuro: darkTokens })) {
    for (const name of ['--success-text', '--error-text']) {
      const color = token(block, name);
      assert.ok(color, `${theme}: falta ${name}`);
      for (const background of ['--surface', '--bg']) {
        const bg = token(block, background);
        assert.ok(contrast(color, bg) >= 4.5, `${theme}: ${name} ${color} sobre ${background} ${bg}`);
      }
    }
  }
});

test('las barras y la línea del gráfico de Progreso se ven sobre el fondo y la tarjeta (≥ 3:1)', () => {
  const orange = css.match(/\.line-progress \{ --line: (#[0-9A-Fa-f]{6}); \}/)[1];
  for (const [theme, block] of Object.entries({ claro: lightTokens, oscuro: darkTokens })) {
    const bar = token(block, '--chart-bar');
    assert.ok(bar, `${theme}: falta --chart-bar`);
    for (const background of ['--surface', '--bg']) {
      const bg = token(block, background) ?? token(lightTokens, background);
      assert.ok(contrast(bar, bg) >= 3, `${theme}: --chart-bar ${bar} sobre ${background} ${bg}`);
      assert.ok(contrast(orange, bg) >= 3, `${theme}: línea ${orange} sobre ${background} ${bg}`);
    }
  }
});

// --- Auditoría de accesibilidad (Etapa 7): todos los pares texto/fondo de DESIGN.md ---
const TEXT_PAIRS = [
  ['--text', '--bg'], ['--text', '--surface'], ['--text-muted', '--bg'], ['--text-muted', '--surface'],
  ['--secondary-text', '--bg'], ['--secondary-text', '--surface'], ['--emphasis', '--bg'], ['--emphasis', '--surface'],
  ['--review', '--bg'], ['--review', '--surface'], ['--error-text', '--bg'], ['--error-text', '--surface'],
  ['--success-text', '--bg'], ['--success-text', '--surface'], ['--notice-text', '--notice-bg'],
  ['--dialog-title', '--bg'], ['--plaque-text', '--plaque'], ['--nav-text', '--nav-bg'], ['--nav-active', '--nav-bg'],
];
const GRAPHIC_PAIRS = [['--field-border', '--surface'], ['--field-border', '--bg'], ['--focus', '--bg'], ['--focus', '--surface']];

for (const [theme, block] of Object.entries({ claro: lightTokens, oscuro: darkTokens })) {
  const value = (name) => token(block, name) ?? token(lightTokens, name);
  test(`contraste de todo el texto en tema ${theme} (≥ 4,5:1)`, () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      assert.ok(value(fg) && value(bg), `${theme}: falta ${fg} o ${bg}`);
      assert.ok(contrast(value(fg), value(bg)) >= 4.5, `${theme}: ${fg} ${value(fg)} sobre ${bg} ${value(bg)}`);
    }
    assert.ok(contrast('#FFFFFF', value('--danger')) >= 4.5, `${theme}: blanco sobre --danger`);
  });
  test(`contraste de bordes de campos y foco en tema ${theme} (≥ 3:1)`, () => {
    for (const [fg, bg] of GRAPHIC_PAIRS) {
      assert.ok(contrast(value(fg), value(bg)) >= 3, `${theme}: ${fg} ${value(fg)} sobre ${bg} ${value(bg)}`);
    }
  });
}

// --- Conversar (Etapa 8): la línea rosa enlaza cada mensaje con sus correcciones ---
test('la línea rosa de Conversar se ve sobre el fondo y la tarjeta (≥ 3:1)', () => {
  const pink = css.match(/\.line-chat \{ --line: (#[0-9A-Fa-f]{6}); \}/)?.[1];
  assert.ok(pink, 'falta .line-chat');
  for (const [theme, block] of Object.entries({ claro: lightTokens, oscuro: darkTokens })) {
    for (const background of ['--surface', '--bg']) {
      const bg = token(block, background);
      assert.ok(contrast(pink, bg) >= 3, `${theme}: línea ${pink} sobre ${background} ${bg}`);
    }
  }
});

// --- Leer (Etapa 11): la línea marrón dibuja la frase que suena y el subrayado de las palabras guardadas ---
test('la línea marrón de Leer se ve sobre el fondo y la tarjeta (≥ 3:1) y es distinta de las demás', () => {
  const brown = css.match(/\.line-reader \{ --line: (#[0-9A-Fa-f]{6}); \}/)?.[1];
  assert.ok(brown, 'falta .line-reader');
  for (const [theme, block] of Object.entries({ claro: lightTokens, oscuro: darkTokens })) {
    for (const background of ['--surface', '--bg']) {
      const bg = token(block, background);
      assert.ok(contrast(brown, bg) >= 3, `${theme}: línea ${brown} sobre ${background} ${bg}`);
    }
  }
  const others = [...css.matchAll(/\.line-(?!reader)[\w-]+ \{ --line: (#[0-9A-Fa-f]{6}); \}/g)].map((m) => m[1].toUpperCase());
  assert.equal(others.length, 7); // las otras siete líneas (Construir es la octava, Etapa 12)
  assert.ok(!others.includes(brown.toUpperCase()), 'Leer repite el color de otra línea');
});

// El ▶ es un icono (su nombre va en aria-label): como elemento gráfico pide 3:1
test('el ▶ blanco de la frase que suena se ve sobre la línea marrón (≥ 3:1)', () => {
  const color = propertyOf('.reader-sentence[aria-current="true"] .reader-from', 'color');
  const brown = css.match(/\.line-reader \{ --line: (#[0-9A-Fa-f]{6}); \}/)?.[1];
  assert.ok(contrast(color, brown) >= 3, `${color} sobre ${brown}`);
});

// --- Construir frases (Etapa 12): la línea turquesa dibuja la vía de «Tu frase» y el borde de los bloques ---
test('la línea turquesa de Construir se ve sobre el fondo y la tarjeta (≥ 3:1) y es distinta de las demás', () => {
  const teal = css.match(/\.line-build \{ --line: (#[0-9A-Fa-f]{6}); \}/)?.[1];
  assert.ok(teal, 'falta .line-build');
  for (const [theme, block] of Object.entries({ claro: lightTokens, oscuro: darkTokens })) {
    for (const background of ['--surface', '--bg']) {
      const bg = token(block, background);
      assert.ok(contrast(teal, bg) >= 3, `${theme}: línea ${teal} sobre ${background} ${bg}`);
    }
  }
  const others = [...css.matchAll(/\.line-(?!build)[\w-]+ \{ --line: (#[0-9A-Fa-f]{6}); \}/g)].map((m) => m[1].toUpperCase());
  assert.equal(others.length, 7);
  assert.ok(!others.includes(teal.toUpperCase()), 'Construir repite el color de otra línea');
});

test('la pestaña activa: texto blanco sobre la placa azul (≥ 4,5:1) en claro y oscuro', () => {
  const color = propertyOf('.nav-link[aria-current] .nav-label', 'color');
  for (const [theme, bg] of Object.entries(PLAQUE)) assert.ok(contrast(color, bg) >= 4.5, theme);
});

test('el texto de las pestañas inactivas se lee sobre la barra clara (≥ 4,5:1)', () => {
  assert.ok(contrast(propertyOf('.nav-link', 'color'), propertyOf('.nav', 'background')) >= 4.5);
});

test('la barra mide 64 px de alto en el móvil', () => {
  assert.match(css, /\n\.nav-link\s*\{[^}]*min-height:\s*var\(--nav-height\)/);
  assert.match(css, /--nav-height:\s*64px/);
});

test('ya no quedan estilos de .nav-desktop-only ni de .line-home', () => {
  assert.doesNotMatch(css, /nav-desktop-only|\.line-home/);
});

test('«Ir a tu mensaje» se oculta fuera de pantalla y aparece al recibir el foco', () => {
  assert.match(css, /\n\.skip-link\s*\{[^}]*position:\s*absolute;[^}]*top:\s*-100px/);
  assert.match(css, /\n\.skip-link:focus\s*\{[^}]*top:\s*var\(--space-2\)/);
});

test('«‹ Practica» se lee a tamaño normal', () => {
  assert.match(css, /\n\.back-link \.text-link\s*\{[^}]*font-size:\s*var\(--size-base\)/);
});

test('«‹ Aprende» de la lección y del repaso se lee a tamaño normal, como «‹ Practica»', () => {
  assert.match(css, /\n\.build-back \.text-link\s*\{[^}]*font-size:\s*var\(--size-base\)/);
});

test('la baldosa de Practica: rejilla de 2 columnas, banda de 8 px y 112 px de alto mínimo', () => {
  assert.match(propertyOf('.practice-grid', 'grid-template-columns'), /repeat\(2,\s*1fr\)/);
  assert.match(css, /\.practice-grid \.wide\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/);
  assert.equal(propertyOf('.practice-tile', 'min-height'), '112px');
  assert.match(propertyOf('.practice-tile', 'border-top'), /8px solid var\(--line\)/);
});

test('desde 900 px la barra va a la izquierda sin reordenar el DOM', () => {
  const wide = css.slice(css.indexOf('@media (min-width: 900px)'));
  assert.match(wide, /\.nav\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1;/);
  assert.match(wide, /main\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1;/);
});

test('el aviso de Construir vacío no se quita del árbol de accesibilidad (role="status")', () => {
  const block = css.match(/\.build-status:empty\s*\{([^}]*)\}/)?.[1];
  assert.ok(block, 'falta la regla .build-status:empty');
  assert.doesNotMatch(block, /display\s*:\s*none|visibility\s*:\s*hidden/);
});

// --- Índice de lecciones (Etapa 14): las planificadas van atenuadas pero se leen ---
test('el texto atenuado de las lecciones planificadas se lee en claro y oscuro (≥ 4,5:1) y es más tenue que --text-muted', () => {
  for (const [theme, block] of Object.entries({ claro: lightTokens, oscuro: darkTokens })) {
    const planned = token(block, '--text-planned');
    assert.ok(planned, `${theme}: falta --text-planned`);
    for (const background of ['--bg', '--surface']) {
      const bg = token(block, background);
      assert.ok(contrast(planned, bg) >= 4.5, `${theme}: --text-planned ${planned} sobre ${background} ${bg}`);
      assert.ok(contrast(planned, bg) < contrast(token(block, '--text-muted'), bg), `${theme}: --text-planned no se ve atenuado`);
    }
  }
  assert.equal(propertyOf('.lesson-tile.planned', 'color'), token(lightTokens, '--text-planned'), 'la baldosa planificada usa --text-planned');
});

test('la baldosa de una lección planificada tiene borde discontinuo', () => {
  assert.equal(propertyOf('.lesson-tile.planned', 'border-style'), 'dashed');
});

test('el botón «Ver traducción» mide 44 px de alto y la traducción usa --text-muted, que pasa AA (Etapa 15)', () => {
  assert.equal(propertyOf('.reader-translation-toggle', 'min-height'), '44px');
  const block = css.match(/(?:^|\n|\})\s*\.reader-translation\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(block, /color:\s*var\(--text-muted\)/);
  assert.match(block, /font:[^;]*italic/);
});

test('el foco de la barra va hacia dentro y el del enlace de salto se ve sobre la placa azul', () => {
  assert.match(css, /\n\.nav-link:focus-visible\s*\{\s*outline-offset:\s*-3px/);
  assert.match(css, /\n\.skip-link:focus-visible\s*\{\s*outline-color:\s*var\(--focus-on-blue\)/);
});

test('.button no subraya (también cuando es un enlace)', () => {
  assert.equal(propertyOf('.button', 'text-decoration'), 'none');
});

test('el «+» y el «−» del desplegable llevan texto alternativo vacío para que no se lean', () => {
  assert.match(css, /\.fold > summary::after \{[^}]*content: '\+' \/ '';/);
  assert.match(css, /\.fold\[open\] > summary::after \{ content: '−' \/ ''; \}/);
});

test('«Practicar algo más» de Aprende se lee a 1 rem, como «‹ Practica»', () => {
  assert.match(css, /\n\.today-more \.text-link\s*\{[^}]*font-size:\s*var\(--size-base\)/);
});

test('el carrusel de lecciones solo sale a los bordes en el móvil; desde 600 px queda dentro de su columna', () => {
  const block = css.match(/@media \(min-width: 600px\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(block, 'falta el bloque desde 600 px');
  const rule = block.match(/\.carousel\s*\{([^}]*)\}/)?.[1];
  assert.ok(rule, 'el bloque no define .carousel');
  assert.match(rule, /margin:\s*0\s*;/);
  assert.match(rule, /padding-inline:\s*0\s*;/);
  assert.match(rule, /scroll-padding:\s*0\s*;/);
});
