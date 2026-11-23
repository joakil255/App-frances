// Lector y escritor de CSV según el estándar RFC 4180, sin dependencias.
// Acepta el separador «,» o «;» (Excel en español), comillas, saltos de línea
// dentro de un campo, finales de línea \r\n o \n y la marca BOM de UTF-8.

const BOM = '\uFEFF';

export class CsvError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'CsvError';
    this.line = line;
  }
}

// Mira la primera línea (fuera de comillas) y elige el separador más usado
function detectDelimiter(text) {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  for (const char of text) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (char === '\n' || char === '\r')) break;
    else if (!inQuotes && char === ',') commas += 1;
    else if (!inQuotes && char === ';') semicolons += 1;
  }
  return semicolons > commas ? ';' : ',';
}

// Devuelve { delimiter, records: [{ line, fields }] }. line = línea donde empieza el registro.
export function parseCsv(input) {
  const text = input.startsWith(BOM) ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const records = [];

  let fields = [];
  let field = '';
  let inQuotes = false;
  let quoteLine = 0;
  let line = 1;
  let recordLine = 1;
  let atRecordStart = true;

  const endField = () => {
    fields.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    records.push({ line: recordLine, fields });
    fields = [];
    atRecordStart = true;
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) line += 1;
        field += char;
      }
      continue;
    }

    if (atRecordStart) {
      recordLine = line;
      atRecordStart = false;
    }

    if (char === '"' && field === '') {
      inQuotes = true;
      quoteLine = line;
    } else if (char === delimiter) {
      endField();
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      endRecord();
      line += 1;
    } else {
      field += char;
    }
  }

  if (inQuotes) throw new CsvError(`Comillas sin cerrar en la línea ${quoteLine}.`, quoteLine);
  if (!atRecordStart) endRecord();
  return { delimiter, records };
}

// Un campo va entre comillas solo si tiene separadores, comillas o saltos de línea
function quote(value) {
  const text = String(value ?? '');
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Escribe filas como CSV: BOM (para que Excel lea bien los acentos), «,» y \r\n
export function toCsv(rows) {
  return BOM + rows.map((row) => row.map(quote).join(',')).join('\r\n') + '\r\n';
}
