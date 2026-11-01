import type { SvgIconComponent } from "@mui/icons-material";
import RouteOutlined from "@mui/icons-material/RouteOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import LinkOutlined from "@mui/icons-material/LinkOutlined";
import AdminPanelSettingsOutlined from "@mui/icons-material/AdminPanelSettingsOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import StorageOutlined from "@mui/icons-material/StorageOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import type { NavIconKey } from "./nav";

export const NAV_ICONS: Record<NavIconKey, SvgIconComponent> = {
  route: RouteOutlined,
  search: SearchOutlined,
  history: HistoryOutlined,
  team: GroupsOutlined,
  verify: FactCheckOutlined,
  link: LinkOutlined,
  shield: AdminPanelSettingsOutlined,
  users: PeopleOutlined,
  database: StorageOutlined,
  audit: ReceiptLongOutlined,
};
