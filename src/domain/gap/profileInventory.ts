/**
 * Capability inventory derived from ClinicCapabilityProfile.
 */

import type { CapabilityTag } from "@/domain/products/capabilityTaxonomy";
import type {
  ClinicCapabilityProfile,
  InventoryState,
  ProfileItem,
} from "@/domain/research/clinicCapabilityProfile";

const STATE_RANK: Record<InventoryState, number> = {
  CONFIRMED_PRESENT: 5,
  CONFIRMED_ABSENT: 4,
  NOT_FOUND: 3,
  AMBIGUOUS: 2,
  UNKNOWN: 1,
};

export type CapabilityInventoryEntry = {
  capability: CapabilityTag;
  state: InventoryState;
  items: ProfileItem[];
  evidenceRefIds: string[];
  reviewedScope: string | null;
};

export type ProfileInventory = {
  byCapability: Map<CapabilityTag, CapabilityInventoryEntry>;
  presentCapabilities: CapabilityTag[];
  serviceKeywords: string[];
  brandNames: string[];
  practitionerTypes: string[];
  clinicalFocusKeywords: string[];
  unknownCoverage: boolean;
};

function mergeState(a: InventoryState, b: InventoryState): InventoryState {
  return STATE_RANK[a] >= STATE_RANK[b] ? a : b;
}

export function buildProfileInventory(profile: ClinicCapabilityProfile): ProfileInventory {
  const byCapability = new Map<CapabilityTag, CapabilityInventoryEntry>();

  const addItem = (cap: CapabilityTag, item: ProfileItem) => {
    const existing = byCapability.get(cap);
    if (!existing) {
      byCapability.set(cap, {
        capability: cap,
        state: item.inventoryState,
        items: [item],
        evidenceRefIds: [...item.evidenceRefIds],
        reviewedScope: item.reviewedScope,
      });
      return;
    }
    existing.state = mergeState(existing.state, item.inventoryState);
    existing.items.push(item);
    existing.evidenceRefIds.push(...item.evidenceRefIds);
    if (item.reviewedScope && !existing.reviewedScope) {
      existing.reviewedScope = item.reviewedScope;
    }
  };

  for (const item of profile.capabilities) {
    if (item.capabilityTag) addItem(item.capabilityTag, item);
  }

  for (const item of profile.services) {
    if (item.capabilityTag) addItem(item.capabilityTag, item);
  }

  const presentCapabilities = [...byCapability.entries()]
    .filter(([, e]) => e.state === "CONFIRMED_PRESENT")
    .map(([c]) => c);

  const serviceKeywords = profile.services.map((s) => s.normalizedValue.toLowerCase());
  const brandNames = profile.brands.map((b) => b.normalizedValue.toLowerCase());
  const practitionerTypes = profile.practitionerTypes.map((p) => p.normalizedValue.toLowerCase());
  const clinicalFocusKeywords = profile.clinicalFocusAreas.map((c) => c.normalizedValue.toLowerCase());

  const unknownCoverage =
    profile.unknowns.length > 0 &&
    profile.services.length === 0 &&
    profile.capabilities.filter((c) => c.inventoryState !== "NOT_FOUND").length === 0;

  return {
    byCapability,
    presentCapabilities,
    serviceKeywords,
    brandNames,
    practitionerTypes,
    clinicalFocusKeywords,
    unknownCoverage,
  };
}

export function getCapabilityState(
  inventory: ProfileInventory,
  cap: CapabilityTag,
): InventoryState {
  return inventory.byCapability.get(cap)?.state ?? "UNKNOWN";
}

export function collectEvidenceForCapability(
  inventory: ProfileInventory,
  cap: CapabilityTag,
): string[] {
  const entry = inventory.byCapability.get(cap);
  if (entry) return [...new Set(entry.evidenceRefIds)];
  return [];
}

export function collectAdjacencyEvidence(
  profile: ClinicCapabilityProfile,
  inventory: ProfileInventory,
  keywords: string[],
  capabilityTags: CapabilityTag[],
): string[] {
  const ids = new Set<string>();
  for (const cap of capabilityTags) {
    for (const id of collectEvidenceForCapability(inventory, cap)) ids.add(id);
  }
  const allItems = [
    ...profile.services,
    ...profile.brands,
    ...profile.capabilities,
    ...profile.clinicalFocusAreas,
  ];
  for (const item of allItems) {
    if (item.inventoryState !== "CONFIRMED_PRESENT" && item.inventoryState !== "NOT_FOUND") {
      continue;
    }
    const val = item.normalizedValue.toLowerCase();
    const keywordMatch = keywords.some((k) => val.includes(k.toLowerCase()) || haystackIncludes(inventory, k));
    const tagMatch = item.capabilityTag && capabilityTags.includes(item.capabilityTag);
    if (keywordMatch || tagMatch) {
      for (const id of item.evidenceRefIds) ids.add(id);
    }
  }
  return [...ids];
}

function haystackIncludes(inventory: ProfileInventory, keyword: string): boolean {
  const haystack = [
    ...inventory.serviceKeywords,
    ...inventory.brandNames,
    ...inventory.clinicalFocusKeywords,
  ].join(" ");
  return haystack.includes(keyword.toLowerCase());
}

export function hasAdjacentKeywordSignal(inventory: ProfileInventory, keywords: string[]): boolean {
  const haystack = [
    ...inventory.serviceKeywords,
    ...inventory.brandNames,
    ...inventory.practitionerTypes,
    ...inventory.clinicalFocusKeywords,
    ...inventory.presentCapabilities.map(String),
  ].join(" ");
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}

export function hasAdjacentCapability(
  inventory: ProfileInventory,
  tags: CapabilityTag[],
): CapabilityTag[] {
  return tags.filter((t) => inventory.presentCapabilities.includes(t));
}
