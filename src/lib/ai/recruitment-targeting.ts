// DEPRECATED — moved to src/shared/recruitment-targeting.ts
//
// Segment definitions are shared between studio/ (generation) and the outreach
// path. This file is a transitional re-export so nothing breaks if an import
// was missed.
//
// SAFE TO DELETE once `grep -rn "lib/ai/recruitment-targeting" src studio scripts`
// returns nothing. Do not edit segments here — edit the shared module instead.

export * from "@/shared/recruitment-targeting";
