"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Inter } from "next/font/google";
import mammoth from "mammoth";
import { supabase } from "@/utils/supabase";
import { 
  FileText, ShieldAlert, User, Download, AlertTriangle, 
  CheckCircle2, GitCommit, Loader2, Moon, Sun, Clock, Users, 
  Activity, Percent, Upload, ListChecks, Wand2, FileSearch, AlignLeft, Layers, CheckSquare, History, LogOut, LogIn
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const inter = Inter({ subsets: ["latin"] });

const FormatText = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <>
      {text.split('\n').map((line, lIdx) => (
        <span key={lIdx} className="block mb-1 last:mb-0">
          {line.split(/(\*\*.*?\*\*)/g).map((part, i) => 
            part.startsWith("**") ? <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
          )}
        </span>
      ))}
    </>
  );
};

const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case "low": return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    case "medium": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "high": return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
    default: return "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
};

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  const [policyText, setPolicyText] = useState("");
  const [mode, setMode] = useState<"officer" | "citizen">("officer");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refiningType, setRefiningType] = useState<"elaborate" | "simplify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchHistory(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchHistory(session.user.id);
      else setHistory([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (!error && data) setHistory(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setResult(null);
    setPolicyText("");
  };

  const loadHistoryItem = (item: any) => {
    setPolicyText(item.policy_text);
    setMode(item.mode);
    setResult(item.result_json);
    setShowSidebar(false);
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
          extractedText += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setPolicyText(extractedText);
      } else if (file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setPolicyText(result.value);
      } else {
        setError("Unsupported file format. Please upload .txt, .pdf, or .docx files.");
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
        await supabase.from('workflows').insert([{
          user_id: session.user.id,
          policy_text: policyText,
          mode: mode,
          result_json: data.data
        }]);
        fetchHistory(session.user.id);
      }

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      setRefiningType(null);
    }
  };

  const exportPDF = () => {
    if (!result) return;
    
    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [13, 148, 136];
    
    doc.setFontSize(22);
    doc.setTextColor(24, 24, 27); 
    doc.text("Nityam Policy Analysis", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | View: ${mode.toUpperCase()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Executive Summary']],
      body: [[result.summary.replace(/\*\*/g, "")]],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontSize: 12 },
      styles: { fontSize: 10, cellPadding: 5, textColor: [39, 39, 42] }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Risk Level', 'Complexity Score']],
      body: [[result.risk_level?.toUpperCase() || 'N/A', `${result.complexity_score || 0} / 10`]],
      theme: 'grid',
      headStyles: { fillColor: [82, 82, 91] },
      styles: { fontStyle: 'bold', halign: 'center' }
    });

    if (mode === "officer" && result.metrics) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Est. Processing Time', 'Manpower Requirement', 'Department Load', 'Risk Exposure']],
        body: [[
          result.metrics.estimated_processing_time, 
          result.metrics.manpower_level, 
          result.metrics.department_load, 
          `${result.metrics.risk_exposure_percent}%`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [82, 82, 91] },
        styles: { halign: 'center' }
      });
    }

    const items = mode === "officer" ? result.workflow : result.instructions;
    if (items && items.length > 0) {
      const wHead = mode === "officer" ? [['#', 'Action Step', 'Source Clause']] : [['#', 'Instruction Step']];
      const wBody = items.map((item: any, idx: number) => {
        if (mode === "officer") {
          return [(idx + 1).toString(), item.step.replace(/\*\*/g, ""), item.clause || "N/A"];
        }
        const text = typeof item === 'string' ? item : item.step;
        return [(idx + 1).toString(), text.replace(/\*\*/g, "")];
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: wHead,
        body: wBody,
        theme: 'striped',
        headStyles: { fillColor: primaryColor },
        columnStyles: { 
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 35, textColor: [113, 113, 122], fontSize: 9 }
        }
      });
    }

    if (mode === "officer") {
      const drawListTable = (title: string, data: any[], color: [number, number, number]) => {
        if (!data || data.length === 0) return;
        let body: any[] = [];
        if (typeof data[0] === 'string') {
          body = data.map(str => [str.replace(/\*\*/g, "")]);
        } else if (title === 'Ambiguities') {
          body = data.map(item => [`Term: "${item.term}"\nIssue: ${item.issue}`]);
        }
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [[title]],
          body: body,
          theme: 'grid',
          headStyles: { fillColor: color }
        });
      };

      if (result.slas && result.slas.length > 0) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 10,
          head: [['Timeframe', 'SLA Action Required']],
          body: result.slas.map((sla: any) => [sla.timeframe, sla.action.replace(/\*\*/g, "")]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } }
        });
      }

      drawListTable("Decision Points", result.decision_points, [99, 102, 241]);
      drawListTable("Identified Risks", result.risks, [244, 63, 94]);
      drawListTable("Ambiguities", result.ambiguities, [245, 158, 11]);
      drawListTable("Compliance Gaps", result.compliance_gaps, [249, 115, 22]);
    }

    doc.save("Nityam-Policy-Report.pdf");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-zinc-50 dark:bg-zinc-950 ${inter.className} flex`}>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <AnimatePresence>
        {showSidebar && session && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }} 
            animate={{ width: 300, opacity: 1 }} 
            exit={{ width: 0, opacity: 0 }} 
            className="hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 h-screen sticky top-0 overflow-y-auto"
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-950 z-10">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><History className="w-4 h-4" /> History</h2>
            </div>
            <div className="flex-1 p-3 space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No recent workflows.</p>
              ) : (
                history.map((item) => (
                  <button 
                    key={item.id} 
                    onClick={() => loadHistoryItem(item)}
                    className="w-full text-left p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-all group"
                  >
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                      {item.result_json.summary || "Workflow"}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 flex justify-between">
                      <span className="uppercase">{item.mode}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex items-center gap-3 flex-1">
            {session && (
              <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)} className="hidden md:flex cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0">
                <History className="w-5 h-5" />
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
              <Button variant="ghost" size="sm" onClick={() => setMode("officer")} className={`gap-2 flex-1 sm:flex-none cursor-pointer ${mode === "officer" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm hover:bg-white dark:hover:bg-zinc-800" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"}`}>
                <ShieldAlert className="w-4 h-4" /> Officer
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode("citizen")} className={`gap-2 flex-1 sm:flex-none cursor-pointer ${mode === "citizen" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm hover:bg-white dark:hover:bg-zinc-800" : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"}`}>
                <User className="w-4 h-4" /> Citizen
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={() => setTheme(t => t === "light" ? "dark" : "light")} className="shrink-0 cursor-pointer hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            {session ? (
              <Button variant="outline" size="icon" onClick={handleLogout} title="Log Out" className="shrink-0 cursor-pointer text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30">
                <LogOut className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="default" size="icon" onClick={() => router.push('/login')} title="Log In" className="shrink-0 cursor-pointer bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
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
            <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 flex flex-col h-[500px] lg:h-[calc(100vh-8rem)]">
              <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 py-4">
                <CardTitle className="text-sm font-semibold dark:text-zinc-200 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-teal-600 dark:text-teal-500" /> Source Document
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 flex-1 flex flex-col">
                <input type="file" accept=".txt,.pdf,.docx" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isReadingFile || loading} className="w-full cursor-pointer bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  {isReadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Upload Document
                </Button>
                <Textarea placeholder="Paste legal text, SOPs, or upload a document..." value={policyText} onChange={(e) => setPolicyText(e.target.value)} className="flex-1 resize-none focus-visible:ring-teal-600 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-200" />
                <Button onClick={() => generate()} disabled={loading || policyText.length < 20} className="w-full cursor-pointer bg-teal-600 hover:bg-teal-700 text-white transition-colors h-12 text-base">
                  {loading && !refiningType ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...</> : <><Wand2 className="w-4 h-4 mr-2" /> Generate Workflow</>}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {loading && !result ? (
                <LoadingView key="loading" />
              ) : result ? (
                <ResultView key="result" result={result} mode={mode} onRefine={generate} onExport={exportPDF} isLoading={loading} refiningType={refiningType} />
              ) : (
                <EmptyStateView key="empty" />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultView({ result, mode, onRefine, onExport, isLoading, refiningType }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`space-y-6 transition-opacity duration-300 ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
      
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-2 hidden sm:block">Actions</span>
        <Button variant="secondary" size="sm" onClick={() => onRefine("Make highly detailed.", "elaborate")} className="cursor-pointer hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 flex-1 sm:flex-none">
          {refiningType === "elaborate" ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <FileSearch className="w-3.5 h-3.5 mr-2" />} Elaborate
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onRefine("Simplify language.", "simplify")} className="cursor-pointer hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 flex-1 sm:flex-none">
          {refiningType === "simplify" ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <ListChecks className="w-3.5 h-3.5 mr-2" />} Simplify
        </Button>
        <div className="hidden sm:block flex-1" />
        <Button variant="outline" size="sm" onClick={onExport} className="cursor-pointer hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 w-full sm:w-auto mt-2 sm:mt-0">
          <Download className="w-3.5 h-3.5 mr-2" /> Export PDF
        </Button>
      </div>

      <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
        <CardHeader className="pb-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm"><FormatText text={result.summary} /></p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="pb-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Risk Profile</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Threat Level</span>
              <Badge variant="outline" className={`px-2.5 py-0.5 rounded-md ${getRiskColor(result.risk_level)}`}>{result.risk_level}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="font-medium text-zinc-700 dark:text-zinc-300">Complexity</span><span className="text-zinc-500 font-mono">{result.complexity_score}/10</span></div>
              <Progress value={(result.complexity_score || 0) * 10} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {mode === "officer" && result.metrics && (
          <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="pb-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quantitative Insights</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricBox icon={<Clock />} label="Est. Time" value={result.metrics.estimated_processing_time} />
                <MetricBox icon={<Users />} label="Manpower" value={result.metrics.manpower_level} />
                <MetricBox icon={<Activity />} label="Dept Load" value={result.metrics.department_load} />
                <MetricBox icon={<Percent />} label="Risk Exp" value={`${result.metrics.risk_exposure_percent}%`} isDanger={result.metrics.risk_exposure_percent > 60} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {mode === "officer" ? (
        <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          <Tabs defaultValue="workflow" className="w-full">
            <CardHeader className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <TabsList className="bg-zinc-100 dark:bg-zinc-800/60 p-1 flex rounded-xl gap-1 overflow-x-auto hide-scrollbar border border-zinc-200 dark:border-zinc-800/50 shadow-inner w-full justify-start">
                <TabItem value="workflow" icon={<CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}>Workflow</TabItem>
                <TabItem value="checklist" icon={<CheckSquare className="w-3.5 h-3.5 text-emerald-500" />}>Checklists</TabItem>
                <TabItem value="slas" icon={<Clock className="w-3.5 h-3.5 text-blue-500" />}>SLAs</TabItem>
                <TabItem value="decision_points" icon={<GitCommit className="w-3.5 h-3.5 text-indigo-500" />}>Decisions</TabItem>
                <TabItem value="risks" icon={<AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}>Risks</TabItem>
                <TabItem value="ambiguities" icon={<FileSearch className="w-3.5 h-3.5 text-amber-500" />}>Ambiguities</TabItem>
                <TabItem value="gaps" icon={<ShieldAlert className="w-3.5 h-3.5 text-orange-500" />}>Gaps</TabItem>
              </TabsList>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <TabsContent value="workflow" className="m-0 p-4 sm:p-0"><Timeline items={result.workflow} traceable={true} /></TabsContent>
              <TabsContent value="checklist" className="m-0 p-4 sm:p-0">
                <div className="space-y-6">
                  <InteractiveChecklist items={result.documents_required} title="Required Documents" />
                  <InteractiveChecklist items={result.checklist} title="Verification Actions" />
                </div>
              </TabsContent>
              <TabsContent value="slas" className="m-0 p-4 sm:p-0"><SlaTimeline items={result.slas} /></TabsContent>
              <TabsContent value="decision_points" className="m-0 p-4 sm:p-0"><List items={result.decision_points} icon={<GitCommit className="w-4 h-4 text-teal-600" />} /></TabsContent>
              <TabsContent value="risks" className="m-0 p-4 sm:p-0"><List items={result.risks} icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} containerClass="bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30" /></TabsContent>
              <TabsContent value="ambiguities" className="m-0 p-4 sm:p-0">
                {result.ambiguities?.length ? (
                  <ul className="space-y-3">
                    {result.ambiguities.map((item: any, i: number) => (
                      <li key={i} className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <div className="font-semibold text-sm text-amber-900 dark:text-amber-400 mb-1 flex items-center gap-2"><FileSearch className="w-4 h-4" /> Term: "{item.term}"</div>
                        <div className="text-sm text-amber-800 dark:text-amber-500 leading-relaxed">Issue: {item.issue}</div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-zinc-500">No ambiguities detected.</p>}
              </TabsContent>
              <TabsContent value="gaps" className="m-0 p-4 sm:p-0"><List items={result.compliance_gaps} icon={<ShieldAlert className="w-4 h-4 text-orange-500" />} containerClass="bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30" /></TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      ) : (
        <Card className="shadow-sm border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-base dark:text-zinc-200 flex items-center gap-2"><ListChecks className="w-5 h-5 text-teal-600" /> Step-by-Step Instructions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-8">
            {result.documents_required && result.documents_required.length > 0 && (
              <div>
                 <InteractiveChecklist items={result.documents_required} title="What You Need to Gather" />
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">What You Need to Do</h4>
              <Timeline items={result.instructions} traceable={false} />
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

const InteractiveChecklist = ({ items, title }: { items: string[], title?: string }) => {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!items?.length) return null;

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">{title}</h4>}
      {items.map((item, idx) => (
        <div 
          key={idx} 
          onClick={() => toggleCheck(idx)}
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked[idx] ? 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 opacity-60' : 'bg-white border-zinc-200 hover:border-teal-300 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-teal-800'}`}
        >
          <div className={`mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded border ${checked[idx] ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-zinc-300 dark:bg-zinc-900 dark:border-zinc-600'}`}>
            {checked[idx] && <CheckCircle2 className="w-3.5 h-3.5" />}
          </div>
          <span className={`text-sm leading-relaxed ${checked[idx] ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-700 dark:text-zinc-300'}`}>
            <FormatText text={item} />
          </span>
        </div>
      ))}
    </div>
  );
};

const MetricBox = ({ icon, label, value, isDanger }: any) => (
  <div className="bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 flex flex-col justify-center">
    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1.5 [&>svg]:w-3.5 [&>svg]:h-3.5">
      {icon} <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
    </div>
    <span className={`text-sm font-semibold ${isDanger ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"}`}>{value}</span>
  </div>
);

const TabItem = ({ value, children, icon }: any) => (
  <TabsTrigger value={value} className="flex-1 min-w-fit px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-sm text-zinc-600 dark:text-zinc-400 rounded-lg cursor-pointer font-medium whitespace-nowrap transition-all text-sm flex items-center gap-1.5 justify-center hover:bg-zinc-200/50 dark:hover:bg-zinc-800">
    {icon} {children}
  </TabsTrigger>
);

const List = ({ items, icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />, containerClass = "" }: any) => (
  !items?.length ? <p className="text-sm text-zinc-500">No data available.</p> :
  <ul className="space-y-3">
    {items.map((item: string, i: number) => (
      <li key={i} className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border ${containerClass || 'bg-zinc-50 dark:bg-zinc-950/50 border-zinc-100 dark:border-zinc-800/50'}`}>
        <div className="mt-0.5 shrink-0 bg-white dark:bg-zinc-900 p-1 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-800">{icon}</div>
        <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"><FormatText text={item} /></span>
      </li>
    ))}
  </ul>
);

const SlaTimeline = ({ items }: { items: any[] }) => {
  if (!items?.length) return <p className="text-sm text-zinc-500">No SLAs or deadlines detected.</p>;
  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
          <div className="flex-shrink-0 w-24 text-right">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{item.timeframe}</span>
          </div>
          <div className="w-px h-8 bg-blue-200 dark:bg-blue-800/50"></div>
          <div className="flex-1">
            <p className="text-sm text-blue-900 dark:text-blue-300"><FormatText text={item.action} /></p>
          </div>
        </div>
      ))}
    </div>
  );
};

const Timeline = ({ items, traceable = false }: { items: any[], traceable?: boolean }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!items?.length) return <p className="text-sm text-zinc-500">No steps available.</p>;

  return (
    <div className="relative space-y-6 sm:space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
      {items.map((item, i) => {
        const stepText = traceable ? item.step : item;
        const clause = traceable ? item.clause : null;
        const clauseText = traceable ? item.clause_text : null;
        const isExpanded = expandedIdx === i;

        return (
          <div key={i} className="relative flex flex-col md:flex-row items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 font-bold text-xs shadow-sm md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shrink-0">{i + 1}</div>
            <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm transition-all">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"><FormatText text={stepText} /></p>
              
              {traceable && clause && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col items-end gap-2">
                  <Badge 
                    variant="secondary" 
                    onClick={() => clauseText && setExpandedIdx(isExpanded ? null : i)}
                    className={`cursor-pointer bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-mono text-[10px] uppercase tracking-wider flex items-start gap-1.5 px-2 py-1.5 rounded-md whitespace-normal text-left h-auto break-words max-w-full transition-colors ${isExpanded ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50' : ''}`}
                  >
                    <FileText className="w-3 h-3 mt-0.5 shrink-0" /> 
                    <span className="break-words">Source: {clause}</span>
                  </Badge>
                  
                  <AnimatePresence>
                    {isExpanded && clauseText && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full overflow-hidden"
                      >
                        <div className="p-3 mt-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed text-left">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-200 block mb-1 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Clause {clause}</span>
                          <FormatText text={clauseText} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LoadingView = () => (
  <div className="space-y-6 animate-pulse">
    <Skeleton className="h-14 w-full rounded-xl dark:bg-zinc-900" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-32 rounded-xl dark:bg-zinc-900" />
      <Skeleton className="h-32 rounded-xl dark:bg-zinc-900" />
    </div>
    <Skeleton className="h-96 w-full rounded-xl dark:bg-zinc-900" />
  </div>
);

const EmptyStateView = () => (
  <div className="h-[400px] lg:h-[calc(100vh-8rem)] min-h-[500px] flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 p-6 text-center shadow-sm">
    <Layers className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700" />
    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">Awaiting Policy Document</h3>
    <p className="text-sm mt-2 max-w-sm text-zinc-500 dark:text-zinc-400">Paste your text on the left or upload a document to generate a workflow.</p>
  </div>
);