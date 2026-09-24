export type IssueCategory =
  | "sewage"
  | "pothole"
  | "garbage"
  | "streetlight"
  | "water"
  | "other";

export type IssueSeverity = "low" | "medium" | "high" | "critical";

export type IssueStatus = "open" | "in_progress" | "resolved";

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  corroborationCount: number;
  estimatedAffectedPopulation: number | null;
  daysOpen: number;
  location: {
    lat: number;
    lng: number;
    address: string | null;
    source?: "browser" | "approximate";
  };
  reportedLanguages: string[];
}

export interface IssueWithPriority extends Issue {
  priorityScore: number;
}

export interface LiveIssue extends IssueWithPriority {
  priorityTier: IssueSeverity;
  priorityVersion: string;
  createdAt: string;
  updatedAt: string;
}
export interface IssueSummary {
  activeIssueCount: number;
  criticalPriorityCount: number;
  linkedReportCount: number;
  averageDaysOpen: number | null;
}
export interface IssueList {
  items: LiveIssue[];
  totalCount: number;
  truncated: boolean;
  summary: IssueSummary;
  calculatedAt: string;
}
export interface IssueDetail extends LiveIssue {
  populationSource: string | null;
  matchingPolicyVersion: string;
  reportCountMeaning: string;
  priorityExplanation: {
    priorityVersion: string;
    calculatedAt: string;
    inputs: { severity: IssueSeverity; linkedReports: number; ageDays: number; population: number | null };
    normalizedComponents: Record<string, number>;
    effectiveWeights: Record<string, number>;
    weightedPoints: Record<string, number>;
    severityFloor: number;
    severityFloorAdjustment: number;
    roundingAdjustment: number;
    finalScore: number;
    omittedPopulationReason: string | null;
    limitations: string;
  };
}
