// Texto comparable: minúsculas, apóstrofo recto, sin .!? al final
function comparable(text) {
  return text.toLowerCase().replace(/[’ʼ]/g, "'").trim().replace(/[.!?]+$/, '').trim();
}

// Califica una frase: ¿apareció la forma esperada? ¿se inventó un error en una frase correcta?
export function scoreCase({ expected }, corrections) {
  if (expected === null) return { found: false, invented: corrections.length > 0 };
  const accepted = (Array.isArray(expected) ? expected : [expected]).map(comparable);
  const found = corrections.some((item) => {
    const corrected = comparable(item.corrected);
    return accepted.some((form) => corrected.includes(form));
  });
  return { found, invented: false };
}
