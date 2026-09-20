// SHIP PHASE 7.4 — single source of truth for the medical disclaimer text,
// shown once during onboarding (screens/onboarding/reveal.tsx, with a real
// acknowledgement gate) and permanently reachable after that from Profile
// (components/MedicalDisclaimerModal.tsx). Keeping one string means the two
// surfaces can't drift out of sync with each other.
export const MEDICAL_DISCLAIMER_TITLE = 'Before you start';

export const MEDICAL_DISCLAIMER_BODY =
  "CLAWW isn't medical advice. Workout plans, nutrition estimates, and recovery scores are " +
  "general fitness guidance, not a diagnosis or treatment. If you have an injury, a medical " +
  "condition, or you're pregnant, talk to a doctor or physical therapist before starting or " +
  'changing any exercise or nutrition program. Nutrition figures — typed in or estimated from ' +
  'a photo — are estimates and may be inaccurate.';

export const MEDICAL_DISCLAIMER_ACK_LABEL = "I understand this isn't medical advice";
