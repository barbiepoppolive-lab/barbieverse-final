// DEPRECATED — moved to src/shared/brand-terminology.ts
//
// Content generation now lives in studio/ (local-only) while the compliance and
// terminology rules are shared between it and the Railway publish path. This
// file is a transitional re-export so nothing breaks if an import was missed.
//
// SAFE TO DELETE once `grep -rn "lib/ai/brand-terminology" src studio scripts`
// returns nothing. Do not add anything here — edit the shared module instead.

export * from "@/shared/brand-terminology";
