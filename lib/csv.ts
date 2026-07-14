export type ParsedLeadRow = {
  name: string;
  email: string;
  service?: string;
  notes?: string;
};

const NAME_ALIASES = ["name", "business name", "business", "company", "company name", "client", "client name"];
const EMAIL_ALIASES = ["email", "e-mail", "email address", "mail"];
const SERVICE_ALIASES = ["service", "tag", "service tag", "category", "type"];
const NOTES_ALIASES = ["notes", "note", "comments", "comment"];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/^"|"$/g, "");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells.map((c) => c.replace(/^"|"$/g, ""));
}

function findColumnIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((h) => aliases.includes(h));
}

function looksLikeHeader(cells: string[]) {
  const joined = cells.map(normalizeHeader).join(" ");
  return (
    EMAIL_ALIASES.some((a) => joined.includes(a)) ||
    NAME_ALIASES.some((a) => joined.includes(a))
  );
}

function rowFromCells(
  cells: string[],
  columns: { name: number; email: number; service: number; notes: number }
): ParsedLeadRow | null {
  const name = (cells[columns.name] ?? "").trim();
  const email = (cells[columns.email] ?? "").trim();
  if (!name || !email) return null;

  const serviceRaw = columns.service >= 0 ? (cells[columns.service] ?? "").trim() : "";
  const notesRaw = columns.notes >= 0 ? (cells[columns.notes] ?? "").trim() : "";

  return {
    name,
    email,
    ...(serviceRaw ? { service: serviceRaw } : {}),
    ...(notesRaw ? { notes: notesRaw } : {}),
  };
}

export function buildSampleLeadsCsv(serviceNames: string[] = []) {
  const svc1 = serviceNames[0] ?? "Digital Marketing";
  const svc2 = serviceNames[1] ?? svc1;

  return [
    "name,email,service,notes",
    `Acme Corp,hello@acme.com,${svc1},`,
    `Beta LLC,contact@beta.com,${svc2},VIP client`,
    `Gamma Inc,info@gamma.io,,assign service after import`,
  ].join("\n");
}

export function downloadSampleLeadsCsv(serviceNames: string[] = []) {
  const content = buildSampleLeadsCsv(serviceNames);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leads-import-sample.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function parseLeadsCsv(text: string): ParsedLeadRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstCells = parseCsvLine(lines[0]);
  const useHeader = looksLikeHeader(firstCells);

  if (useHeader) {
    const headers = firstCells.map(normalizeHeader);
    const columns = {
      name: findColumnIndex(headers, NAME_ALIASES),
      email: findColumnIndex(headers, EMAIL_ALIASES),
      service: findColumnIndex(headers, SERVICE_ALIASES),
      notes: findColumnIndex(headers, NOTES_ALIASES),
    };

    if (columns.name < 0 || columns.email < 0) {
      // Fallback: first col = name, second = email
      columns.name = 0;
      columns.email = 1;
      if (columns.service < 0 && headers.length > 2) columns.service = 2;
      if (columns.notes < 0 && headers.length > 3) columns.notes = 3;
    }

    return lines
      .slice(1)
      .map((line) => rowFromCells(parseCsvLine(line), columns))
      .filter((row): row is ParsedLeadRow => row !== null);
  }

  // No header — positional: name, email, service?, notes?
  const columns = { name: 0, email: 1, service: 2, notes: 3 };
  return lines
    .map((line) => rowFromCells(parseCsvLine(line), columns))
    .filter((row): row is ParsedLeadRow => row !== null);
}
