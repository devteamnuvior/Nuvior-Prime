/**
 * Parse JSON / simple CSV CRM import payloads into typed rows.
 */

import type {
  CrmSourceKind,
  ImportAccountRow,
  ImportAcademyRow,
  ImportDncRow,
  ImportOrderRow,
  ImportVisitRow,
} from "./types";
import {
  normalizeAccountRow,
  normalizeAcademyRow,
  normalizeDncRow,
  normalizeOrderRow,
  normalizeVisitRow,
  type NormalizedPartial,
} from "./normalize";

export type ParsedBundle = {
  partials: NormalizedPartial[];
  parseErrors: { source: string; index: number; message: string }[];
  recordsRead: number;
};

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { records?: unknown }).records)) {
    return (data as { records: unknown[] }).records;
  }
  return [];
}

export function parseSourceFile(
  source: CrmSourceKind,
  content: string,
  format: "json" | "csv",
): ParsedBundle {
  const parseErrors: ParsedBundle["parseErrors"] = [];
  let rows: unknown[] = [];

  try {
    if (format === "json") {
      rows = asArray(JSON.parse(content));
    } else {
      rows = parseCsv(content);
    }
  } catch (e) {
    return {
      partials: [],
      parseErrors: [
        {
          source,
          index: -1,
          message: `Failed to parse ${format}: ${e instanceof Error ? e.message : String(e)}`,
        },
      ],
      recordsRead: 0,
    };
  }

  const partials: NormalizedPartial[] = [];

  rows.forEach((raw, index) => {
    try {
      const row = raw as Record<string, unknown>;
      let p: NormalizedPartial;
      switch (source) {
        case "accounts":
          p = normalizeAccountRow(row as ImportAccountRow);
          break;
        case "academy":
          p = normalizeAcademyRow(row as ImportAcademyRow);
          break;
        case "orders":
          p = normalizeOrderRow({
            ...(row as ImportOrderRow),
            productFamilies: Array.isArray(row.productFamilies)
              ? (row.productFamilies as string[])
              : typeof row.productFamilies === "string"
                ? String(row.productFamilies)
                    .split("|")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : null,
          });
          break;
        case "dnc":
          p = normalizeDncRow(row as ImportDncRow);
          break;
        case "visits":
          p = normalizeVisitRow(row as ImportVisitRow);
          break;
        default:
          parseErrors.push({ source, index, message: `Unknown source ${source}` });
          return;
      }
      if (p.parseErrors.length) {
        parseErrors.push(
          ...p.parseErrors.map((message) => ({ source, index, message })),
        );
      }
      partials.push(p);
    } catch (e) {
      parseErrors.push({
        source,
        index,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return { partials, parseErrors, recordsRead: rows.length };
}
