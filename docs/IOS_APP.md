# iOS app (field reps)

A Capacitor shell in `ios/` that loads the live Nuvior Prime site and adds
**background location**: once a rep turns on "Share location", positions keep
reaching `/api/positions` while the phone is locked. Web deploys reach the app
without a new build; only native changes (plugins, Info.plist) need one.

- Config: `capacitor.config.ts` (site URL from `CAP_SERVER_URL`, default `http://localhost:3100` for the Simulator)
- Native watcher: `src/lib/nativeLocation.ts`, used by `src/components/today/LiveLocationToggle.tsx`
- Permission texts and `UIBackgroundModes = location`: `ios/App/App/Info.plist`
- Offline fallback page: `mobile/www/index.html`

## Requirements

- Xcode (from the Mac App Store) plus the iOS Simulator runtime, then
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- An Apple Developer account ($99/year) for installing on real phones

## Run in the Simulator

```bash
npm run ios:sync      # after changing capacitor.config.ts or plugins
npm run ios:open      # opens Xcode; pick an iPhone simulator and press Run
```

The dev server must be running on port 3100. In the Simulator, use
Features → Location to simulate movement.

## Ship to reps (Ad Hoc, up to 100 devices/year)

1. Register each rep's iPhone UDID in the Apple Developer portal (Devices).
2. Create an Ad Hoc provisioning profile for `com.nuvior.prime` that includes those devices.
3. Point the app at production and sync:
   `CAP_SERVER_URL=https://<production-domain> npm run ios:sync`
4. In Xcode: Product → Archive → Distribute App → Ad Hoc, with an install manifest.
5. Host the `.ipa` and `manifest.plist` over HTTPS and send reps an
   `itms-services://?action=download-manifest&url=https://…/manifest.plist` link.

Renew once a year: the profile expires after 12 months. Renew it and repeat
steps 2–5. A new rep or a new phone means adding the UDID and rebuilding.

## Rep onboarding

When asked, reps should choose **Allow While Using App**, then later
**Change to Always Allow** (iOS asks again after a while, or set it in
Settings → Nuvior Prime → Location → Always). Without "Always", updates stop
when the phone locks.
