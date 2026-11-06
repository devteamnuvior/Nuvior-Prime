import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin, Location } from "@capacitor-community/background-geolocation";

/**
 * Background location for the iOS app (Capacitor shell). A browser tab stops
 * reporting once the phone is locked; the native watcher keeps delivering
 * fixes in the background, as long as the rep allowed "Always".
 *
 * On the web none of this runs — callers check `isNativeApp()` first and fall
 * back to `navigator.geolocation.watchPosition`.
 */

export type LocationFix = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  recordedAt: number;
};

export type NativeLocationError = "denied" | "unavailable";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("BackgroundGeolocation");
}

function finiteOrNull(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) ? n : null;
}

export function fixFromNativeLocation(loc: Location, now: number = Date.now()): LocationFix {
  const heading = finiteOrNull(loc.bearing);
  const speed = finiteOrNull(loc.speed);
  return {
    lat: loc.latitude,
    lng: loc.longitude,
    accuracyM: finiteOrNull(loc.accuracy),
    // iOS reports -1 for "unknown" heading/speed.
    headingDeg: heading != null && heading >= 0 ? heading : null,
    speedMps: speed != null && speed >= 0 ? speed : null,
    recordedAt: loc.time ?? now,
  };
}

/** Starts the native watcher; resolves to a function that stops it. */
export async function watchNativeLocation(
  onFix: (fix: LocationFix) => void,
  onError: (reason: NativeLocationError) => void,
): Promise<() => void> {
  const id = await BackgroundGeolocation.addWatcher(
    {
      // Defining backgroundMessage is what keeps updates coming while the app
      // is in the background (it's also Android's notification text).
      backgroundMessage: "Nuvior Prime is sharing your location with your admin.",
      backgroundTitle: "Sharing location",
      requestPermissions: true,
      stale: false,
      distanceFilter: 10,
    },
    (location, error) => {
      if (error) {
        onError(error.code === "NOT_AUTHORIZED" ? "denied" : "unavailable");
        return;
      }
      if (location) onFix(fixFromNativeLocation(location));
    },
  );
  return () => {
    void BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
  };
}

export function openNativeLocationSettings(): void {
  void BackgroundGeolocation.openSettings().catch(() => {});
}
