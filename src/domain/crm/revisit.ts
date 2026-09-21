/**
 * Revisit / already-visited merge — CRM-backed with paste overrides.
 * Priority: DNC > explicit revisit due > already visited / not due.
 */

export type RevisitFlags = {
  isRevisit: boolean;
  alreadyVisitedExclude: boolean;
  source: "paste_revisit" | "crm_revisit" | "paste_visited" | "crm_visited" | "none";
  label: "RE-VISIT" | null;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isNamedIn(list: string[], businessName: string): boolean {
  const target = normalizeName(businessName);
  return list.some((n) => {
    const nn = normalizeName(n);
    return nn === target || target.includes(nn) || nn.includes(target);
  });
}

export type RevisitInputs = {
  pasteRevisitNames: string[];
  pasteAlreadyVisitedNames: string[];
  /** Place IDs or business names from CRM revisits due */
  crmRevisitKeys: string[];
  /** Place IDs or business names from CRM already-visited not due */
  crmAlreadyVisitedKeys: string[];
  businessName: string;
  placeId: string | null;
  doNotContact: boolean;
};

export function resolveRevisitFlags(input: RevisitInputs): RevisitFlags {
  if (input.doNotContact) {
    return {
      isRevisit: false,
      alreadyVisitedExclude: true,
      source: "none",
      label: null,
    };
  }

  const keys = [input.businessName, input.placeId].filter(Boolean) as string[];
  const inList = (list: string[]) =>
    keys.some((k) => isNamedIn(list, k)) || isNamedIn(list, input.businessName);

  if (inList(input.pasteRevisitNames) || inList(input.crmRevisitKeys)) {
    return {
      isRevisit: true,
      alreadyVisitedExclude: false,
      source: inList(input.pasteRevisitNames) ? "paste_revisit" : "crm_revisit",
      label: "RE-VISIT",
    };
  }

  if (inList(input.pasteAlreadyVisitedNames) || inList(input.crmAlreadyVisitedKeys)) {
    return {
      isRevisit: false,
      alreadyVisitedExclude: true,
      source: inList(input.pasteAlreadyVisitedNames) ? "paste_visited" : "crm_visited",
      label: null,
    };
  }

  return {
    isRevisit: false,
    alreadyVisitedExclude: false,
    source: "none",
    label: null,
  };
}

/** Deduplicate revisit keys that also appear in discovery by placeId/name. */
export function mergeUniqueKeys(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list) {
      const n = normalizeName(item);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(item);
    }
  }
  return out;
}
