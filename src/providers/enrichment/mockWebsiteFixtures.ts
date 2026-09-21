/**
 * Fixture HTML for mock Places accounts — used when enrichment runs without live HTTP.
 * Deterministic extraction tests / Toronto capped validation.
 */

export const MOCK_WEBSITE_HTML: Record<string, string> = {
  "mock-on-001": `<!DOCTYPE html><html><head><title>Yorkville Dermatology</title></head><body>
  <a href="https://instagram.com/mockyorkvillederm">Instagram</a>
  <a href="/book">Book online</a>
  <p>Contact: info@mockyorkderm.example</p>
  <h2>Our Team</h2>
  <p>Jane Smith, MD — Medical Director</p>
  <p>Services: Botox, dermal filler, chemical peels, PDO threads, SkinCeuticals skincare.</p>
  <p>Devices: Morpheus8</p>
  </body></html>`,

  "mock-on-002": `<!DOCTYPE html><html><head><title>King West Cosmetic Medicine</title></head><body>
  <p>Dr. Alex Brown, MD — Owner</p>
  <p>We offer neuromodulators and fillers. Book at https://calendly.com/mockkingwest</p>
  <a href="https://www.linkedin.com/company/mock-king-west">LinkedIn</a>
  </body></html>`,

  "mock-on-003": `<!DOCTYPE html><html><head><title>Harbourfront NP</title></head><body>
  <p>Sam Lee, NP — Injector</p>
  <p>Injectable clinic offering Botox and fillers.</p>
  </body></html>`,

  "mock-on-004": `<!DOCTYPE html><html><head><title>Liberty Sports Medicine</title></head><body>
  <p>Chris Park, MD — Physician</p>
  <p>PRP knee injection and platelet rich plasma for sports injuries.</p>
  </body></html>`,

  "mock-on-005": `<!DOCTYPE html><html><head><title>Queen West MedSpa</title></head><body>
  <p>Medical spa services, HydraFacial, Obagi skincare. Multiple locations in Toronto.</p>
  <p>We're hiring aesthetic nurses.</p>
  </body></html>`,

  "mock-on-006": `<!DOCTYPE html><html><head><title>RN Injector Studio</title></head><body>
  <p>Taylor Ng, RN — Injector</p>
  <p>PDO threads and thread lift services. Nurse injector studio.</p>
  </body></html>`,

  "mock-on-007": `<!DOCTYPE html><html><head><title>Pigment Lab</title></head><body>
  <p>Melasma treatment and Cosmelan / Mesoestetic peels. Acne clinic services.</p>
  <a href="mailto:hello@mockpigment.example">Email</a>
  </body></html>`,

  "mock-on-010": `<!DOCTYPE html><html><head><title>Midtown Hair</title></head><body>
  <p>Pat Rivera, MD — Physician</p>
  <p>Hair restoration and PRP hair restoration treatments.</p>
  </body></html>`,

  "mock-on-012": `<!DOCTYPE html><html><head><title>Former Meso Lab</title></head><body>
  <p>Laser & skin clinic. Previously featured Mesoestetic protocols. Now exploring medical peels.</p>
  <p>Jordan Kim, MD — Medical Director</p>
  </body></html>`,
};

/** Attach fixture website URLs for mock places so enrichment can run offline.
 * Use per-account hosts so absolute paths like /about do not collide in cache.
 */
export function mockWebsiteForPlace(placeId: string): string | null {
  if (MOCK_WEBSITE_HTML[placeId]) {
    return `https://${placeId}.fixture.local/`;
  }
  return null;
}
