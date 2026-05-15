export type PromptTemplate = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  promptText: string;
  targetRole?: string | null;
  candidateName?: string | null;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AssembledPrompt = {
  promptTemplateId: string;
  promptTemplateVersion: number;
  jobId: string;
  referenceEntryIds?: string[];
  finalPrompt: string;
};
