// Ayudas de la pantalla de ejercicios (funciones puras).

// Inserta texto en el cursor o sobre la selección; devuelve el nuevo valor y el cursor
export function insertAt(value, start, end, text) {
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}
