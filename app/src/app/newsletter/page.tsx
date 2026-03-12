"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Sparkles,
  Send,
  Eye,
  Clock,
  ChevronDown,
  AlertTriangle,
  History,
} from "lucide-react";
import { useNewsletter } from "@/context/newsletter-context";

const PHASE_LABELS: Record<string, string> = {
  research: "Researching topic...",
  content: "Writing newsletter content...",
  images: "Generating infographic images...",
  upload: "Uploading images...",
  html: "Building email HTML...",
  done: "Complete",
};

export default function NewsletterPage() {
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const {
    running,
    progress,
    newsletter,
    generateNewsletter,
    updateSection,
    updateField,
    selectSubjectLine,
  } = useNewsletter();

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progress?.log.length]);

  const handleGenerate = () => {
    if (!topic.trim()) return;
    generateNewsletter({
      topic: topic.trim(),
      additionalContext: additionalContext.trim() || undefined,
    });
  };

  const handleSendTest = async () => {
    if (!newsletter || !testEmail) return;
    setSendStatus("sending");
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", newsletter, testEmail }),
      });
      const data = await res.json();
      setSendStatus(data.success ? "sent" : `Error: ${data.error}`);
    } catch (err) {
      setSendStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  };

  const handleSaveDraft = async () => {
    if (!newsletter) return;
    setSendStatus("saving");
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", newsletter, listIds: [] }),
      });
      const data = await res.json();
      setSendStatus(data.success ? "Draft saved in Brevo" : `Error: ${data.error}`);
    } catch (err) {
      setSendStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  };

  const totalProgress = progress
    ? progress.stepsTotal > 0
      ? (progress.stepsCompleted / progress.stepsTotal) * 100
      : 0
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and send newsletters with AI-powered content and images
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl gap-2">
          <Link href="/newsletter/history">
            <History className="h-4 w-4" />
            History
          </Link>
        </Button>
      </div>

      {/* Input Section */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold">Generate Newsletter</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Gut health tips for summer, The science behind probiotics..."
              className="mt-1.5 rounded-xl glass border-white/[0.08] h-11"
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
            />
            Additional context
          </button>

          {showAdvanced && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-xs text-muted-foreground">
                Notes (optional)
              </Label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Any specific angles, products to highlight, seasonal ties..."
                className="mt-1.5 rounded-xl glass border-white/[0.08] min-h-[80px]"
              />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={running || !topic.trim()}
            size="lg"
            className="w-full rounded-xl h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 glow-sm transition-all duration-300 hover:glow text-sm font-semibold"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Newsletter...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Generate Newsletter
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Section */}
      {progress && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {progress.status === "running" && (
                  <Loader2 className="h-4 w-4 text-purple-400 animate-spin" />
                )}
                {progress.status === "completed" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                {progress.status === "error" && (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <h2 className="text-sm font-semibold">
                  {progress.status === "running"
                    ? PHASE_LABELS[progress.phase] || progress.currentStep
                    : progress.status === "completed"
                      ? "Newsletter generated"
                      : "Generation failed"}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Step{" "}
                  <span className="text-foreground">
                    {progress.stepsCompleted}/{progress.stepsTotal}
                  </span>
                </span>
                {progress.errors.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    {progress.errors.length}
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress.status === "completed"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : progress.status === "error"
                        ? "bg-gradient-to-r from-red-500 to-orange-500"
                        : "bg-gradient-to-r from-purple-500 to-indigo-500"
                  }`}
                  style={{
                    width: `${progress.status === "completed" ? 100 : totalProgress}%`,
                  }}
                />
              </div>
            </div>

            {/* Completion CTA */}
            {progress.status === "completed" && newsletter && (
              <Button
                onClick={() => setShowPreview(true)}
                className="w-full rounded-xl h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 border-0 font-semibold gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview Newsletter
              </Button>
            )}

            {/* Errors */}
            {progress.errors.length > 0 && (
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-3 space-y-1">
                <p className="text-[11px] font-medium text-red-400">
                  Errors ({progress.errors.length})
                </p>
                {progress.errors.map((err, i) => (
                  <p
                    key={i}
                    className="text-[11px] text-red-400/70 leading-relaxed"
                  >
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Log */}
          <details className="glass rounded-2xl overflow-hidden">
            <summary className="p-4 flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Terminal className="h-4 w-4" />
              <span className="font-medium">Log</span>
              <Badge
                variant="secondary"
                className="ml-auto rounded-md text-[10px] bg-white/[0.05] border border-white/[0.06]"
              >
                {progress.log.length} entries
              </Badge>
            </summary>
            <div className="border-t border-white/[0.06]">
              <ScrollArea className="h-[300px] p-4">
                <div className="space-y-0.5 font-mono text-[11px]">
                  {progress.log.map((line, i) => (
                    <div
                      key={i}
                      className={`leading-5 ${
                        line.includes("Error") || line.includes("error")
                          ? "text-red-400"
                          : line.includes("done") ||
                              line.includes("complete") ||
                              line.includes("Complete") ||
                              line.includes("generated") ||
                              line.includes("saved")
                            ? "text-emerald-400/80"
                            : "text-muted-foreground"
                      }`}
                    >
                      {line}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </ScrollArea>
            </div>
          </details>
        </div>
      )}

      {/* Preview Section */}
      {newsletter && (showPreview || progress?.status === "completed") && (
        <div className="space-y-4">
          {/* Subject Lines */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold">Subject Lines</h2>
            <div className="space-y-2">
              {newsletter.content.subjectLines.map((line, i) => (
                <button
                  key={i}
                  onClick={() => selectSubjectLine(i)}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm transition-all ${
                    i === 0
                      ? "bg-purple-500/10 border border-purple-500/20 text-foreground"
                      : "bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && (
                      <Badge className="bg-purple-500/20 text-purple-300 border-0 text-[10px]">
                        Selected
                      </Badge>
                    )}
                    {editingField === `subject-${i}` ? (
                      <input
                        autoFocus
                        className="bg-transparent border-none outline-none w-full"
                        defaultValue={line}
                        onBlur={(e) => {
                          newsletter.content.subjectLines[i] = e.target.value;
                          setEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            newsletter.content.subjectLines[i] = (
                              e.target as HTMLInputElement
                            ).value;
                            setEditingField(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingField(`subject-${i}`);
                        }}
                      >
                        {line}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              <p className="text-[11px] text-muted-foreground">
                Click to select. Double-click to edit.
              </p>
            </div>

            {/* Preheader */}
            <div>
              <Label className="text-xs text-muted-foreground">
                Preheader text
              </Label>
              {editingField === "preheader" ? (
                <Input
                  autoFocus
                  defaultValue={newsletter.content.preheader}
                  onBlur={(e) => {
                    updateField("preheader", e.target.value);
                    setEditingField(null);
                  }}
                  className="mt-1.5 rounded-xl glass border-white/[0.08] h-9 text-sm"
                />
              ) : (
                <p
                  className="mt-1.5 text-sm text-foreground/70 cursor-pointer hover:text-foreground transition-colors"
                  onDoubleClick={() => setEditingField("preheader")}
                >
                  {newsletter.content.preheader}
                </p>
              )}
            </div>
          </div>

          {/* Email Preview */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold">Email Preview</h2>
              <p className="ml-auto text-[11px] text-muted-foreground">
                Double-click any text to edit
              </p>
            </div>
            <div className="bg-[#f4f1eb] p-6">
              <div
                className="mx-auto max-w-[600px] bg-white rounded-2xl overflow-hidden shadow-lg"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
              >
                {/* Email Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-center">
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    Kickass Kombucha
                  </h1>
                  <p className="mt-2 text-sm text-white/70">
                    The Alchemist&apos;s Notebook
                  </p>
                </div>

                {/* Intro */}
                <div className="p-8 pb-4">
                  {editingField === "intro" ? (
                    <Textarea
                      autoFocus
                      defaultValue={newsletter.content.intro}
                      onBlur={(e) => {
                        updateField("intro", e.target.value);
                        setEditingField(null);
                      }}
                      className="bg-transparent border border-purple-300 rounded-lg text-[#333] text-base leading-relaxed"
                    />
                  ) : (
                    <p
                      className="text-[#333] text-base leading-relaxed cursor-pointer hover:bg-yellow-50 rounded-lg p-1 -m-1 transition-colors"
                      onDoubleClick={() => setEditingField("intro")}
                    >
                      {newsletter.content.intro}
                    </p>
                  )}
                </div>

                {/* Sections */}
                <div className="px-8 pb-4">
                  {newsletter.content.sections.map((section, i) => (
                    <div key={i} className="pb-8">
                      {section.imageUrl && (
                        <img
                          src={section.imageUrl}
                          alt={section.heading}
                          className="w-full rounded-xl mb-4"
                        />
                      )}
                      {editingField === `heading-${i}` ? (
                        <Input
                          autoFocus
                          defaultValue={section.heading}
                          onBlur={(e) => {
                            updateSection(i, "heading", e.target.value);
                            setEditingField(null);
                          }}
                          className="bg-transparent border border-purple-300 rounded-lg text-[#1a1a2e] text-xl font-bold mb-3"
                        />
                      ) : (
                        <h2
                          className="text-xl font-bold text-[#1a1a2e] mb-3 cursor-pointer hover:bg-yellow-50 rounded-lg p-1 -m-1 transition-colors"
                          onDoubleClick={() => setEditingField(`heading-${i}`)}
                        >
                          {section.heading}
                        </h2>
                      )}
                      {editingField === `body-${i}` ? (
                        <Textarea
                          autoFocus
                          defaultValue={section.body}
                          onBlur={(e) => {
                            updateSection(i, "body", e.target.value);
                            setEditingField(null);
                          }}
                          className="bg-transparent border border-purple-300 rounded-lg text-[#333] text-base leading-relaxed min-h-[120px]"
                        />
                      ) : (
                        <div
                          className="text-[#333] text-base leading-relaxed cursor-pointer hover:bg-yellow-50 rounded-lg p-1 -m-1 transition-colors"
                          onDoubleClick={() => setEditingField(`body-${i}`)}
                          dangerouslySetInnerHTML={{ __html: section.body }}
                        />
                      )}
                      {section.cta && (
                        <div className="mt-4">
                          <span className="inline-block bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-lg">
                            {section.cta.text}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Outro */}
                <div className="px-8 pb-8 border-t border-gray-100 pt-4">
                  {editingField === "outro" ? (
                    <Textarea
                      autoFocus
                      defaultValue={newsletter.content.outro}
                      onBlur={(e) => {
                        updateField("outro", e.target.value);
                        setEditingField(null);
                      }}
                      className="bg-transparent border border-purple-300 rounded-lg text-[#555] text-base leading-relaxed"
                    />
                  ) : (
                    <p
                      className="text-[#555] text-base leading-relaxed cursor-pointer hover:bg-yellow-50 rounded-lg p-1 -m-1 transition-colors"
                      onDoubleClick={() => setEditingField("outro")}
                    >
                      {newsletter.content.outro}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-[#1a1a2e] p-6 text-center">
                  <p className="text-xs text-white/50">
                    Kickass Kombucha &middot; Mtunzini, South Africa
                    <br />
                    <a
                      href="https://kickasskombucha.co.za"
                      className="text-white/70 underline"
                    >
                      kickasskombucha.co.za
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Send Section */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold">Send</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Test email
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="rounded-xl glass border-white/[0.08] h-10 text-sm"
                  />
                  <Button
                    onClick={handleSendTest}
                    disabled={!testEmail || sendStatus === "sending"}
                    variant="outline"
                    className="rounded-xl h-10 shrink-0"
                  >
                    {sendStatus === "sending" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Send Test"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Save to Brevo
                </Label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveDraft}
                    variant="outline"
                    className="rounded-xl h-10 flex-1 gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Save as Draft
                  </Button>
                </div>
              </div>
            </div>

            {sendStatus && sendStatus !== "sending" && sendStatus !== "saving" && (
              <div
                className={`rounded-xl p-3 text-sm ${
                  sendStatus.startsWith("Error")
                    ? "bg-red-500/10 text-red-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {sendStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
