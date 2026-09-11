import React, { useState } from 'react';
import {
  Cpu,
  Zap,
  TrendingUp,
  Activity,
  Sparkles,
  Database,
  Play,
  RotateCw,
  Clock,
  Layers,
  BarChart3,
  Sliders,
} from 'lucide-react';
import { AIModelArchitecture, UserProfile } from '../types';

interface AIStreamingStudioProps {
  currentUser: UserProfile;
  aiState: AIModelArchitecture;
  onTriggerRetrain: (samples?: any[]) => Promise<any>;
  onSimulateStreamEvent: () => Promise<void>;
}

export const AIStreamingStudio: React.FC<AIStreamingStudioProps> = ({
  currentUser,
  aiState,
  onTriggerRetrain,
  onSimulateStreamEvent,
}) => {
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<{
    previousAccuracy: number;
    newAccuracy: number;
    newModelHash: string;
    samplesTrained: number;
    driftCorrectedPercentage: number;
    blockIndex?: number;
  } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [driftThreshold, setDriftThreshold] = useState(aiState.driftThreshold || 15.0);

  const handleRetrainClick = async () => {
    setIsRetraining(true);
    try {
      const res = await onTriggerRetrain();
      if (res?.summary) {
        setRetrainResult({
          ...res.summary,
          blockIndex: res.blockIndex,
        });
      }
    } finally {
      setIsRetraining(false);
    }
  };

  const handleStreamClick = async () => {
    setIsStreaming(true);
    try {
      await onSimulateStreamEvent();
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Studio Header & Metrics */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white sm:text-lg">
                Real-Time AI Streaming Ingestion & Auto-Training Engine
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Sliding-window feature engineering, continuous concept drift detection, and automated weight recalibration anchored to blockchain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStreamClick}
              disabled={isStreaming}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 disabled:opacity-50 transition"
            >
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              Inject Multi-Source Stream Packet
            </button>

            <button
              onClick={handleRetrainClick}
              disabled={isRetraining}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-sm"
            >
              {isRetraining ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  Auto-Training Estimators...
                </>
              ) : (
                <>
                  <Sliders className="h-3.5 w-3.5" />
                  Trigger Auto-Training & Anchor Hash
                </>
              )}
            </button>
          </div>
        </div>

        {/* Retrain Success Notification */}
        {retrainResult && (
          <div className="mt-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-3.5 text-xs text-indigo-200">
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-100">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Auto-Training Completed Successfully!
            </div>
            <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-300">
              <div>
                Accuracy:{' '}
                <strong className="text-emerald-400">
                  {retrainResult.previousAccuracy}% -&gt; {retrainResult.newAccuracy}%
                </strong>
              </div>
              <div>
                Drift Corrected:{' '}
                <strong className="text-cyan-400">-{retrainResult.driftCorrectedPercentage}%</strong>
              </div>
              <div>
                Anchored to:{' '}
                <strong className="text-amber-300">Block #{retrainResult.blockIndex || 2}</strong>
              </div>
              <div className="truncate">
                New Model Hash:{' '}
                <strong className="text-slate-200">{retrainResult.newModelHash.slice(0, 12)}...</strong>
              </div>
            </div>
          </div>
        )}

        {/* Live KPI Cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <div className="text-[11px] text-slate-400">Model Generation:</div>
            <div className="text-sm font-bold text-white mt-0.5">{aiState.modelVersion}</div>
            <div className="text-[10px] text-cyan-400 truncate mt-1">Hash: {aiState.modelHashOnChain}</div>
          </div>

          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <div className="text-[11px] text-slate-400">Validation Accuracy:</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{aiState.currentAccuracy}%</div>
            <div className="text-[10px] text-slate-400 mt-1">Evaluated on {aiState.trainingSamplesCount} ground-truth sets</div>
          </div>

          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <div className="text-[11px] text-slate-400">Drift Deviation:</div>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">{aiState.driftPercentage}%</div>
            <div className="text-[10px] text-slate-400 mt-1">Threshold limit: &lt; {driftThreshold}%</div>
          </div>

          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
            <div className="text-[11px] text-slate-400">Inference Latency:</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{aiState.averageInferenceLatencyMs} ms</div>
            <div className="text-[10px] text-slate-400 mt-1">Throughput: {aiState.streamingIngestionRateTps} TPS</div>
          </div>
        </div>
      </div>

      {/* Feature Engineering Architecture & Real-Time Telemetry Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sliding Window Feature Weights (6 cols) */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <h3 className="font-bold text-white text-sm sm:text-base">
                Streaming Sliding-Window Feature Matrix
              </h3>
            </div>
            <span className="text-xs text-slate-400">Ensemble Weight Allocation</span>
          </div>

          <div className="mt-4 space-y-3">
            {aiState.featureWeights.map((f, idx) => (
              <div key={idx} className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-cyan-300">{f.featureName}</span>
                  <span className="text-amber-400 font-bold">{Math.round(f.weight * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                    style={{ width: `${f.weight * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-400 leading-snug">{f.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Multi-Source Streaming Ingestion Telemetry (6 cols) */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Real-Time Multi-Source Ingestion Pipeline
                </h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Listening
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Aggregating streaming telemetry across NPCI UPI switches, ATM telemetry hubs, victim emergency reports, and swift remittances.
            </p>

            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {aiState.recentTelemetry.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 font-mono text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        item.streamSource === 'UPI_SWITCH'
                          ? 'bg-blue-500/20 text-blue-300'
                          : item.streamSource === 'ATM_TELEMETRY'
                          ? 'bg-purple-500/20 text-purple-300'
                          : item.streamSource === 'CYBER_COMPLAINT'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {item.streamSource}
                    </span>
                    <span className="text-slate-300">₹{item.amount.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-bold ${
                        item.fraudScore >= 75
                          ? 'text-rose-400'
                          : item.fraudScore >= 45
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.fraudScore}% ({item.tier})
                    </span>
                    <span className="text-[10px] text-slate-400">{item.latencyMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Buffer Size: 256KB Circular Memory</span>
            <span className="font-mono text-emerald-400">Zero Ingestion Loss</span>
          </div>
        </div>
      </div>
    </div>
  );
};
