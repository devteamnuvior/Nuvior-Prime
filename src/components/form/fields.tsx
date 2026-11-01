"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";
import TextField, { type TextFieldProps } from "@mui/material/TextField";

/**
 * react-hook-form ↔ MUI bindings. Every field shows its validation error as helper text
 * directly beneath the control and wires aria-invalid / aria-describedby for screen readers.
 */

type BaseProps<TValues extends FieldValues> = {
  control: Control<TValues>;
  name: FieldPath<TValues>;
};

export function FormTextField<TValues extends FieldValues>({
  control,
  name,
  helperText,
  ...props
}: BaseProps<TValues> & Omit<TextFieldProps, "name" | "value" | "onChange" | "error">) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          {...field}
          value={field.value ?? ""}
          inputRef={field.ref}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? helperText}
          fullWidth={props.fullWidth ?? true}
          slotProps={{
            ...props.slotProps,
            htmlInput: { ...(props.slotProps?.htmlInput as object), "aria-invalid": !!fieldState.error },
          }}
        />
      )}
    />
  );
}

export function FormSelect<TValues extends FieldValues>({
  control,
  name,
  label,
  options,
  helperText,
  disabled,
  fullWidth = true,
}: BaseProps<TValues> & {
  label: string;
  options: { value: string; label: React.ReactNode; description?: React.ReactNode }[];
  helperText?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const id = React.useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormControl fullWidth={fullWidth} error={!!fieldState.error} disabled={disabled}>
          <InputLabel id={`${id}-label`}>{label}</InputLabel>
          <Select
            labelId={`${id}-label`}
            id={id}
            label={label}
            {...field}
            value={field.value ?? ""}
            inputRef={field.ref}
            MenuProps={{ slotProps: { paper: { sx: { maxHeight: 320 } } } }}
          >
            {options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
          {(fieldState.error?.message ?? helperText) && (
            <FormHelperText>{fieldState.error?.message ?? helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

export function FormCheckbox<TValues extends FieldValues>({
  control,
  name,
  label,
  helperText,
  disabled,
}: BaseProps<TValues> & { label: React.ReactNode; helperText?: React.ReactNode; disabled?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error} disabled={disabled}>
          <FormControlLabel
            control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} onBlur={field.onBlur} slotProps={{ input: { ref: field.ref } }} />}
            label={label}
            slotProps={{ typography: { variant: "body2" } }}
          />
          {(fieldState.error?.message ?? helperText) && (
            <FormHelperText sx={{ mt: -0.5 }}>{fieldState.error?.message ?? helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

export function FormSwitch<TValues extends FieldValues>({
  control,
  name,
  label,
  helperText,
  disabled,
}: BaseProps<TValues> & { label: React.ReactNode; helperText?: React.ReactNode; disabled?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error} disabled={disabled}>
          <FormControlLabel
            control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} onBlur={field.onBlur} slotProps={{ input: { ref: field.ref } }} />}
            label={label}
            slotProps={{ typography: { variant: "body2" } }}
          />
          {(fieldState.error?.message ?? helperText) && (
            <FormHelperText sx={{ mt: -0.5 }}>{fieldState.error?.message ?? helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}
