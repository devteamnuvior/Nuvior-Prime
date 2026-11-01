/**
 * Live map — local-development simulator. Drives every active REP around the
 * clinics in their province so the admin live map has something to watch:
 * drive to a clinic, dwell there a while, pick the next one. Writes only
 * RepPosition rows (source "sim"); stop it with Ctrl-C.
 *
 *   npm run live:simulate
 *   LIVE_SIM_SPEED_MPS=40 LIVE_SIM_TICK_MS=2000 npm run live:simulate
 */
import { prisma } from "../src/lib/prisma";
import { haversineKm } from "../src/domain/geo";
import { AT_CLINIC_RADIUS_M } from "../src/domain/live/positions";

const TICK_MS = Number(process.env.LIVE_SIM_TICK_MS ?? 3000);
const SPEED_MPS = Number(process.env.LIVE_SIM_SPEED_MPS ?? 14);
const DWELL_TICKS = Number(process.env.LIVE_SIM_DWELL_TICKS ?? 20);
const MAX_LEG_KM = Number(process.env.LIVE_SIM_MAX_LEG_KM ?? 12);

const PROVINCE_CENTERS: Record<string, { lat: number; lng: number }> = {
  ON: { lat: 43.6532, lng: -79.3832 },
  QC: { lat: 45.5019, lng: -73.5674 },
  BC: { lat: 49.2827, lng: -123.1207 },
  AB: { lat: 51.0447, lng: -114.0719 },
  MB: { lat: 49.8951, lng: -97.1384 },
  SK: { lat: 52.1332, lng: -106.67 },
  NS: { lat: 44.6488, lng: -63.5752 },
  NB: { lat: 45.9636, lng: -66.6431 },
  NL: { lat: 47.5615, lng: -52.7126 },
  PE: { lat: 46.2382, lng: -63.1311 },
};

type Clinic = { id: string; lat: number; lng: number; name: string };
type Walker = {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  clinics: Clinic[];
  target: Clinic | null;
  dwell: number;
  heading: number;
};

function bearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function pickTarget(w: Walker): Clinic | null {
  const near = w.clinics.filter((c) => c.id !== w.target?.id && haversineKm(w, c) <= MAX_LEG_KM);
  const pool = near.length ? near : w.clinics.filter((c) => c.id !== w.target?.id);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

async function main() {
  const reps = await prisma.user.findMany({ where: { role: "REP", status: "ACTIVE" }, include: { position: true } });
  const walkers: Walker[] = [];
  for (const rep of reps) {
    const provinces = rep.provinces.includes("*") ? Object.keys(PROVINCE_CENTERS) : rep.provinces;
    const accounts = await prisma.account.findMany({ where: { provinceCode: { in: provinces } }, select: { id: true, latitude: true, longitude: true, businessName: true } });
    const clinics = accounts.map((a) => ({ id: a.id, lat: a.latitude, lng: a.longitude, name: a.businessName }));
    const center = PROVINCE_CENTERS[provinces[0] ?? "ON"] ?? PROVINCE_CENTERS.ON!;
    const w: Walker = {
      userId: rep.id,
      name: rep.displayName,
      lat: rep.position?.lat ?? center.lat,
      lng: rep.position?.lng ?? center.lng,
      clinics,
      target: null,
      dwell: 0,
      heading: rep.position?.headingDeg ?? 0,
    };
    // A rep with no clinics in their province wanders a small loop around the province centre.
    if (!clinics.length) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        w.clinics.push({ id: `virtual-${rep.id}-${i}`, lat: center.lat + Math.sin(a) * 0.03, lng: center.lng + Math.cos(a) * 0.04, name: `Waypoint ${i + 1}` });
      }
    }
    w.target = pickTarget(w);
    walkers.push(w);
  }
  if (!walkers.length) {
    console.log("No active reps to simulate.");
    return;
  }
  console.log(`Simulating ${walkers.length} rep(s) every ${TICK_MS} ms at ${SPEED_MPS} m/s. Ctrl-C to stop.`);

  const step = async () => {
    for (const w of walkers) {
      let speed = 0;
      let atClinic: Clinic | null = null;
      if (w.dwell > 0) {
        w.dwell -= 1;
        atClinic = w.target;
        if (w.dwell === 0) w.target = pickTarget(w);
      } else if (w.target) {
        const distM = haversineKm(w, w.target) * 1000;
        const stepM = SPEED_MPS * (TICK_MS / 1000);
        if (distM <= stepM || distM <= AT_CLINIC_RADIUS_M / 2) {
          w.lat = w.target.lat;
          w.lng = w.target.lng;
          w.dwell = DWELL_TICKS;
          atClinic = w.target;
        } else {
          const f = stepM / distM;
          w.heading = bearing(w, w.target);
          w.lat += (w.target.lat - w.lat) * f;
          w.lng += (w.target.lng - w.lng) * f;
          speed = SPEED_MPS * (0.85 + Math.random() * 0.3);
        }
      }
      const accountId = atClinic && !atClinic.id.startsWith("virtual-") ? atClinic.id : null;
      await prisma.repPosition.upsert({
        where: { userId: w.userId },
        create: { userId: w.userId, lat: w.lat, lng: w.lng, accountId, speedMps: speed, headingDeg: w.heading, accuracyM: 8, source: "sim", recordedAt: new Date() },
        update: { lat: w.lat, lng: w.lng, accountId, speedMps: speed, headingDeg: w.heading, accuracyM: 8, source: "sim", recordedAt: new Date() },
      });
      const state = atClinic ? `at ${atClinic.name}` : w.target ? `→ ${w.target.name}` : "idle";
      process.stdout.write(`${w.name.padEnd(22)} ${w.lat.toFixed(5)}, ${w.lng.toFixed(5)}  ${state}\n`);
    }
    process.stdout.write("\n");
  };

  await step();
  const timer = setInterval(() => void step().catch((e) => console.error(e)), TICK_MS);
  const stop = async () => {
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
