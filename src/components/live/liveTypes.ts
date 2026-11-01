import type { GeoPoint } from "@/domain/geo";
import type { LiveRepDto, RepLiveStatus } from "@/domain/live/positions";

/** A rep as drawn on the map: the DTO plus the tweened position the marker sits at right now. */
export type LiveMarker = {
  id: string;
  name: string;
  initials: string;
  hue: number;
  status: RepLiveStatus;
  /** Updated within RECENT_WINDOW_MS — the marker pulses. */
  recent: boolean;
  headingDeg: number | null;
  clinicName: string | null;
  /** Where the marker is drawn (animated towards `target`). */
  lat: number;
  lng: number;
};

/** A focus request: bump `nonce` to re-focus the same rep. */
export type FocusRequest = { id: string; nonce: number } | null;

/** Shared contract for the Google live map and the Leaflet fallback. */
export type LiveMapCommonProps = {
  markers: LiveMarker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Bump to fit every marker into view. */
  fitNonce: number;
  focus: FocusRequest;
  fallbackCenter: GeoPoint;
};

export type { LiveRepDto };

/** CSS class list for a rep marker — shared by both renderers (styles live in globals.css). */
export function repMarkerClass(m: LiveMarker, selected: boolean): string {
  return ["nv-rep", `nv-rep--${m.status}`, m.recent ? "nv-rep--recent" : "", selected ? "nv-rep--selected" : ""].filter(Boolean).join(" ");
}

/** Marker DOM for the Leaflet divIcon (Google renders the same structure through React). */
export function repMarkerHtml(m: LiveMarker, selected: boolean): string {
  return `<div class="${repMarkerClass(m, selected)}" style="--rep-hue:${m.hue}" title="${escapeHtml(m.name)}"><span class="nv-rep__pulse" aria-hidden></span><span class="nv-rep__avatar">${escapeHtml(m.initials)}</span><span class="nv-rep__label">${escapeHtml(m.name)}</span></div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
