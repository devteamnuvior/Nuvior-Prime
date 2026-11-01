"use client";

import type { ButtonProps } from "@mui/material/Button";
import AddOutlined from "@mui/icons-material/AddOutlined";
import { HeroButton } from "@/components/feedback/HeroButton";

/** Primary call-to-action for the Team Members page: the hero button with the plus glyph. */
export function AddUserButton({ children = "Add User", ...props }: ButtonProps) {
  return (
    <HeroButton startIcon={<AddOutlined />} {...props}>
      {children}
    </HeroButton>
  );
}
