export const referenceCategoryOptions = [
  { value: "ACTION_VERBS", label: "Action Verbs" },
  { value: "ATS_KEYWORDS", label: "ATS Keywords" },
  { value: "ACCOMPLISHMENT_EXAMPLES", label: "Accomplishment Examples" },
  { value: "IMPACT_EXAMPLES", label: "Impact Examples" },
  { value: "REWRITING_GUIDE", label: "Experience Rewriting Guide" },
  { value: "OTHER", label: "Other" },
];

export type ReferenceCategory = (typeof referenceCategoryOptions)[number]["value"];

export type ReferenceFileRecord = {
  id: string;
  userId: string;
  name: string;
  fileType: string;
  fileUrl: string;
  category: ReferenceCategory;
  parsedStatus: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    entries: number;
  };
};

export type ReferenceEntryRecord = {
  id: string;
  referenceFileId: string;
  category: ReferenceCategory | string;
  title?: string | null;
  content: string;
  tagsJson?: string[] | null;
  metadataJson?: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
  referenceFile: {
    id: string;
    name: string;
    category: ReferenceCategory;
  };
};

export function formatReferenceCategory(category: string) {
  return referenceCategoryOptions.find((option) => option.value === category)?.label ?? category;
}

export function formatParsedStatus(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}
