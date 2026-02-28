"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  GitCommit,
  FileSearch,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsTrigger } from "@/components/ui/tabs";

export const FormatText = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <>
      {text.split("\n").map((line, lIdx) => (
        <span key={lIdx} className="block mb-1 last:mb-0">
          {line.split(/(\*\*.*?\*\*)/g).map((part, i) =>
            part.startsWith("**") ? (
              <strong
                key={i}
                className="font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
};

export const getRiskColor = (level: string) => {
  switch (level?.toLowerCase()) {
    case "low":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "high":
      return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
};

export const InteractiveChecklist = ({
  items,
  title,
  result,
  onChecklistUpdate,
}: any) => {
  if (!items?.length) return null;
  const checklistState = result?.checklist_state?.[title || "default"] || {};

  const toggleCheck = (idx: number) => {
    const updatedChecklist = { ...checklistState, [idx]: !checklistState[idx] };
    onChecklistUpdate(title || "default", updatedChecklist);
  };

  return (
    <div className="space-y-3">
      {title && (
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {title}
        </h4>
      )}
      {items.map((item: string, idx: number) => {
        const isChecked = checklistState[idx];
        return (
          <div
            key={idx}
            onClick={() => toggleCheck(idx)}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isChecked ? "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 opacity-60" : "bg-white border-zinc-200 hover:border-teal-300 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-teal-800"}`}
          >
            <div
              className={`mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded border ${isChecked ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-zinc-300 dark:bg-zinc-900 dark:border-zinc-600"}`}
            >
              {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <span
              className={`text-sm leading-relaxed ${isChecked ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-700 dark:text-zinc-300"}`}
            >
              <FormatText text={item} />
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const MetricBox = ({ icon, label, value, isDanger }: any) => (
  <div className="bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center">
    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 mb-1.5 [&>svg]:w-3.5 [&>svg]:h-3.5">
      {icon}{" "}
      <span className="text-[10px] uppercase font-bold tracking-wider">
        {label}
      </span>
    </div>
    <span
      className={`text-sm font-semibold ${isDanger ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"}`}
    >
      {value}
    </span>
  </div>
);

export const TabItem = ({ value, children, icon }: any) => (
  <TabsTrigger
    value={value}
    className="flex-1 min-w-fit px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-teal-700 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-sm text-zinc-600 dark:text-zinc-400 rounded-lg cursor-pointer font-medium whitespace-nowrap transition-all text-sm flex items-center gap-1.5 justify-center hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
  >
    {icon} {children}
  </TabsTrigger>
);

export const List = ({
  items,
  icon = <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  containerClass = "",
}: any) =>
  !items?.length ? (
    <p className="text-sm text-zinc-500">No data available.</p>
  ) : (
    <ul className="space-y-3">
      {items.map((item: string, i: number) => (
        <li
          key={i}
          className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border ${containerClass || "bg-zinc-50 dark:bg-zinc-950/50 border-zinc-100 dark:border-zinc-800/50"}`}
        >
          <div className="mt-0.5 shrink-0 bg-white dark:bg-zinc-900 p-1 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-800">
            {icon}
          </div>
          <span className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <FormatText text={item} />
          </span>
        </li>
      ))}
    </ul>
  );

export const SlaTimeline = ({ items }: any) =>
  !items?.length ? (
    <p className="text-sm text-zinc-500">No SLAs detected.</p>
  ) : (
    <div className="space-y-4">
      {items.map((item: any, i: number) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl"
        >
          <div className="flex-shrink-0 w-24 text-right">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
              {item.timeframe}
            </span>
          </div>
          <div className="w-px h-8 bg-blue-200 dark:bg-blue-800/50" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <FormatText text={item.action} />
            </p>
          </div>
        </div>
      ))}
    </div>
  );

export const Timeline = ({ items, traceable = false }: any) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  if (!items?.length)
    return <p className="text-sm text-zinc-500">No steps available.</p>;
  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
      {items.map((item: any, i: number) => {
        const stepText = traceable ? item.step : item;
        const clause = traceable ? item.clause : null;
        const clauseText = traceable ? item.clause_text : null;
        const isExpanded = expandedIdx === i;
        return (
          <div
            key={i}
            className="relative flex flex-col md:flex-row items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 font-bold text-xs shadow-sm md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 shrink-0">
              {i + 1}
            </div>
            <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)] p-4 sm:p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm transition-all">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <FormatText text={stepText} />
              </p>
              {traceable && clause && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex flex-col items-end gap-2">
                  <Badge
                    variant="secondary"
                    onClick={() =>
                      clauseText && setExpandedIdx(isExpanded ? null : i)
                    }
                    className={`cursor-pointer font-mono text-[10px] uppercase tracking-wider px-2 py-1.5 rounded-md text-left h-auto break-words max-w-full transition-colors ${isExpanded ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400" : ""}`}
                  >
                    Source: {clause}
                  </Badge>
                  <AnimatePresence>
                    {isExpanded && clauseText && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full overflow-hidden"
                      >
                        <div className="p-3 mt-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed text-left">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-200 block mb-1">
                            Clause {clause}
                          </span>
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

export const LoadingView = () => (
  <div className="space-y-6 animate-pulse">
    <Skeleton className="h-14 w-full rounded-xl dark:bg-zinc-900" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-32 rounded-xl dark:bg-zinc-900" />
      <Skeleton className="h-32 rounded-xl dark:bg-zinc-900" />
    </div>
    <Skeleton className="h-96 w-full rounded-xl dark:bg-zinc-900" />
  </div>
);

export const EmptyStateView = () => (
  <div className="h-[400px] lg:h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 p-6 text-center shadow-sm">
    <Layers className="w-16 h-16 mb-4 text-zinc-300 dark:text-zinc-700" />
    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-200">
      Awaiting Policy Document
    </h3>
    <p className="text-sm mt-2 max-w-sm text-zinc-500 dark:text-zinc-400">
      Paste your text on the left or upload a document to generate a workflow.
    </p>
  </div>
);