/**
 * Build-time switches for features that exist in the code but are not shown.
 * Flip and redeploy; nothing else to configure.
 */

/**
 * Clinic intelligence — "Research clinic" → offerings → product gaps → best
 * NUVIOR opportunity (Stages C/D/E). Hidden on 2026-11-05: the button, the
 * drawer section, the itinerary badge and the brief block all stay out of the
 * UI, and no research is loaded or run. The data and the engine are intact.
 */
export const SHOW_CLINIC_INTELLIGENCE = false;

/**
 * "Structure notes with AI" on the visit form (LLM turns free-text notes into
 * outcome, people met, products, next action). Hidden on 2026-11-05; the
 * server action and the LLM provider stay in place.
 */
export const SHOW_AI_NOTE_STRUCTURING = false;
