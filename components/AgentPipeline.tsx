"use client";
import { useState } from "react";
import type { AgentLogEntry, PipelineStatus } from "@/types";

interface Props {
  status: PipelineStatus;
  agentLog: AgentLogEntry[];
}

export function AgentPipeline({ status, agentLog }: Props) {
  const [activeReasoning, setActiveReasoning] = useState<AgentLogEntry | null>(null);

  const getStageStatus = (stage: string) => {
    if (status === stage) return "running";
    if (stage === "stage1" && (status === "stage2" || status === "stage3" || status === "done")) return "complete";
    if (stage === "stage2" && (status === "stage3" || status === "done")) return "complete";
    if (stage === "stage3" && status === "done") return "complete";
    return "pending";
  };

  const getAgentsForStage = (stage: string) =>
    agentLog.filter((l) => l.stage === stage);

  const StageIndicator = ({ stageName, label, colorClass, statusType }: { stageName: string, label: string, colorClass: string, statusType: "pending" | "running" | "complete" }) => {
    const agents = getAgentsForStage(stageName);

    const isComplete = statusType === "complete";
    const isRunning = statusType === "running";
    
    // Light theme colors
    const stateStyles = {
      complete: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm",
      running: `border-${colorClass}-300 bg-${colorClass}-50 text-${colorClass}-800 shadow-sm animate-pulse-slow`,
      pending: "border-slate-200 bg-white text-slate-400 opacity-60",
    }[statusType];

    return (
      <div className={`flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-500 ${stateStyles}`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm tracking-wide">{label}</span>
          {isComplete && (
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
          {isRunning && (
            <div className={`w-4 h-4 rounded-full border-2 border-${colorClass}-300 border-t-${colorClass}-600 animate-spin`} />
          )}
        </div>

        {/* Agent Pills */}
        <div className="flex flex-wrap gap-2 mt-1">
          {agents.map((agent, i) => (
            <div
              key={i}
              onClick={() => agent.thinkingContent && setActiveReasoning(agent)}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-all
                ${agent.thinkingContent ? 'cursor-pointer hover:ring-2 ring-orange-200' : ''}
                ${agent.status === "complete" 
                  ? "bg-white border-emerald-200 text-emerald-700 shadow-sm" 
                  : agent.status === "retrying"
                    ? "bg-amber-50 border-amber-300 text-amber-800 shadow-sm"
                    : agent.status === "running"
                    ? `bg-white border-${colorClass}-200 text-${colorClass}-700 shadow-sm shadow-${colorClass}-500/10`
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }
              `}
            >
              {agent.status === "running" && <span className={`w-1.5 h-1.5 rounded-full bg-${colorClass}-500 animate-ping absolute`} />}
              {agent.status === "running" && <span className={`w-1.5 h-1.5 rounded-full bg-${colorClass}-500 relative`} />}
              {agent.status === "retrying" && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse relative" />
              )}
              {agent.status === "complete" && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
              {agent.agent.replace("section:", "")}
              {agent.status === "retrying" && agent.retryDelayMs != null && (
                <span className="opacity-80 ml-1 text-[10px] text-amber-700">
                  retry ~{Math.ceil(agent.retryDelayMs / 1000)}s
                </span>
              )}
              {agent.durationMs && <span className="opacity-60 ml-1 text-[10px]">{((agent.durationMs)/1000).toFixed(1)}s</span>}
            </div>
          ))}
          
          {agents.length === 0 && statusType === "pending" && (
            <div className="text-xs px-2.5 py-1 rounded-md border border-slate-200 border-dashed text-slate-400">
              Awaiting payload...
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
          Multi-Agent Pipeline
        </h2>
        
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200 shadow-sm outline outline-2 outline-orange-500/10 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          {status === "stage1" ? "Phase 1: Analysis" : status === "stage2" ? "Phase 2: Synthesis" : "Phase 3: Formatting"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StageIndicator
          stageName="stage1"
          label="1. Parallel Analysis"
          colorClass="orange"
          statusType={getStageStatus("stage1")}
        />
        <StageIndicator
          stageName="stage2"
          label="2. Strategic Synthesis"
          colorClass="blue"
          statusType={getStageStatus("stage2")}
        />
        <StageIndicator
          stageName="stage3"
          label="3. Section Writing"
          colorClass="indigo"
          statusType={getStageStatus("stage3")}
        />
      </div>

      {activeReasoning && activeReasoning.thinkingContent && (
        <div className="mt-8 p-5 bg-slate-50 border border-slate-200 rounded-xl relative shadow-inner animate-fade-in-up">
          <button 
            onClick={() => setActiveReasoning(null)} 
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 bg-white rounded-md border border-slate-200 shadow-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span className="text-orange-600">{activeReasoning.agent.replace("section:", "")}</span> Reasoning Process
          </div>
          <div className="text-[13px] text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[300px] overflow-y-auto bg-white p-4 rounded-lg border border-slate-200 shadow-sm custom-scrollbar">
            {activeReasoning.thinkingContent}
          </div>
        </div>
      )}
    </div>
  );
}
