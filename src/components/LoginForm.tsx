"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { FONT_SERIF } from "@/theme/tokens";
import { toast } from "@/components/feedback/toast";

const REMEMBER_KEY = "nuvior.login.email";
const RETURN_TO_COOKIE = "nv_return_to";

// Where the middleware sent us from; only same-origin paths are honoured.
function readReturnTo(): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${RETURN_TO_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function clearReturnTo() {
  document.cookie = `${RETURN_TO_COOKIE}=; Max-Age=0; path=/`;
}

// Inputs are 44px tall (12px padding) instead of MUI's 56px default, so the resting
// label must sit at 12px rather than MUI's 16px to stay vertically centered.
const FIELD_SX = {
  "& .MuiInputBase-input": { paddingBlock: "12px" },
  "& .MuiInputLabel-root:not(.MuiInputLabel-shrink)": { transform: "translate(14px, 12px) scale(1)" },
} as const;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  // Restore a remembered email (client only, after hydration).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (res?.error) {
      toast.error("Sign-in failed — check email/password or user status.");
      return;
    }
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, email);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* storage unavailable */
    }
    const returnTo = readReturnTo();
    clearReturnTo();
    window.location.href = returnTo;
  }

  return (
    <Box>
      <Typography component="h1" sx={{ fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.015em" }}>
        Welcome{" "}
        <Box component="em" sx={{ fontStyle: "italic", color: "primary.main" }}>
          back.
        </Box>
      </Typography>
      <Typography variant="body1" sx={{ mt: 2.5, color: "text.secondary" }}>
        Sign in with your NUVIOR credentials to open today&rsquo;s route and clinic intelligence.
      </Typography>

      <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 7, display: "grid", gap: 4 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder="you@nuvior.ca"
          fullWidth
          size="medium"
          sx={FIELD_SX}
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Your password"
          fullWidth
          size="medium"
          sx={FIELD_SX}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" disableRipple aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)} sx={{ "&:hover": { bgcolor: "transparent", color: "text.primary" } }}>
                    {showPassword ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControlLabel
          control={<Checkbox size="medium" color="primary" checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label="Remember Me"
          sx={{ mt: -3, "& .MuiCheckbox-root": { pr: 0.5 } }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={pending}
          loadingPosition="center"
          loadingIndicator={<CircularProgress size={20} sx={{ color: "primary.contrastText" }} />}
          fullWidth
          endIcon={<ArrowForwardOutlined />}
          sx={{ height: 50, borderRadius: 3, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.8125rem", fontWeight: 600, "& .MuiButton-endIcon > *:nth-of-type(1)": { fontSize: 16 } }}
        >
          Sign in
        </Button>
      </Box>

    </Box>
  );
}
