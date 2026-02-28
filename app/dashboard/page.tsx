"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Inter } from "next/font/google";
import mammoth from "mammoth";
import { supabase } from "@/utils/supabase";
import { exportPDF } from "@/utils/pdf-export";
import {
  FormatText,
  getRiskColor,
  InteractiveChecklist,
  MetricBox,
  TabItem,
  List,
  SlaTimeline,
  Timeline,
  LoadingView,
  EmptyStateView,
} from "@/components/dashboard-ui";

import {
  ShieldAlert,
  User,
  Download,
  AlertTriangle,
  CheckCircle2,
  GitCommit,
  Loader2,
  Moon,
  Sun,
  Clock,
  Users,
  Activity,
  Percent,
  Upload,
  ListChecks,
  Wand2,
  FileSearch,
  AlignLeft,
  Layers,
  CheckSquare,
  History,
  LogOut,
  LogIn,
  X,
  Menu,
  Search,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [policyText, setPolicyText] = useState("");
  const [mode, setMode] = useState<"officer" | "citizen">("officer");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refiningType, setRefiningType] = useState<
    "elaborate" | "simplify" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchHistory(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchHistory(session.user.id);
      else setHistory([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setHistory(data);
  };

  const deleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await supabase.from("workflows").delete().eq("id", id);

    if (!error) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (result?.__workflowId === id) {
        setResult(null);
        setPolicyText("");
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setResult(null);
    setPolicyText("");
    setShowSidebar(false);
  };

  const loadHistoryItem = (item: any) => {
    setPolicyText(item.policy_text);
    setMode(item.mode);
    setResult({ ...item.result_json, __workflowId: item.id });
    if (window.innerWidth < 1024) setShowSidebar(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingFile(true);
    setError(null);

    try {
      if (file.type === "text/plain") {
        const text = await file.text();
        setPolicyText(text);
      } else if (file.type === "application/pdf") {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          extractedText +=
            content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setPolicyText(extractedText);
      } else if (
        file.name.endsWith(".docx") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const docResult = await mammoth.extractRawText({ arrayBuffer });
        setPolicyText(docResult.value);
      } else {
        setError(
          "Unsupported file format. Please upload .txt, .pdf, or .docx files.",
        );
      }
    } catch (err) {
      setError("Failed to read the uploaded document.");
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generate = async (refinePrompt?: string, actionType?: string) => {
    if (!policyText.trim()) return;
    setLoading(true);
    setError(null);
    if (actionType) setRefiningType(actionType as any);
    else setResult(null);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyText, mode, refineMode: refinePrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate workflow");
      }

      setResult(data.data);

      if (session && !actionType) {
        const { data: inserted } = await supabase
          .from("workflows")
          .insert([
            {
              user_id: session.user.id,
              policy_text: policyText,
              mode: mode,
              result_json: {
                ...data.data,
                checklist_state: {},
              },
            },
          ])
          .select()
          .single();

        if (inserted) {
          setResult({
            ...inserted.result_json,
            __workflowId: inserted.id,
          });
        }

        fetchHistory(session.user.id);
      }
    } catch (err: any) {
      setError(
        err.message || "An unexpected error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefiningType(null);
    }
  };

  const handleChecklistUpdate = async (
    title: string,
    updatedChecklist: any,
  ) => {
    const updatedResult = {
      ...result,
      checklist_state: {
        ...result.checklist_state,
        [title]: updatedChecklist,
      },
    };
    setResult(updatedResult);
    if (result.__workflowId) {
      await supabase
        .from("workflows")
        .update({ result_json: updatedResult })
        .eq("id", result.__workflowId);
    }
  };

  const filteredHistory = history.filter((item) =>
    (item.result_json.summary || "Workflow")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 ${inter.className} flex overflow-hidden`}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `.hide-scrollbar::-webkit-scrollbar { display: none; }`,
        }}
      />

      {showSidebar && session && (
        <div
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-40 lg:hidden cursor-pointer animate-in fade-in duration-200"
        />
      )}

      <aside
        className={`fixed lg:relative z-50 h-screen bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl lg:shadow-none shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          showSidebar && session
            ? "w-80 translate-x-0 border-r"
            : "w-0 -translate-x-full lg:translate-x-0 border-none"
        }`}
      >
        <div className="w-80 flex flex-col h-full">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" /> History
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPolicyText("");
                    setResult(null);
                    if (window.innerWidth < 1024) setShowSidebar(false);
                  }}
                  className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                  title="New Analysis"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSidebar(false)}
                  className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl lg:hidden"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar bg-zinc-50/30 dark:bg-zinc-950/30">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 opacity-40">
                <History className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium">No records</p>
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isActive = result?.__workflowId === item.id;
                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => loadHistoryItem(item)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] hover:-translate-y-0.5 ${
                        isActive
                          ? "bg-teal-50/80 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 shadow-teal-500/5"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md"
                      }`}
                    >
                      <div className="pr-8">
                        <div
                          className={`text-sm font-semibold line-clamp-2 leading-snug ${isActive ? "text-teal-700 dark:text-teal-400" : "text-zinc-900 dark:text-zinc-100"}`}
                        >
                          {item.result_json.summary || "Untitled Analysis"}
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 uppercase tracking-wider opacity-80 font-bold ${isActive ? "bg-teal-100/50 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400" : ""}`}
                          >
                            {item.mode}
                          </Badge>
                          <span className="text-xs text-zinc-500 font-medium">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => deleteHistoryItem(e, item.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            <div className="flex items-center gap-3 p-3 mb-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {session?.user?.email}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">
                  Standard Account
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer rounded-xl h-12 font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <div className="flex items-center gap-3">
              {session && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="shrink-0 cursor-pointer hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 transition-all active:scale-90"
                >
                  {showSidebar ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                  <Layers className="w-6 h-6 text-teal-600 dark:text-teal-500" />
                  Nityam
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Transform policy text into structured workflows.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("officer")}
                  className={`gap-2 flex-1 sm:flex-none cursor-pointer ${mode === "officer" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-600 dark:text-zinc-400"}`}
                >
                  <ShieldAlert className="w-4 h-4" /> Officer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("citizen")}
                  className={`gap-2 flex-1 sm:flex-none cursor-pointer ${mode === "citizen" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-600 dark:text-zinc-400"}`}
                >
                  <User className="w-4 h-4" /> Citizen
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
                className="shrink-0 cursor-pointer dark:border-zinc-800"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>
              {!session && (
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => router.push("/login")}
                  className="shrink-0 cursor-pointer bg-zinc-900 dark:bg-zinc-100"
                >
                  <LogIn className="w-4 h-4" />
                </Button>
              )}
            </div>
          </header>

          {error && (
            <div className="p-4 text-sm text-rose-800 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" /> <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-6">
              <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[500px] lg:h-[calc(100vh-12rem)]">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 py-4">
                  <CardTitle className="text-sm font-semibold dark:text-zinc-200 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-teal-600 dark:text-teal-500" />
                    Source Document
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4 flex-1 flex flex-col overflow-hidden">
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadingFile || loading}
                    className="w-full cursor-pointer bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  >
                    {isReadingFile ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Document
                  </Button>
                  <Textarea
                    placeholder="Paste legal text, SOPs, or upload a document..."
                    value={policyText}
                    onChange={(e) => setPolicyText(e.target.value)}
                    className="flex-1 resize-none focus-visible:ring-teal-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-200 text-sm"
                  />
                  <Button
                    onClick={() => generate()}
                    disabled={loading || policyText.length < 20}
                    className="w-full cursor-pointer bg-teal-600 hover:bg-teal-700 text-white h-12 text-base shadow-lg shadow-teal-500/20"
                  >
                    {loading && !refiningType ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" /> Generate Workflow
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                {loading && !result ? (
                  <LoadingView key="loading" />
                ) : result ? (
                  <ResultView
                    key="result"
                    result={result}
                    mode={mode}
                    onRefine={generate}
                    onExport={() => exportPDF(result, mode)}
                    isLoading={loading}
                    refiningType={refiningType}
                    onChecklistUpdate={handleChecklistUpdate}
                  />
                ) : (
                  <EmptyStateView key="empty" />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultView({
  result,
  mode,
  onRefine,
  onExport,
  isLoading,
  refiningType,
  onChecklistUpdate,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`space-y-6 transition-opacity duration-300 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
    >
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-2 hidden sm:block">
          Actions
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRefine("Make highly detailed.", "elaborate")}
          className="cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 flex-1 sm:flex-none"
        >
          {refiningType === "elaborate" ? (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          ) : (
            <FileSearch className="w-3.5 h-3.5 mr-2" />
          )}
          Elaborate
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRefine("Simplify language.", "simplify")}
          className="cursor-pointer dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 flex-1 sm:flex-none"
        >
          {refiningType === "simplify" ? (
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
          ) : (
            <ListChecks className="w-3.5 h-3.5 mr-2" />
          )}
          Simplify
        </Button>
        <div className="hidden sm:block flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="cursor-pointer dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 w-full sm:w-auto mt-2 sm:mt-0"
        >
          <Download className="w-3.5 h-3.5 mr-2" /> Export PDF
        </Button>
      </div>

      <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="pb-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
            <FormatText text={result.summary} />
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="pb-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Risk Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Threat Level
              </span>
              <Badge
                variant="outline"
                className={`px-2.5 py-0.5 rounded-md ${getRiskColor(result.risk_level)}`}
              >
                {result.risk_level}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Complexity
                </span>
                <span className="text-zinc-500 font-mono">
                  {result.complexity_score}/10
                </span>
              </div>
              <Progress
                value={(result.complexity_score || 0) * 10}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {mode === "officer" && result.metrics && (
          <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="pb-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Quantitative Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricBox
                  icon={<Clock />}
                  label="Est. Time"
                  value={result.metrics.estimated_processing_time}
                />
                <MetricBox
                  icon={<Users />}
                  label="Manpower"
                  value={result.metrics.manpower_level}
                />
                <MetricBox
                  icon={<Activity />}
                  label="Dept Load"
                  value={result.metrics.department_load}
                />
                <MetricBox
                  icon={<Percent />}
                  label="Risk Exp"
                  value={`${result.metrics.risk_exposure_percent}%`}
                  isDanger={result.metrics.risk_exposure_percent > 60}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {mode === "officer" ? (
        <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
          <Tabs defaultValue="workflow" className="w-full">
            <CardHeader className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <TabsList className="bg-zinc-100 dark:bg-zinc-800/60 p-1 flex rounded-xl gap-1 overflow-x-auto hide-scrollbar border border-zinc-200 dark:border-zinc-800 shadow-inner w-full justify-start">
                <TabItem
                  value="workflow"
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                >
                  Workflow
                </TabItem>
                <TabItem
                  value="checklist"
                  icon={<CheckSquare className="w-3.5 h-3.5 text-emerald-500" />}
                >
                  Checklists
                </TabItem>
                <TabItem
                  value="slas"
                  icon={<Clock className="w-3.5 h-3.5 text-blue-500" />}
                >
                  SLAs
                </TabItem>
                <TabItem
                  value="decision_points"
                  icon={<GitCommit className="w-3.5 h-3.5 text-indigo-500" />}
                >
                  Decisions
                </TabItem>
                <TabItem
                  value="risks"
                  icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                >
                  Risks
                </TabItem>
                <TabItem
                  value="ambiguities"
                  icon={<FileSearch className="w-3.5 h-3.5 text-amber-500" />}
                >
                  Ambiguities
                </TabItem>
                <TabItem
                  value="gaps"
                  icon={<ShieldAlert className="w-3.5 h-3.5 text-orange-500" />}
                >
                  Gaps
                </TabItem>
              </TabsList>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <TabsContent value="workflow" className="m-0 p-4 sm:p-0">
                <Timeline items={result.workflow} traceable={true} />
              </TabsContent>
              <TabsContent value="checklist" className="m-0 p-4 sm:p-0">
                <div className="space-y-6">
                  <InteractiveChecklist
                    items={result.documents_required}
                    title="Required Documents"
                    result={result}
                    onChecklistUpdate={onChecklistUpdate}
                  />
                  <InteractiveChecklist
                    items={result.checklist}
                    title="Verification Actions"
                    result={result}
                    onChecklistUpdate={onChecklistUpdate}
                  />
                </div>
              </TabsContent>
              <TabsContent value="slas" className="m-0 p-4 sm:p-0">
                <SlaTimeline items={result.slas} />
              </TabsContent>
              <TabsContent value="decision_points" className="m-0 p-4 sm:p-0">
                <List
                  items={result.decision_points}
                  icon={<GitCommit className="w-4 h-4 text-teal-600" />}
                />
              </TabsContent>
              <TabsContent value="risks" className="m-0 p-4 sm:p-0">
                <List
                  items={result.risks}
                  icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
                  containerClass="bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30"
                />
              </TabsContent>
              <TabsContent value="ambiguities" className="m-0 p-4 sm:p-0">
                {result.ambiguities?.length ? (
                  <ul className="space-y-3">
                    {result.ambiguities.map((item: any, i: number) => (
                      <li
                        key={i}
                        className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30"
                      >
                        <div className="font-semibold text-sm text-amber-900 dark:text-amber-400 mb-1 flex items-center gap-2">
                          <FileSearch className="w-4 h-4" /> Term: "{item.term}"
                        </div>
                        <div className="text-sm text-amber-800 dark:text-amber-500 leading-relaxed">
                          Issue: {item.issue}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">
                    No ambiguities detected.
                  </p>
                )}
              </TabsContent>
              <TabsContent value="gaps" className="m-0 p-4 sm:p-0">
                <List
                  items={result.compliance_gaps}
                  icon={<ShieldAlert className="w-4 h-4 text-orange-500" />}
                  containerClass="bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      ) : (
        <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-base dark:text-zinc-200 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-teal-600" /> Step-by-Step
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-8">
            {result.documents_required?.length > 0 && (
              <InteractiveChecklist
                items={result.documents_required}
                title="What You Need to Gather"
                result={result}
                onChecklistUpdate={onChecklistUpdate}
              />
            )}
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                What You Need to Do
              </h4>
              <Timeline items={result.instructions} traceable={false} />
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}