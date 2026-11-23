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
