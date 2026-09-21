/**
 * Last-order derived status — thresholds explicit, not hidden in UI.
 */

export type LastOrderStatus = "active" | "dormant" | "long_lapsed" | "never" | "unknown";

export type LastOrderConfig = {
  activeWithinDays: number;
  dormantWithinDays: number;
};

export function getLastOrderConfig(): LastOrderConfig {
  return {
    activeWithinDays: Number(process.env.CRM_LAST_ORDER_ACTIVE_DAYS ?? 90),
    dormantWithinDays: Number(process.env.CRM_LAST_ORDER_DORMANT_DAYS ?? 365),
  };
}

export function deriveLastOrderStatus(
  lastOrderDate: string | null | undefined,
  asOf: Date = new Date(),
  config: LastOrderConfig = getLastOrderConfig(),
): LastOrderStatus {
  if (lastOrderDate == null || lastOrderDate === "") return "never";
  const ordered = new Date(lastOrderDate);
  if (Number.isNaN(ordered.getTime())) return "unknown";
  const days = Math.floor((asOf.getTime() - ordered.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "unknown";
  if (days <= config.activeWithinDays) return "active";
  if (days <= config.dormantWithinDays) return "dormant";
  return "long_lapsed";
}
