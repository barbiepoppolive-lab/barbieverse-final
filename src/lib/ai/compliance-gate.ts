// DEPRECATED — moved to src/shared/compliance-gate.ts
//
// The gate is shared between studio/ (generation, local) and the Railway
// publish path, so it lives in src/shared/. This file is a transitional
// re-export so nothing breaks if an import was missed.
//
// SAFE TO DELETE once `grep -rn "lib/ai/compliance-gate" src studio scripts`
// returns nothing. Do not add rules here — edit the shared module instead.

export * from "@/shared/compliance-gate";
