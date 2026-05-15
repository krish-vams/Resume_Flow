export type EligibilitySeverity = "none" | "warning" | "blocked";

export type EligibilityResult = {
  passed: boolean;
  restrictedTermsFound: string[];
  severity: EligibilitySeverity;
};

const restrictedTerms = [
  "U.S. Citizenship",
  "US Citizenship",
  "U.S. Citizen",
  "US Citizen",
  "U.S. Persons Only",
  "US Persons Only",
  "Security Clearance",
  "Active Clearance",
  "Secret Clearance",
  "Top Secret",
  "TS/SCI",
  "Public Trust",
  "Clearance Required",
  "Must Be A U.S. Citizen",
  "Only U.S. Citizens"
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function analyzeEligibility(jobDescription: string): EligibilityResult {
  const normalizedDescription = normalize(jobDescription);
  const restrictedTermsFound = restrictedTerms.filter((term) =>
    normalizedDescription.includes(normalize(term))
  );

  if (restrictedTermsFound.length === 0) {
    return {
      passed: true,
      restrictedTermsFound: [],
      severity: "none"
    };
  }

  return {
    passed: false,
    restrictedTermsFound,
    severity: "blocked"
  };
}
