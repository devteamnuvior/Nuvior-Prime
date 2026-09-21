"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import {
  normalizeSelectedPlace,
  placesAutocompleteIsAvailable,
  startFromGeocoderResult,
  type SelectedAddressComponent,
  type StartSelection,
} from "@/lib/placeSelection";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

type Suggestion = {
  key: string;
  main: string;
  secondary: string;
  toStart: () => Promise<StartSelection | null>;
};

/**
 * Start-location input. In Google mode this is a Places autocomplete using
 * the current Autocomplete Data API (AutocompleteSuggestion + session tokens,
 * debounced — one billable session per completed selection). Without Google
 * it degrades to a plain text input that the server geocodes.
 */
export function StartLocationField({
  googleEnabled,
  value,
  onValueChange,
  onResolvedStart,
}: {
  googleEnabled: boolean;
  value: string;
  onValueChange: (text: string) => void;
  onResolvedStart: (selection: StartSelection | null) => void;
}) {
  if (!googleEnabled) {
    return (
      <input
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          onResolvedStart(null);
        }}
        required
        placeholder="e.g. M5V 2T6"
        className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink placeholder:text-faint"
      />
    );
  }
  return (
    <GoogleAutocompleteInput
      value={value}
      onValueChange={onValueChange}
      onResolvedStart={onResolvedStart}
    />
  );
}

function GoogleAutocompleteInput({
  value,
  onValueChange,
  onResolvedStart,
}: {
  value: string;
  onValueChange: (text: string) => void;
  onResolvedStart: (selection: StartSelection | null) => void;
}) {
  const places = useMapsLibrary("places");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [suggestionsUnavailable, setSuggestionsUnavailable] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (value.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      setSuggestionsUnavailable(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const mapsReady = typeof google !== "undefined" && !!google.maps;
      if (!places && !mapsReady) return;

      const fromPlaces = await fetchPlacesSuggestions(places, value, sessionTokenRef);
      if (fromPlaces) {
        setSuggestions(fromPlaces);
        setOpen(fromPlaces.length > 0);
        setSuggestionsUnavailable(false);
        return;
      }
      const fromGeocoder = await fetchGeocoderSuggestions(value);
      if (fromGeocoder.length > 0) {
        setSuggestions(fromGeocoder);
        setOpen(true);
        setSuggestionsUnavailable(false);
        return;
      }
      setSuggestions([]);
      setOpen(false);
      setSuggestionsUnavailable(true);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, places]);

  const select = async (s: Suggestion) => {
    setOpen(false);
    try {
      const start = await s.toStart();
      // Selection completes the autocomplete billing session.
      sessionTokenRef.current = null;
      if (start) {
        skipNextFetchRef.current = true;
        onValueChange(start.label);
        onResolvedStart(start);
      }
    } catch {
      setSuggestionsUnavailable(true);
    }
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          onResolvedStart(null); // typing invalidates the previous selection
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        required
        autoComplete="off"
        placeholder="Search address, postal code or place"
        className="h-10 w-full rounded-lg border border-rule bg-paper px-3 text-sm text-ink placeholder:text-faint"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-11 z-20 overflow-hidden rounded-lg border border-rule bg-panel shadow-float">
          {suggestions.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s)}
                className="w-full px-3 py-2.5 text-left hover:bg-canvas"
              >
                <span className="block truncate text-[13px] font-medium text-ink">{s.main}</span>
                {s.secondary && (
                  <span className="block truncate text-xs text-muted">{s.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {suggestionsUnavailable && (
        <p className="mt-1 text-[0.68rem] text-muted">
          Suggestions unavailable. Type a postal code or address, then use this address — or
          drop a pin.
        </p>
      )}
    </div>
  );
}

async function fetchPlacesSuggestions(
  places: google.maps.PlacesLibrary | null,
  value: string,
  sessionTokenRef: { current: google.maps.places.AutocompleteSessionToken | null },
): Promise<Suggestion[] | null> {
  if (!placesAutocompleteIsAvailable(places) || !places) return null;
  try {
    sessionTokenRef.current ??= new places.AutocompleteSessionToken();
    const { suggestions: raw } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: value.trim(),
      sessionToken: sessionTokenRef.current,
      includedRegionCodes: ["ca"],
    });
    return raw
      .filter((s) => s.placePrediction)
      .slice(0, 6)
      .map((s) => {
        const p = s.placePrediction!;
        return {
          key: p.placeId,
          main: p.mainText?.text ?? p.text.text,
          secondary: p.secondaryText?.text ?? "",
          toStart: async () => {
            const place = p.toPlace();
            await place.fetchFields({
              fields: ["location", "formattedAddress", "addressComponents", "id"],
            });
            if (!place.location) return null;
            return normalizeSelectedPlace({
              placeId: place.id,
              formattedAddress: place.formattedAddress,
              lat: place.location.lat(),
              lng: place.location.lng(),
              addressComponents: (place.addressComponents as SelectedAddressComponent[] | null) ?? null,
            });
          },
        };
      });
  } catch {
    return null;
  }
}

async function fetchGeocoderSuggestions(value: string): Promise<Suggestion[]> {
  if (typeof google === "undefined" || !google.maps?.Geocoder) return [];
  try {
    const geocoder = new google.maps.Geocoder();
    const res = await geocoder.geocode({
      address: value.trim(),
      componentRestrictions: { country: "CA" },
      region: "ca",
    });
    const out: Suggestion[] = [];
    for (const r of (res.results ?? []).slice(0, 6)) {
      const start = startFromGeocoderResult(r);
      if (!start) continue;
      out.push({
        key: r.place_id ?? start.label,
        main: start.label,
        secondary: start.provinceCode ?? "",
        toStart: async () => start,
      });
    }
    return out;
  } catch {
    return [];
  }
}
