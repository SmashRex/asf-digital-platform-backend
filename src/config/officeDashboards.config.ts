// Which dashboard a held office unlocks. Offices not listed here unlock no dashboard.
export const officeDashboards: Readonly<Record<string, string>> = {
  president: "president",
  "vice-president": "vice-president",
  "publicity-coordinator": "publicity",
};