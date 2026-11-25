/*"use client";

import { useCallback, useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

interface Brochure {
  id: string;
  file_name: string;
  vehicle_model: string | null;
  status: string;
  chunk_count: number | null;
  error_message?: string | null;
  updated_at?: string;
}

interface SourceChunk {
  id: string | number;
  fileName: string | null;
  vehicleModel: string | null;
  brochureId: string | null;
  chunkIndex: number | null;
  similarity: number | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Ingestion state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vehicleModel, setVehicleModel] = useState("General");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Brochures & filter state
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [loadingBrochures, setLoadingBrochures] = useState(true);
  const [selectedBrochureId, setSelectedBrochureId] = useState<string>("all");
  const [chatModelFilter, setChatModelFilter] = useState<string>("All");

  // Chat state
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadBrochures = useCallback(async () => {
    setLoadingBrochures(true);
    const { data, error } = await supabase
      .from("brochures")
      .select("id, file_name, vehicle_model, status, chunk_count, error_message, updated_at")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setBrochures(data);
    }
    setLoadingBrochures(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? null);
      await loadBrochures();
    }

    init();
  }, [supabase, router, loadBrochures]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadStatus(null);
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("vehicleModel", vehicleModel.trim() || "General");

      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadStatus(`Error: ${data.error || "Upload failed"}`);
      } else {
        setUploadStatus(
          `Uploaded "${data.fileName}" (${data.chunkCount ?? 0} chunks indexed) for ${data.vehicleModel}`
        );
        setSelectedFile(null);
        await loadBrochures();
      }
    } catch {
      setUploadStatus("Error: Network error while uploading PDF.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          vehicleModel: chatModelFilter === "All" ? null : chatModelFilter,
          brochureId: selectedBrochureId === "all" ? null : selectedBrochureId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error || "Could not get answer."}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply ?? data.answer ?? "No response generated.",
            sources: data.sources,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Network error while querying manual.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  const availableModels = Array.from(
    new Set(
      brochures
        .map((b) => b.vehicle_model?.trim())
        .filter((m): m is string => Boolean(m))
    )
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Hyundai Manual AI Assistant
            </h1>
            <p className="text-sm text-zinc-400">
              Upload a Hyundai owner manual PDF and ask questions grounded in its pages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-xs text-zinc-400">{userEmail}</span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            1. Ingest Manual PDF
          </h2>
          <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-100 hover:file:bg-zinc-700"
            />
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Model (e.g. Creta, Venue)"
              className="w-44 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {uploading ? "Indexing..." : "Upload & Index"}
            </button>
          </form>
          {uploadStatus && (
            <p className="text-sm text-zinc-300">{uploadStatus}</p>
          )}

          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Indexed Brochures
              </span>
              {selectedBrochureId !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedBrochureId("all")}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Clear brochure filter
                </button>
              )}
            </div>

            {loadingBrochures ? (
              <p className="text-xs text-zinc-500">Loading brochures...</p>
            ) : brochures.length === 0 ? (
              <p className="text-xs text-zinc-500">
                No brochures uploaded yet.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/70">
                {brochures.map((b) => {
                  const isSelected = selectedBrochureId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() =>
                        setSelectedBrochureId(isSelected ? "all" : b.id)
                      }
                      className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition ${
                        isSelected ? "bg-blue-950/40" : "hover:bg-zinc-900/70"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-200">
                          {b.file_name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Model: {b.vehicle_model || "General"}
                          {typeof b.chunk_count === "number"
                            ? ` · ${b.chunk_count} chunks`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.status === "indexed"
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                            : b.status === "failed"
                            ? "bg-red-950 text-red-300 border border-red-800/60"
                            : "bg-amber-950 text-amber-300 border border-amber-800/60"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              2. Ask About Your Vehicle
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="model-filter" className="text-zinc-400">
                Model filter:
              </label>
              <select
                id="model-filter"
                value={chatModelFilter}
                onChange={(e) => setChatModelFilter(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="All">All Models</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No questions asked yet. Try asking about tyre pressure, engine oil spec, or warning lights.
              </p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-4 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-950/50 border border-blue-800/50 ml-8"
                      : "bg-zinc-800/70 border border-zinc-700/60 mr-8 space-y-2"
                  }`}
                >
                  <div className="font-semibold text-xs uppercase tracking-wider text-zinc-400 mb-1">
                    {msg.role === "user" ? "You" : "Hyundai Assistant"}
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-zinc-700/60 text-xs text-zinc-400">
                      Sources:{" "}
                      {msg.sources
                        .map((s) => {
                          const label = s.fileName || "Document";
                          const chunkPart =
                            typeof s.chunkIndex === "number"
                              ? ` (chunk ${s.chunkIndex})`
                              : "";
                          const modelPart = s.vehicleModel
                            ? ` [${s.vehicleModel}]`
                            : "";
                          return `${label}${chunkPart}${modelPart}`;
                        })
                        .join(", ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAsk} className="flex gap-2 pt-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question from the Hyundai manual..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!question.trim() || asking}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {asking ? "Thinking..." : "Ask"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
  */


"use client";

import { useCallback, useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";

interface Brochure {
  id: string;
  file_name: string;
  vehicle_model: string | null;
  status: string;
  chunk_count: number | null;
  error_message?: string | null;
  updated_at?: string;
}

interface SourceChunk {
  id: string | number;
  fileName: string | null;
  vehicleModel: string | null;
  brochureId: string | null;
  chunkIndex: number | null;
  similarity: number | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
}

const STARTER_PROMPTS = [
  "Compare Creta and i20 key specs",
  "List interior & infotainment features",
  "Check tyre pressure & maintenance info",
];

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Ingestion state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vehicleModel, setVehicleModel] = useState("General");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Brochures & filter state
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [loadingBrochures, setLoadingBrochures] = useState(true);
  const [selectedBrochureId, setSelectedBrochureId] = useState<string>("all");
  const [chatModelFilter, setChatModelFilter] = useState<string>("All");

  // Chat state
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadBrochures = useCallback(async () => {
    setLoadingBrochures(true);
    const { data, error } = await supabase
      .from("brochures")
      .select("id, file_name, vehicle_model, status, chunk_count, error_message, updated_at")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setBrochures(data);
    }
    setLoadingBrochures(false);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserEmail(user.email ?? null);
      await loadBrochures();
    }

    init();
  }, [supabase, router, loadBrochures]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadStatus(null);
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("vehicleModel", vehicleModel.trim() || "General");

      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadStatus(`Error: ${data.error || "Upload failed"}`);
      } else {
        setUploadStatus(
          `Uploaded "${data.fileName}" (${data.chunkCount ?? 0} chunks indexed) for ${data.vehicleModel}`
        );
        setSelectedFile(null);
        await loadBrochures();
      }
    } catch {
      setUploadStatus("Error: Network error while uploading PDF.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          vehicleModel: chatModelFilter === "All" ? null : chatModelFilter,
          brochureId: selectedBrochureId === "all" ? null : selectedBrochureId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error || "Could not get answer."}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply ?? data.answer ?? "No response generated.",
            sources: data.sources,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Network error while querying manual.",
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  const availableModels = Array.from(
    new Set(
      brochures
        .map((b) => b.vehicle_model?.trim())
        .filter((m): m is string => Boolean(m))
    )
  );

  const indexedCount = brochures.filter((b) => b.status === "indexed").length;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#172554_0%,#09090b_52%,#09090b_100%)] text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/75 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sm font-bold tracking-wider text-sky-400">
              HM
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                  Hyundai Manual AI Assistant
                </h1>
                <span className="hidden rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300 sm:inline-block">
                  {indexedCount} Indexed
                </span>
              </div>
              <p className="text-xs text-zinc-400 sm:text-sm">
                Upload a Hyundai owner manual PDF and ask questions grounded in its pages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs text-zinc-300 md:inline-block">
                {userEmail}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-zinc-700/80 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Split Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Ingestion & Brochures */}
          <section className="lg:col-span-5 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-5 shadow-lg space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-sky-400">
                  Step 01
                </span>
                <h2 className="text-base font-semibold text-zinc-100">
                  Ingest Manual PDF
                </h2>
              </div>
              <span className="rounded-md bg-zinc-800/90 px-2 py-1 text-[11px] text-zinc-400">
                PDF Only
              </span>
            </div>

            <form onSubmit={handleUpload} className="space-y-3.5">
              <div className="rounded-xl border border-dashed border-zinc-700/90 bg-zinc-950/70 p-3.5 transition hover:border-sky-500/50">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-zinc-300 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-sky-500/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-sky-300 hover:file:bg-sky-500/25"
                />
                {selectedFile && (
                  <p className="mt-2 truncate text-xs text-sky-300">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Model (e.g. Creta, Venue)"
                  className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {uploading ? "Indexing..." : "Upload & Index"}
                </button>
              </div>
            </form>

            {uploadStatus && (
              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${
                  uploadStatus.startsWith("Error:")
                    ? "border-red-800/70 bg-red-950/40 text-red-300"
                    : "border-emerald-800/70 bg-emerald-950/40 text-emerald-300"
                }`}
              >
                {uploadStatus}
              </div>
            )}

            {/* Indexed Brochures List */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Indexed Brochures
                </span>
                {selectedBrochureId !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrochureId("all")}
                    className="rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {loadingBrochures ? (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-xs text-zinc-400">
                  Loading brochures...
                </div>
              ) : brochures.length === 0 ? (
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-center text-xs text-zinc-500">
                  No brochures uploaded yet.
                </div>
              ) : (
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {brochures.map((b) => {
                    const isSelected = selectedBrochureId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() =>
                          setSelectedBrochureId(isSelected ? "all" : b.id)
                        }
                        className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                          isSelected
                            ? "border-sky-500/60 bg-sky-950/35 shadow-sm"
                            : "border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-900/80"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-zinc-100">
                              {b.file_name}
                            </p>
                            {isSelected && (
                              <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
                                Filtered
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-zinc-400">
                            Model: {b.vehicle_model || "General"}
                            {typeof b.chunk_count === "number"
                              ? ` · ${b.chunk_count} chunks`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            b.status === "indexed"
                              ? "border border-emerald-700/50 bg-emerald-950/80 text-emerald-300"
                              : b.status === "failed"
                              ? "border border-red-700/50 bg-red-950/80 text-red-300"
                              : "border border-amber-700/50 bg-amber-950/80 text-amber-300"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right Column: Chat Workspace */}
          <section className="lg:col-span-7 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-5 shadow-lg flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-sky-400">
                  Step 02
                </span>
                <h2 className="text-base font-semibold text-zinc-100">
                  Ask About Your Vehicle
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="model-filter" className="text-zinc-400">
                  Model filter:
                </label>
                <select
                  id="model-filter"
                  value={chatModelFilter}
                  onChange={(e) => setChatModelFilter(e.target.value)}
                  className="rounded-lg border border-zinc-700/80 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition focus:border-sky-500 focus:outline-none"
                >
                  <option value="All">All Models</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filter Banner */}
            {(selectedBrochureId !== "all" || chatModelFilter !== "All") && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                <span className="text-zinc-500">Active scope:</span>
                {chatModelFilter !== "All" && (
                  <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-0.5">
                    Model: {chatModelFilter}
                  </span>
                )}
                {selectedBrochureId !== "all" && (
                  <span className="rounded-full border border-sky-700/60 bg-sky-950/60 px-2.5 py-0.5 text-sky-200">
                    Specific brochure selected
                  </span>
                )}
              </div>
            )}

            {/* Messages Thread */}
            <div className="min-h-[340px] max-h-[480px] space-y-3.5 overflow-y-auto rounded-xl border border-zinc-800/70 bg-zinc-950/60 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full min-h-[290px] flex-col items-center justify-center text-center space-y-4 px-2">
                  <div className="space-y-1 max-w-md">
                    <p className="text-sm font-medium text-zinc-200">
                      Ask anything from your uploaded manuals
                    </p>
                    <p className="text-xs text-zinc-400">
                      Try asking about tyre pressure, engine oil spec, infotainment features, or model comparisons.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setQuestion(prompt)}
                        className="rounded-full border border-zinc-700/80 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-sky-500/50 hover:bg-zinc-800 hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-4 text-sm ${
                      msg.role === "user"
                        ? "ml-6 sm:ml-12 border border-sky-500/30 bg-sky-500/10 text-zinc-100"
                        : "mr-4 sm:mr-8 border border-zinc-800 bg-zinc-900/95 text-zinc-100 space-y-2.5 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          msg.role === "user" ? "text-sky-300" : "text-zinc-400"
                        }`}
                      >
                        {msg.role === "user" ? "You" : "Hyundai Assistant"}
                      </span>
                    </div>

                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2.5 border-t border-zinc-800 text-xs text-zinc-400">
                        <span className="font-medium text-zinc-300">Sources: </span>
                        {msg.sources
                          .map((s) => {
                            const label = s.fileName || "Document";
                            const chunkPart =
                              typeof s.chunkIndex === "number"
                                ? ` (chunk ${s.chunkIndex})`
                                : "";
                            const modelPart = s.vehicleModel
                              ? ` [${s.vehicleModel}]`
                              : "";
                            return `${label}${chunkPart}${modelPart}`;
                          })
                          .join(", ")}
                      </div>
                    )}
                  </div>
                ))
              )}

              {asking && (
                <div className="mr-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-xs text-zinc-400">
                  Searching manual chunks and generating response...
                </div>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleAsk} className="flex gap-2.5 pt-1">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question from the Hyundai manual..."
                className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition focus:border-sky-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!question.trim() || asking}
                className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {asking ? "Thinking..." : "Ask"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}