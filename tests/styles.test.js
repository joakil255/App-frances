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

test('.nav-desktop-only se oculta en móvil y se muestra desde 900 px', () => {
  const at = css.indexOf('@media (min-width: 900px)');
  assert.ok(at > 0);
  assert.match(css.slice(0, at), /\.nav-list \.nav-desktop-only\s*\{\s*display:\s*none;/);
  assert.match(css.slice(at), /\.nav-list \.nav-desktop-only\s*\{\s*display:\s*block;/);
});
