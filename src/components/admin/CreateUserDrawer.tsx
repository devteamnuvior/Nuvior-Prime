"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Typography from "@mui/material/Typography";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import { adminCreateUserAction } from "@/app/actions";
import type { UserActionResult } from "@/domain/auth/userAdmin";
import { SideDrawer } from "@/components/feedback/SideDrawer";
import { StatusChip } from "@/components/feedback/StatusChip";
import { FormTextField } from "@/components/form/fields";
import { UserAvatar } from "./UserAvatar";
import { PROVINCE_OPTIONS, ROLE_META, ROLE_ORDER, generatePassword, passwordStrength } from "./userPresentation";

/** Client-side mirror of the server validation; the server remains authoritative. */
const schema = z
  .object({
    displayName: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Enter a valid email address"),
    role: z.enum(["REP", "MANAGER", "ADMIN"]),
    allProvinces: z.boolean(),
    provinces: z.array(z.string()),
    password: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((v) => v.allProvinces || v.provinces.length > 0, { path: ["provinces"], message: "Pick at least one province" });

type FormValues = z.infer<typeof schema>;

const INITIAL: FormValues = { displayName: "", email: "", role: "REP", allProvinces: false, provinces: ["ON"], password: "" };

export function CreateUserDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: UserActionResult) => void;
}) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: INITIAL, mode: "onTouched" });
  const { control, handleSubmit, reset, watch, setValue, setError, clearErrors } = form;

  React.useEffect(() => {
    if (open) {
      reset(INITIAL);
      setFormError(null);
      setShowPassword(false);
    }
  }, [open, reset]);

  const displayName = watch("displayName");
  const email = watch("email");
  const role = watch("role");
  const allProvinces = watch("allProvinces");
  const provinces = watch("provinces");
  const password = watch("password");
  const strength = passwordStrength(password);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const r = await adminCreateUserAction({
        email: values.email,
        displayName: values.displayName,
        role: values.role,
        provinces: values.allProvinces ? ["*"] : values.provinces,
        password: values.password,
      });
      if (r.ok) {
        onCreated(r);
        onClose();
        return;
      }
      if (r.fieldErrors) {
        for (const [field, message] of Object.entries(r.fieldErrors)) {
          setError(field as keyof FormValues, { type: "server", message });
        }
      } else setFormError(r.message);
    });
  });

  const strengthColor = strength.score <= 1 ? "error" : strength.score === 2 ? "warning" : "success";

  return (
    <SideDrawer
      open={open}
      onClose={pending ? () => undefined : onClose}
      title="Add user"
      description="Creates a local account. They can sign in right away with the password you set."
      footer={
        <>
          <Button variant="outlined" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="create-user-form" variant="contained" disabled={pending} startIcon={pending ? <CircularProgress size={14} color="inherit" /> : undefined}>
            {pending ? "Creating…" : "Create user"}
          </Button>
        </>
      }
    >
      <Box id="create-user-form" component="form" onSubmit={onSubmit} noValidate sx={{ display: "grid", gap: 5 }}>
        {/* Live preview */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, p: 3, borderRadius: 3, border: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          <UserAvatar name={displayName.trim() || "New user"} email={email.trim() || "name@nuvior.ca"} size="lg" />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body1" noWrap sx={{ fontWeight: 600 }}>
              {displayName.trim() || "New user"}
            </Typography>
            <Typography variant="caption" noWrap sx={{ display: "block", color: "text.secondary", fontFamily: "var(--mono)" }}>
              {email.trim() || "name@nuvior.ca"}
            </Typography>
            <StatusChip dot={false} tone={ROLE_META[role].tone === "inverse" ? "primary" : ROLE_META[role].tone} label={ROLE_META[role].label} sx={{ mt: 1 }} />
          </Box>
        </Box>

        <FormTextField control={control} name="displayName" label="Full name" placeholder="e.g. Maya Chen" autoComplete="off" autoFocus />
        <FormTextField control={control} name="email" label="Work email" type="email" placeholder="name@nuvior.ca" autoComplete="off" slotProps={{ htmlInput: { inputMode: "email" } }} />

        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ mb: 1, fontSize: "0.8125rem", fontWeight: 500, color: "text.primary" }}>
                Role
              </FormLabel>
              <RadioGroup {...field} sx={{ gap: 2 }}>
                {ROLE_ORDER.slice().reverse().map((r) => {
                  const meta = ROLE_META[r];
                  const selected = field.value === r;
                  return (
                    <Box
                      key={r}
                      component="label"
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 2,
                        p: 3,
                        borderRadius: 2,
                        border: 1,
                        borderColor: selected ? "primary.main" : "divider",
                        bgcolor: selected ? "action.selected" : "background.paper",
                        cursor: "pointer",
                        transition: (t) => t.transitions.create(["border-color", "background-color"], { duration: t.transitions.duration.shortest }),
                        "&:hover": { borderColor: selected ? "primary.main" : "text.disabled" },
                      }}
                    >
                      <Radio value={r} size="small" sx={{ p: 0, mt: "1px" }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {meta.label}
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                          {meta.description}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </RadioGroup>
            </FormControl>
          )}
        />

        <Controller
          control={control}
          name="provinces"
          render={({ fieldState }) => (
            <FormControl component="fieldset" error={!!fieldState.error}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                <FormLabel component="legend" sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "text.primary" }}>
                  Territory
                </FormLabel>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allProvinces}
                      onChange={(e) => {
                        setValue("allProvinces", e.target.checked, { shouldDirty: true });
                        clearErrors("provinces");
                      }}
                    />
                  }
                  label="All provinces"
                  slotProps={{ typography: { variant: "body2", color: "text.secondary" } }}
                  sx={{ mr: 0 }}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  border: 1,
                  borderColor: fieldState.error ? "error.main" : "divider",
                  opacity: allProvinces ? 0.4 : 1,
                  transition: "opacity 150ms",
                }}
              >
                {PROVINCE_OPTIONS.map((p) => {
                  const on = !allProvinces && provinces.includes(p.code);
                  return (
                    <Chip
                      key={p.code}
                      label={p.code}
                      size="small"
                      title={p.name}
                      disabled={allProvinces}
                      clickable
                      variant={on ? "filled" : "outlined"}
                      aria-pressed={on}
                      onClick={() => {
                        setValue("provinces", on ? provinces.filter((c) => c !== p.code) : [...provinces, p.code], { shouldDirty: true });
                        clearErrors("provinces");
                      }}
                      sx={{ fontFamily: "var(--mono)", letterSpacing: "0.08em", ...(on ? { bgcolor: "background.inverse", color: "background.default", "&:hover": { bgcolor: "background.inverse" } } : {}) }}
                    />
                  );
                })}
              </Box>
              <FormHelperText>
                {fieldState.error?.message ??
                  (allProvinces
                    ? "Can operate anywhere in Canada."
                    : provinces.length
                      ? `${provinces.length} selected · ${provinces.join(", ")}`
                      : "Pick the provinces this user may work in.")}
              </FormHelperText>
            </FormControl>
          )}
        />

        <Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
            <FormTextField
              control={control}
              name="password"
              label="Temporary password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              slotProps={{
                htmlInput: { style: { fontFamily: "var(--mono)" } },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" edge="end" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                        {showPassword ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                setValue("password", generatePassword(), { shouldDirty: true, shouldValidate: true });
                setShowPassword(true);
              }}
              sx={{ flexShrink: 0, mt: "1px" }}
            >
              Generate
            </Button>
          </Box>
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <LinearProgress
              variant="determinate"
              value={strength.score * 25}
              color={strengthColor}
              aria-label="Password strength"
              sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: "divider" }}
            />
            <Typography variant="caption" sx={{ width: 64, textAlign: "right", color: "text.secondary", fontFamily: "var(--mono)" }}>
              {strength.label}
            </Typography>
          </Box>
        </Box>

        {formError && (
          <Alert severity="error" role="alert">
            {formError}
          </Alert>
        )}
      </Box>
    </SideDrawer>
  );
}
