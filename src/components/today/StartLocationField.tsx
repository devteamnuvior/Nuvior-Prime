"use client";

import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import Box from "@mui/material/Box";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
      <TextField
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          onResolvedStart(null);
        }}
        required
        fullWidth
        placeholder="e.g. M5V 2T6"
        aria-label="Start location"
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

  const listOpen = open && suggestions.length > 0;

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          onResolvedStart(null); // typing invalidates the previous selection
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        required
        fullWidth
        autoComplete="off"
        placeholder="Search address, postal code or place"
        aria-label="Start location"
        slotProps={{ htmlInput: { role: "combobox", "aria-expanded": listOpen, "aria-autocomplete": "list" } }}
      />
      {listOpen && (
        <Paper
          variant="outlined"
          sx={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", zIndex: 2, overflow: "hidden", borderRadius: 1, boxShadow: 2 }}
        >
          <MenuList dense disablePadding role="listbox">
            {suggestions.map((s) => (
              <MenuItem
                key={s.key}
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s)}
                sx={{ borderRadius: 0, py: 2, alignItems: "flex-start" }}
              >
                <ListItemText
                  primary={s.main}
                  secondary={s.secondary || undefined}
                  slotProps={{
                    primary: { variant: "body2", noWrap: true, sx: { fontWeight: 500 } },
                    secondary: { variant: "caption", noWrap: true },
                  }}
                />
              </MenuItem>
            ))}
          </MenuList>
        </Paper>
      )}
      {suggestionsUnavailable && (
        <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
          Suggestions unavailable. Type a postal code or address, then use this address — or
          drop a pin.
        </Typography>
      )}
    </Box>
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
