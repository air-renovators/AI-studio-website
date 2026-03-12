export interface NewsletterParams {
  topic: string;
  additionalContext?: string;
  numImages?: number;
}

export interface NewsletterSection {
  heading: string;
  body: string;
  cta?: { text: string; url: string };
  imagePrompt: string;
  imageUrl?: string;
}

export interface NewsletterContent {
  subjectLines: string[];
  preheader: string;
  intro: string;
  sections: NewsletterSection[];
  outro: string;
  research: string;
}

export interface Newsletter {
  id: string;
  topic: string;
  content: NewsletterContent;
  html: string;
  plainText: string;
  status: "draft" | "sent" | "scheduled";
  sentAt?: string;
  createdAt: string;
}

export interface NewsletterProgress {
  status: "idle" | "running" | "completed" | "error";
  phase: "research" | "content" | "images" | "upload" | "html" | "done";
  currentStep: string;
  stepsCompleted: number;
  stepsTotal: number;
  errors: string[];
  log: string[];
  newsletter?: Newsletter;
}
