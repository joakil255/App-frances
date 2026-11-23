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
