import type { FocusType } from "@prisma/client";

export type ExtractedKeywords = {
  all: string[];
  byFocusType: Record<FocusType, string[]>;
};

export type FocusRecommendation = {
  recommendedFocus: string;
  recommendedFocusType: FocusType;
  recommendedFocusTemplateId: string | null;
  confidence: number;
  matchedKeywords: string[];
  reason: string;
};

export type AvailableFocusTemplate = {
  id: string;
  name: string;
  focusType: FocusType;
};

const focusKeywordMap: Record<FocusType, string[]> = {
  DOTNET: ["C#", ".NET", "ASP.NET", "ASP.NET Core", "Entity Framework", "Blazor", "Azure DevOps"],
  NODEJS: ["Node.js", "Express.js", "NestJS", "JavaScript", "TypeScript", "React", "Next.js", "REST APIs", "GraphQL"],
  GOLANG: ["Go", "Golang", "Gin", "Fiber", "gRPC", "Concurrency", "Goroutines", "Low-Latency"],
  AI: [
    "AI",
    "GenAI",
    "LLM",
    "RAG",
    "LangChain",
    "Vector DB",
    "Pinecone",
    "OpenAI",
    "Anthropic",
    "Claude",
    "Gemini",
    "AWS Bedrock",
    "Prompt Engineering",
    "Embeddings"
  ],
  JAVA_BACKEND: [
    "Java",
    "Spring Boot",
    "Spring Security",
    "Hibernate",
    "JPA",
    "Microservices",
    "Kafka",
    "Maven",
    "Gradle",
    "JUnit"
  ],
  CLOUD_DEVOPS: ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions", "CI/CD", "EKS", "EC2", "Lambda", "RDS", "CloudWatch"],
  FULL_STACK: ["React", "Next.js", "TypeScript", "Node.js", "REST APIs", "GraphQL", "Java", "Spring Boot", "AWS"],
  CUSTOM: []
};

function keywordPattern(keyword: string) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9+#.])${escapedKeyword}([^a-zA-Z0-9+#.]|$)`, "i");
}

function findMatchedKeywords(jobDescription: string, keywords: string[]) {
  return keywords.filter((keyword) => keywordPattern(keyword).test(jobDescription));
}

function formatFocusType(focusType: FocusType) {
  const labels: Record<FocusType, string> = {
    DOTNET: ".NET Focused",
    NODEJS: "Node.js Focused",
    GOLANG: "Golang Focused",
    AI: "AI Focused",
    JAVA_BACKEND: "Java Backend Focused",
    CLOUD_DEVOPS: "Cloud/DevOps Focused",
    FULL_STACK: "Full Stack Focused",
    CUSTOM: "Custom"
  };

  return labels[focusType];
}

export function extractKeywords(jobDescription: string): ExtractedKeywords {
  const byFocusType = Object.entries(focusKeywordMap).reduce((accumulator, [focusType, keywords]) => {
    accumulator[focusType as FocusType] = findMatchedKeywords(jobDescription, keywords);
    return accumulator;
  }, {} as Record<FocusType, string[]>);

  const all = [...new Set(Object.values(byFocusType).flat())];

  return {
    all,
    byFocusType
  };
}

export function recommendFocusTemplate(
  jobDescription: string,
  availableTemplates: AvailableFocusTemplate[]
): FocusRecommendation {
  const extractedKeywords = extractKeywords(jobDescription);
  const rankedFocusTypes = Object.entries(extractedKeywords.byFocusType)
    .map(([focusType, matchedKeywords]) => ({
      focusType: focusType as FocusType,
      matchedKeywords,
      score: matchedKeywords.length
    }))
    .sort((left, right) => right.score - left.score);

  const bestMatch = rankedFocusTypes[0] ?? {
    focusType: "CUSTOM" as FocusType,
    matchedKeywords: [],
    score: 0
  };

  const maxKeywordCount = focusKeywordMap[bestMatch.focusType].length || 1;
  const confidence = Math.min(100, Math.round((bestMatch.score / maxKeywordCount) * 100));
  const matchingTemplate =
    availableTemplates.find((template) => template.focusType === bestMatch.focusType) ??
    availableTemplates[0] ??
    null;
  const recommendedFocus = matchingTemplate?.name ?? formatFocusType(bestMatch.focusType);
  const keywordList = bestMatch.matchedKeywords.slice(0, 6).join(", ");

  return {
    recommendedFocus,
    recommendedFocusType: bestMatch.focusType,
    recommendedFocusTemplateId: matchingTemplate?.id ?? null,
    confidence,
    matchedKeywords: bestMatch.matchedKeywords,
    reason:
      bestMatch.matchedKeywords.length > 0
        ? `The JD emphasizes ${keywordList}.`
        : "No strong stack-specific keyword cluster was found, so a manual focus selection is recommended."
  };
}
