import type { SvgIconComponent } from "@mui/icons-material";
import EventRepeatOutlined from "@mui/icons-material/EventRepeatOutlined";
import PersonAddAlt1Outlined from "@mui/icons-material/PersonAddAlt1Outlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import ShoppingBagOutlined from "@mui/icons-material/ShoppingBagOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import type { StatTone } from "@/components/feedback/StatCard";
import type { TargetMetric, TargetPeriod, TargetStatus } from "@/domain/performance/targets";

/** Icon, short label and status styling shared by every target card (live map, Today's Route). */
export const METRIC_ICON: Record<TargetMetric, SvgIconComponent> = {
  VISITS: StorefrontOutlined,
  NEW_ACCOUNTS: PersonAddAlt1Outlined,
  FOLLOW_UPS: EventRepeatOutlined,
  ACADEMY_SIGNUPS: SchoolOutlined,
  ORDERS: ShoppingBagOutlined,
};

/** Short card labels; the full catalogue names stay in tooltips. */
export const METRIC_SHORT: Record<TargetMetric, string> = {
  VISITS: "Clinics",
  NEW_ACCOUNTS: "New accounts",
  FOLLOW_UPS: "Follow-ups",
  ACADEMY_SIGNUPS: "Academy sign-ups",
  ORDERS: "Orders",
};

export const PERIOD_SHORT: Record<TargetPeriod, string> = { DAY: "Today", WEEK: "This week", MONTH: "This month" };

export const TARGET_STATUS: Record<TargetStatus, { label: string; tone: StatTone }> = {
  met: { label: "Met", tone: "success" },
  ahead: { label: "Ahead", tone: "success" },
  on_track: { label: "On track", tone: "primary" },
  behind: { label: "Behind", tone: "warning" },
};
