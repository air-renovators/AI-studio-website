"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Eye } from "lucide-react";
import type { Newsletter } from "@/lib/newsletter-types";

export default function NewsletterHistoryPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/newsletter/history")
      .then((r) => r.json())
      .then(setNewsletters)
      .catch(() => {});
  }, []);

  const selected = newsletters.find((n) => n.id === selectedId);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-xl">
          <Link href="/newsletter">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Newsletter History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View past newsletters
          </p>
        </div>
      </div>

      {newsletters.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No newsletters generated yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* List */}
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">
                    Topic
                  </th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">
                    Subject Line
                  </th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {newsletters.map((nl) => (
                  <tr
                    key={nl.id}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${
                      selectedId === nl.id ? "bg-purple-500/5" : ""
                    }`}
                    onClick={() =>
                      setSelectedId(selectedId === nl.id ? null : nl.id)
                    }
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(nl.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {nl.topic}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground/70 max-w-[300px] truncate">
                      {nl.content.subjectLines[0]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`rounded-md text-[10px] ${
                          nl.status === "sent"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : nl.status === "scheduled"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-white/[0.05] text-muted-foreground"
                        }`}
                      >
                        {nl.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(
                            selectedId === nl.id ? null : nl.id
                          );
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          {selected && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/[0.06] flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold">
                  Preview: {selected.topic}
                </h2>
              </div>
              <div className="bg-[#f4f1eb] p-6">
                <div
                  className="mx-auto max-w-[600px]"
                  dangerouslySetInnerHTML={{ __html: selected.html }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
