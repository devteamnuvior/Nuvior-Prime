"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

const TABS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/crm", label: "CRM Diagnostics" },
  { href: "/admin/audit", label: "Audit Log" },
];

export function AdminTabs() {
  const pathname = usePathname();
  const value = TABS.find((t) => pathname === t.href || pathname.startsWith(t.href + "/"))?.href ?? false;
  return (
    <Box sx={{ mb: 6, borderBottom: 1, borderColor: "divider" }}>
      <Tabs value={value} aria-label="Admin sections" variant="scrollable" allowScrollButtonsMobile>
        {TABS.map((t) => (
          <Tab key={t.href} value={t.href} label={t.label} component={Link} href={t.href} />
        ))}
      </Tabs>
    </Box>
  );
}
