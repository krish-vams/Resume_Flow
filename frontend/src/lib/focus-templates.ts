export const focusTypeOptions = [
  { value: "JAVA_BACKEND", label: "Java Backend Focused" },
  { value: "DOTNET", label: ".NET Focused" },
  { value: "NODEJS", label: "Node.js Focused" },
  { value: "GOLANG", label: "Golang Focused" },
  { value: "AI", label: "AI Focused" },
  { value: "CLOUD_DEVOPS", label: "Cloud/DevOps Focused" },
  { value: "FULL_STACK", label: "Full Stack Focused" },
  { value: "CUSTOM", label: "Custom" },
];

export type FocusType = (typeof focusTypeOptions)[number]["value"];

export type ResumeFocusTemplate = {
  id: string;
  userId: string;
  name: string;
  focusType: FocusType;
  description?: string | null;
  primaryLanguage?: string | null;
  targetRolesJson?: string[] | null;
  baseResumeText?: string | null;
  baseResumeFileUrl?: string | null;
  defaultSkillsJson?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export function formatFocusType(focusType: string) {
  return focusTypeOptions.find((option) => option.value === focusType)?.label ?? focusType;
}

export function linesToJsonList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function jsonListToLines(value: string[] | null | undefined) {
  return (value ?? []).join("\n");
}
