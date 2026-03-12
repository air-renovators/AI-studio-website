"use client";

import { createContext, useContext, useState, useRef, useCallback } from "react";
import type { NewsletterProgress, Newsletter } from "@/lib/newsletter-types";

interface NewsletterContextValue {
  running: boolean;
  progress: NewsletterProgress | null;
  newsletter: Newsletter | null;
  generateNewsletter: (params: {
    topic: string;
    additionalContext?: string;
    numImages?: number;
  }) => void;
  setNewsletter: (newsletter: Newsletter) => void;
  updateSection: (
    index: number,
    field: "heading" | "body",
    value: string
  ) => void;
  updateField: (
    field: "intro" | "outro" | "preheader",
    value: string
  ) => void;
  selectSubjectLine: (index: number) => void;
}

const NewsletterContext = createContext<NewsletterContextValue | null>(null);

export function NewsletterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<NewsletterProgress | null>(null);
  const [newsletter, setNewsletterState] = useState<Newsletter | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generateNewsletter = useCallback(
    async (params: {
      topic: string;
      additionalContext?: string;
      numImages?: number;
    }) => {
      if (running) return;
      setRunning(true);
      setProgress(null);
      setNewsletterState(null);

      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: abortRef.current.signal,
        });

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data: NewsletterProgress = JSON.parse(line.slice(6));
                setProgress(data);
                if (data.newsletter) {
                  setNewsletterState(data.newsletter);
                }
              } catch {
                // skip
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setProgress((prev) => ({
          ...(prev || {
            phase: "done" as const,
            currentStep: "",
            stepsCompleted: 0,
            stepsTotal: 0,
            log: [],
          }),
          status: "error" as const,
          errors: [err instanceof Error ? err.message : "Unknown error"],
        }));
      } finally {
        setRunning(false);
      }
    },
    [running]
  );

  const setNewsletter = useCallback((nl: Newsletter) => {
    setNewsletterState(nl);
  }, []);

  const updateSection = useCallback(
    (index: number, field: "heading" | "body", value: string) => {
      setNewsletterState((prev) => {
        if (!prev) return prev;
        const sections = [...prev.content.sections];
        sections[index] = { ...sections[index], [field]: value };
        return {
          ...prev,
          content: { ...prev.content, sections },
        };
      });
    },
    []
  );

  const updateField = useCallback(
    (field: "intro" | "outro" | "preheader", value: string) => {
      setNewsletterState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          content: { ...prev.content, [field]: value },
        };
      });
    },
    []
  );

  const selectSubjectLine = useCallback((index: number) => {
    setNewsletterState((prev) => {
      if (!prev) return prev;
      const lines = [...prev.content.subjectLines];
      const selected = lines.splice(index, 1)[0];
      lines.unshift(selected);
      return {
        ...prev,
        content: { ...prev.content, subjectLines: lines },
      };
    });
  }, []);

  return (
    <NewsletterContext.Provider
      value={{
        running,
        progress,
        newsletter,
        generateNewsletter,
        setNewsletter,
        updateSection,
        updateField,
        selectSubjectLine,
      }}
    >
      {children}
    </NewsletterContext.Provider>
  );
}

export function useNewsletter() {
  const ctx = useContext(NewsletterContext);
  if (!ctx)
    throw new Error("useNewsletter must be used within NewsletterProvider");
  return ctx;
}
