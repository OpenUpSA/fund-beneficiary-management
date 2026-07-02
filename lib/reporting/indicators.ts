// High-level reporting indicators surfaced on the dashboard "Reporting" tab.
//
// MVP behaviour: each indicator matches by EXACT phrase (case-insensitive,
// substring) against the text of a report's answers. `phrases` holds the base
// phrase plus a few curated variants so obvious rewordings still count.
//
// This list is intentionally hardcoded for now. The roadmap is:
//   - later: replace the fixed list with a free-text search box (the same
//     trigram index on LocalDevelopmentAgencyForm.formData already supports it);
//   - later: fuzzy matching via pg_trgm similarity / full-text search.
//
// Keep `phrases` lowercase — matching is done case-insensitively via ILIKE, and
// lowercase keeps the intent obvious. Tune the variants once real report data
// shows what CBOs actually write.

export interface ReportingIndicator {
  /** Stable identifier used as the React key and in the API response. */
  key: string
  /** Human-readable label shown in the Reporting table. */
  label: string
  /**
   * Any of these substrings appearing in a report's answers counts as a match.
   * "handled" vs "resolved" variants are kept distinct so the two service-delivery
   * indicators never double-count the same generic phrase.
   */
  phrases: string[]
}

export const REPORTING_INDICATORS: ReportingIndicator[] = [
  {
    key: "accountability_actions_taken",
    label: "Accountability actions taken",
    phrases: ["accountability action", "accountability actions taken", "accountability measure"],
  },
  {
    key: "government_departments_engaged",
    label: "Government departments engaged",
    phrases: ["government department", "departments engaged", "department engaged", "engaged government"],
  },
  {
    key: "service_delivery_issues_handled",
    label: "Service delivery issues handled",
    phrases: ["service delivery issues handled", "service delivery issue handled", "handled service delivery"],
  },
  {
    key: "service_delivery_issues_resolved",
    label: "Service delivery issues resolved",
    phrases: ["service delivery issues resolved", "service delivery issue resolved", "resolved service delivery"],
  },
  {
    key: "institutional_practices_changed",
    label: "Institutional practices changed/improved",
    phrases: [
      "institutional practice changed",
      "institutional practices changed",
      "institutional practice improved",
      "institutional practices improved",
    ],
  },
  {
    key: "advocacy_campaigns_protests",
    label: "Advocacy campaigns, protests conducted",
    phrases: ["advocacy campaign", "protest conducted", "protests conducted", "conducted a protest"],
  },
  {
    key: "formal_commitments_secured",
    label: "Formal commitments secured",
    phrases: ["formal commitment", "formal commitment secured", "formal commitments secured"],
  },
  {
    key: "significant_community_wins",
    label: "Significant community wins reported",
    phrases: ["significant community win", "community wins reported", "community win"],
  },
]
