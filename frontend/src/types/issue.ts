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
  estimatedAffectedPopulation: number;
  daysOpen: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  reportedLanguages: string[];
}

export interface IssueWithPriority extends Issue {
  priorityScore: number;
}
