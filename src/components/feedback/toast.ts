"use client";

import { enqueueSnackbar, closeSnackbar, type OptionsObject } from "notistack";

type ToastOptions = Omit<OptionsObject, "variant">;

/** App-wide toast helper (notistack). Usable in components and in server-action callbacks. */
export const toast = {
  success: (message: string, opts?: ToastOptions) => enqueueSnackbar(message, { variant: "success", ...opts }),
  error: (message: string, opts?: ToastOptions) => enqueueSnackbar(message, { variant: "error", ...opts }),
  info: (message: string, opts?: ToastOptions) => enqueueSnackbar(message, { variant: "info", ...opts }),
  warning: (message: string, opts?: ToastOptions) => enqueueSnackbar(message, { variant: "warning", ...opts }),
  /** Convenience for action results of shape `{ ok, message }`. */
  result: (r: { ok: boolean; message: string }, opts?: ToastOptions) =>
    enqueueSnackbar(r.message, { variant: r.ok ? "success" : "error", ...opts }),
  dismiss: closeSnackbar,
};
