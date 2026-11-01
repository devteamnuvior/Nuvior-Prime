"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import ExpandMoreOutlined from "@mui/icons-material/ExpandMoreOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { FONT_SERIF } from "@/theme/tokens";

const DEV_USERS = [
  { email: "on.rep@nuvior.local", label: "Ontario Rep", password: "DevPass123!" },
  { email: "ab.rep@nuvior.local", label: "Alberta Rep", password: "DevPass123!" },
  { email: "on.manager@nuvior.local", label: "Ontario Manager", password: "DevPass123!" },
  { email: "admin@nuvior.local", label: "National Admin", password: "DevPass123!" },
];

const SHOW_DEV_ACCOUNTS = process.env.NODE_ENV !== "production";
const REMEMBER_KEY = "nuvior.login.email";

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState(SHOW_DEV_ACCOUNTS ? DEV_USERS[0]!.email : "");
  const [password, setPassword] = useState(SHOW_DEV_ACCOUNTS ? DEV_USERS[0]!.password : "");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setPending(false);
    if (res?.error) {
      setError("Sign-in failed — check email/password or user status.");
      return;
    }
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, email);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* storage unavailable */
    }
    window.location.href = callbackUrl;
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
          required
          fullWidth
          size="medium"
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Your password"
          required
          fullWidth
          size="medium"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label="Remember me"
          slotProps={{ typography: { variant: "body2" } }}
        />

        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={pending}
          loadingPosition="center"
          fullWidth
          endIcon={<ArrowForwardOutlined />}
          sx={{ height: 50, borderRadius: 3, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "0.8125rem", fontWeight: 600 }}
        >
          Sign in
        </Button>
      </Box>

      {SHOW_DEV_ACCOUNTS && (
        <Box sx={{ mt: 6 }}>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowDev((v) => !v)}
            aria-expanded={showDev}
            startIcon={<ExpandMoreOutlined sx={{ transition: "transform 150ms", transform: showDev ? "rotate(180deg)" : "none" }} />}
            sx={{ color: "text.secondary", px: 1 }}
          >
            Development accounts
          </Button>
          <Collapse in={showDev}>
            <Box sx={{ mt: 2, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              {DEV_USERS.map((u) => {
                const active = email === u.email;
                return (
                  <ButtonBase
                    key={u.email}
                    onClick={() => {
                      setEmail(u.email);
                      setPassword(u.password);
                      setError(null);
                    }}
                    aria-pressed={active}
                    sx={{
                      display: "block",
                      textAlign: "left",
                      p: 3,
                      borderRadius: 2,
                      border: 1,
                      borderColor: active ? "primary.main" : "divider",
                      bgcolor: active ? "action.selected" : "background.paper",
                      transition: (t) => t.transitions.create(["border-color", "background-color"], { duration: t.transitions.duration.shortest }),
                      "&:hover": { borderColor: active ? "primary.main" : "text.disabled" },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {u.label}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", fontFamily: "var(--mono)" }} noWrap>
                      {u.email}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
