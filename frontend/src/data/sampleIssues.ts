import type { Issue, IssueWithPriority } from "../types/issue";

const SEVERITY_WEIGHT: Record<Issue["severity"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Sample-only stand-in for the real priority function described in the
 * project docs (severity + corroboration + affected population + age).
 * Phase 1 has no live scoring pipeline; this exists so the dashboard's
 * "priority-sorted queue" and summary cards are derived from one source
 * of truth instead of hardcoded ranks.
 */
export function computePriorityScore(issue: Issue): number {
  const severityPoints = SEVERITY_WEIGHT[issue.severity] * 20;
  const corroborationPoints = Math.min(issue.corroborationCount * 3, 60);
  const populationPoints = Math.min((issue.estimatedAffectedPopulation ?? 0) / 20, 30);
  const agePoints = Math.min(issue.daysOpen * 1.5, 20);
  const rawScore = severityPoints + corroborationPoints + populationPoints + agePoints;
  // Normalize to a 0-100 scale (max raw score is 190)
  return Math.round((rawScore / 190) * 100);
}

// Fictional issues in one sample city area ("Ward 7, Rivermill District").
// All coordinates, names, and counts are synthetic demo data.
const RAW_ISSUES: Issue[] = [
  {
    id: "iss-001",
    title: "Sewage overflow near Lakeview bus stop",
    description:
      "Standing sewage water has been flowing onto the road near the bus stop for several days. Residents report a strong smell and children wading through it on the way to school.",
    category: "sewage",
    severity: "critical",
    status: "open",
    corroborationCount: 23,
    estimatedAffectedPopulation: 420,
    daysOpen: 6,
    location: { lat: 13.0827, lng: 80.2707, address: "Lakeview Rd & Bus Stop 4, Rivermill" },
    reportedLanguages: ["Tamil", "English"],
  },
  {
    id: "iss-002",
    title: "Deep pothole outside Rivermill Junction market",
    description:
      "A large pothole has formed at the market junction, causing two-wheeler accidents during evening traffic.",
    category: "pothole",
    severity: "high",
    status: "open",
    corroborationCount: 14,
    estimatedAffectedPopulation: 900,
    daysOpen: 11,
    location: { lat: 13.086, lng: 80.2785, address: "Junction Market Rd, Rivermill" },
    reportedLanguages: ["Tamil", "English", "Telugu"],
  },
  {
    id: "iss-003",
    title: "Uncollected garbage pileup on 3rd Cross Street",
    description:
      "Household waste has not been collected in over a week. Pile is attracting stray animals and blocking part of the footpath.",
    category: "garbage",
    severity: "medium",
    status: "open",
    corroborationCount: 9,
    estimatedAffectedPopulation: 260,
    daysOpen: 8,
    location: { lat: 13.079, lng: 80.2735, address: "3rd Cross Street, Rivermill" },
    reportedLanguages: ["Tamil"],
  },
  {
    id: "iss-004",
    title: "Broken streetlights along Canal Road",
    description:
      "Four consecutive streetlights are non-functional, leaving a stretch of Canal Road unlit at night. Residents report feeling unsafe walking home.",
    category: "streetlight",
    severity: "medium",
    status: "in_progress",
    corroborationCount: 6,
    estimatedAffectedPopulation: 500,
    daysOpen: 15,
    location: { lat: 13.0905, lng: 80.269, address: "Canal Road, Rivermill" },
    reportedLanguages: ["English", "Tamil"],
  },
  {
    id: "iss-005",
    title: "Drinking water pipeline leak near Greenfield School",
    description:
      "A cracked pipeline is leaking treated drinking water continuously, reducing pressure for nearby households.",
    category: "water",
    severity: "high",
    status: "open",
    corroborationCount: 11,
    estimatedAffectedPopulation: 610,
    daysOpen: 4,
    location: { lat: 13.0768, lng: 80.2648, address: "Greenfield School Rd, Rivermill" },
    reportedLanguages: ["Tamil", "English"],
  },
  {
    id: "iss-006",
    title: "Overflowing storm drain behind Anna Nagar Complex",
    description:
      "Storm drain has been blocked by debris and is overflowing onto the internal road after light rain.",
    category: "sewage",
    severity: "medium",
    status: "open",
    corroborationCount: 5,
    estimatedAffectedPopulation: 180,
    daysOpen: 3,
    location: { lat: 13.0842, lng: 80.2755, address: "Anna Nagar Complex, Rivermill" },
    reportedLanguages: ["Tamil"],
  },
  {
    id: "iss-007",
    title: "Series of small potholes on Temple Street",
    description:
      "Multiple shallow potholes have formed after recent rains, mostly affecting cyclists and two-wheelers.",
    category: "pothole",
    severity: "low",
    status: "open",
    corroborationCount: 4,
    estimatedAffectedPopulation: 150,
    daysOpen: 2,
    location: { lat: 13.081, lng: 80.281, address: "Temple Street, Rivermill" },
    reportedLanguages: ["Tamil", "English"],
  },
  {
    id: "iss-008",
    title: "Garbage bin overflow near Riverside Park entrance",
    description:
      "The public garbage bin at the park entrance has been overflowing for several days, with waste scattered nearby.",
    category: "garbage",
    severity: "low",
    status: "resolved",
    corroborationCount: 7,
    estimatedAffectedPopulation: 300,
    daysOpen: 12,
    location: { lat: 13.0778, lng: 80.2712, address: "Riverside Park Entrance, Rivermill" },
    reportedLanguages: ["English", "Tamil"],
  },
  {
    id: "iss-009",
    title: "Flickering and dark streetlight near Rivermill Bridge",
    description:
      "The streetlight at the bridge approach flickers intermittently and goes fully dark after 11pm, a known pedestrian crossing point.",
    category: "streetlight",
    severity: "high",
    status: "open",
    corroborationCount: 8,
    estimatedAffectedPopulation: 340,
    daysOpen: 9,
    location: { lat: 13.0895, lng: 80.2822, address: "Rivermill Bridge Approach, Rivermill" },
    reportedLanguages: ["Tamil", "English"],
  },
];

export const SAMPLE_ISSUES: IssueWithPriority[] = RAW_ISSUES.map((issue) => ({
  ...issue,
  priorityScore: computePriorityScore(issue),
})).sort((a, b) => b.priorityScore - a.priorityScore);

export function getSampleIssueById(id: string): IssueWithPriority | undefined {
  return SAMPLE_ISSUES.find((issue) => issue.id === id);
}
