// Envuelve fetch para sumar los tokens que informa la API (precio claude-haiku-5-5)
const INPUT_USD_PER_MILLION = 0.10;
const OUTPUT_USD_PER_MILLION = 0.50;

export function costUsd({ input, output }) {
  return (input * INPUT_USD_PER_MILLION + output * OUTPUT_USD_PER_MILLION) / 1e6;
}

export function createUsageMeter(realFetch = fetch) {
  const total = { input: 0, output: 0 };
  let last = { input: 0, output: 0 };
  async function meteredFetch(...args) {
    const response = await realFetch(...args);
    last = { input: 0, output: 0 };
    try {
      const { usage } = await response.clone().json();
      last = { input: usage?.input_tokens ?? 0, output: usage?.output_tokens ?? 0 };
      total.input += last.input;
      total.output += last.output;
    } catch {
      // respuesta sin JSON: no suma nada
    }
    return response;
  }
  return { fetch: meteredFetch, total, takeLast: () => last };
}

export function describeUsage({ input, output }) {
  return `${input} tokens de entrada, ${output} de salida, ${costUsd({ input, output }).toFixed(6)} USD`;
}
