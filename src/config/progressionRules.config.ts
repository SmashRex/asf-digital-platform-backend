export interface ProgressionRule {
  targetLevel: string;
  targetMembershipStatus: "Active Student" | "Alumni";
}

// Keyed by `${currentLevel}:${programDurationYears}`.
// Levels with only one possible outcome (independent of duration) still get both keys,
// pointing to the same rule — keeps lookup logic uniform, no special-casing.
export const progressionMatrix: Record<string, ProgressionRule> = {
  "100 Level:4": { targetLevel: "200 Level", targetMembershipStatus: "Active Student" },
  "100 Level:5": { targetLevel: "200 Level", targetMembershipStatus: "Active Student" },
  "200 Level:4": { targetLevel: "300 Level", targetMembershipStatus: "Active Student" },
  "200 Level:5": { targetLevel: "300 Level", targetMembershipStatus: "Active Student" },
  "300 Level:4": { targetLevel: "400 Level", targetMembershipStatus: "Active Student" },
  "300 Level:5": { targetLevel: "400 Level", targetMembershipStatus: "Active Student" },
  "400 Level:4": { targetLevel: "Alumni", targetMembershipStatus: "Alumni" },
  "400 Level:5": { targetLevel: "500 Level", targetMembershipStatus: "Active Student" },
  "500 Level:4": { targetLevel: "Alumni", targetMembershipStatus: "Alumni" }, // shouldn't occur, but defined for safety
  "500 Level:5": { targetLevel: "Alumni", targetMembershipStatus: "Alumni" },
  "Postgraduate:4": { targetLevel: "Postgraduate", targetMembershipStatus: "Active Student" },
  "Postgraduate:5": { targetLevel: "Postgraduate", targetMembershipStatus: "Active Student" },
  "Alumni:4": { targetLevel: "Alumni", targetMembershipStatus: "Alumni" },
  "Alumni:5": { targetLevel: "Alumni", targetMembershipStatus: "Alumni" },
};

export function getProgressionRule(currentLevel: string, programDurationYears: number): ProgressionRule {
  const key = `${currentLevel}:${programDurationYears}`;
  const rule = progressionMatrix[key];
  if (!rule) {
    throw new Error(`No progression rule defined for ${key}`);
  }
  return rule;
}