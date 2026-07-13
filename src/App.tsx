/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  Point,
  IterationStep,
  ObjectiveFunction,
  Constraint,
} from "./types";
import {
  functionsList,
  constraintsList,
  algorithmsList,
  runOptimization,
} from "./algorithms";
import { EvolutionCanvas } from "./components/EvolutionCanvas";
import { DynamicFunctionSandbox } from "./components/DynamicFunctionSandbox";
import { LineSearchSlice } from "./components/LineSearchSlice";
import { PythonVerification } from "./components/PythonVerification";
import { AIInsights } from "./components/AIInsights";
import { ReportExportModal } from "./components/ReportExportModal";
import { KnowledgeGuideModal, AIInsightsModal } from "./components/HeaderTabsModals";
import { ConvergenceChart } from "./components/ConvergenceChart";
import { MultiAlgorithmComparison } from "./components/MultiAlgorithmComparison";
import { AlgorithmMermaidFlowchart } from "./components/AlgorithmMermaidFlowchart";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  BookOpen,
  Sliders,
  Settings,
  Flame,
  Binary,
  HelpCircle,
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function App() {
  // --- State Declarations ---
  const [customFunc, setCustomFunc] = useState<ObjectiveFunction | null>(null);
  const combinedFunctionsList = customFunc
    ? [...functionsList, customFunc]
    : functionsList;

  const [selectedFunc, setSelectedFunc] = useState<ObjectiveFunction>(functionsList[0]);
  const [selectedAlgId, setSelectedAlgId] = useState<string>("gd");
  const [activeConstraintIds, setActiveConstraintIds] = useState<string[]>([]);
  const [startPoint, setStartPoint] = useState<Point>(functionsList[0].defaultStart);

  // Optimization parameters
  const [tol, setTol] = useState<number>(1e-4);
  const [maxIter, setMaxIter] = useState<number>(40);
  const [penaltyMu, setPenaltyMu] = useState<number>(10);
  const [lineSearchC, setLineSearchC] = useState<number>(0.1);
  const [lineSearchBeta, setLineSearchBeta] = useState<number>(0.5);

  // Scipy parameters (scipy.optimize)
  const [scipyMethod, setScipyMethod] = useState<string>("SLSQP");

  // Trajectory calculation
  const [trajectory, setTrajectory] = useState<IterationStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  // Multi-Algorithm overlay states
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [enabledAlgs, setEnabledAlgs] = useState<string[]>(["gd", "newton", "bfgs", "penalty"]);
  const [allTrajectories, setAllTrajectories] = useState<Record<string, IterationStep[]>>({});

  // Playback Animation states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(400); // ms per step
  const animationTimer = useRef<NodeJS.Timeout | null>(null);

  // Academic Report modal state
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState<boolean>(false);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState<boolean>(false);

  // Clicked pseudocode lines state for manual expansion
  const [clickedLineNums, setClickedLineNums] = useState<Record<number, boolean>>({});

  // Reset expanded pseudocode lines when algorithm changes
  useEffect(() => {
    setClickedLineNums({});
  }, [selectedAlgId]);

  // Active constraints derived list
  const activeConstraints = constraintsList.filter((c) => activeConstraintIds.includes(c.id));

  // --- Optimization Trajectory Calculation Trigger ---
  useEffect(() => {
    // Run real mathematics engine for all algorithms to support the comparison overlay
    const results: Record<string, IterationStep[]> = {};
    algorithmsList.forEach((alg) => {
      results[alg.id] = runOptimization(
        selectedFunc,
        alg.id,
        startPoint,
        activeConstraints,
        tol,
        maxIter,
        penaltyMu,
        lineSearchC,
        lineSearchBeta
      );
    });

    setAllTrajectories(results);

    const path = results[selectedAlgId] || [];
    setTrajectory(path);
    setSelectedStepIndex(path.length > 0 ? path.length - 1 : 0); // Highlight final converged state by default
    setIsPlaying(false); // Pause any running animations on model change
  }, [selectedFunc, selectedAlgId, activeConstraintIds, startPoint, tol, maxIter, penaltyMu, lineSearchC, lineSearchBeta]);

  // Adjust startPoint automatically when Objective Function changes
  const handleFuncChange = (id: string) => {
    const f = combinedFunctionsList.find((func) => func.id === id) || combinedFunctionsList[0];
    setSelectedFunc(f);
    setStartPoint(f.defaultStart);
  };

  // Load custom function from sandbox and set it as active
  const handleLoadCustomFunction = (func: ObjectiveFunction) => {
    setCustomFunc(func);
    setSelectedFunc(func);
    setStartPoint(func.defaultStart);
  };

  // --- Animation Playback Handlers ---
  useEffect(() => {
    if (isPlaying) {
      animationTimer.current = setInterval(() => {
        setSelectedStepIndex((prev) => {
          if (prev >= trajectory.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else if (animationTimer.current) {
      clearInterval(animationTimer.current);
    }

    return () => {
      if (animationTimer.current) clearInterval(animationTimer.current);
    };
  }, [isPlaying, trajectory, playbackSpeed]);

  const handlePlayPause = () => {
    if (selectedStepIndex >= trajectory.length - 1) {
      // Loop back to start
      setSelectedStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (selectedStepIndex < trajectory.length - 1) {
      setSelectedStepIndex((prev) => prev + 1);
    }
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    if (selectedStepIndex > 0) {
      setSelectedStepIndex((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setSelectedStepIndex(0);
  };

  // --- Active Algorithm Pseudo Code Metadata ---
  const currentAlgorithm = algorithmsList.find((alg) => alg.id === selectedAlgId) || algorithmsList[0];

  // Dynamic Pseudo-code highlighted line calculation
  const getHighlightedLineNum = () => {
    if (selectedStepIndex === 0) return 1; // at start, show gradient check
    if (selectedStepIndex === trajectory.length - 1) return 4; // at end, show convergence check

    // If middle, we fluctuate step line highlights to mimic execution path
    const offset = selectedStepIndex % 3;
    if (offset === 0) return 2; // Line Search alpha test
    if (offset === 1) return 3; // Updating coordinate position
    return 1; // back to gradient loop
  };

  const activeLineNum = getHighlightedLineNum();

  const currentStepData = trajectory[selectedStepIndex] || null;

  return (
    <div id="app-root" className="min-h-screen bg-gradient-to-tr from-stone-50 via-slate-50 to-stone-50 flex flex-col font-sans select-none antialiased text-slate-800 pb-12">
      {/* Elegantly Polished Top Navbar */}
      <header id="header-nav" className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-400 to-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Sliders size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 leading-tight">非线性规划动态演进系统</h1>
            <p className="text-[10px] text-slate-400">一阶梯度、二阶牛顿、拟牛顿法及非线性约束罚函数的可视化教学与控制中心</p>
          </div>
        </div>

        {/* 右侧控制与导出工具组：知识导引、AI洞察与导出报告紧密排布 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-50 border border-slate-100 p-1 rounded-xl gap-0.5">
            <button
              onClick={() => setIsKnowledgeOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white active:scale-95 transition-all"
              title="查看非线性规划理论背景、公式与算法理论"
            >
              <BookOpen size={12.5} className="text-indigo-500" />
              <span>知识导引</span>
            </button>
            <div className="w-px h-3.5 bg-slate-200" />
            <button
              onClick={() => setIsAIInsightsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white active:scale-95 transition-all animate-pulse"
              title="查看 KKT 边界条件、影子价格及 Hessian 实时诊断"
            >
              <Sparkles size={12.5} className="text-indigo-500" />
              <span>AI 洞察</span>
            </button>
          </div>

          <button
            onClick={() => setIsReportOpen(true)}
            id="btn-export-report"
            className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70 border border-indigo-100 px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 font-medium"
          >
            <FileSpreadsheet size={13} />
            <span>导出报告</span>
          </button>
        </div>
      </header>

      {/* Main Multi-Grid Workspace */}
      <main className="max-w-[1400px] w-full mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ================= LEFT COLUMN: KNOWLEDGE & CONTROLS (3/12 cols) ================= */}
        <section id="left-sidebar" className="lg:col-span-3 flex flex-col gap-4 h-full">
          
          {/* Objective & Algorithm Selector Card */}
          <div id="card-selection" className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3.5">
            <div>
              <span className="text-[9px] text-indigo-800 font-bold uppercase tracking-wider block mb-1">
                第一步: 设定数学模型
              </span>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Flame size={12} className="text-amber-500" />
                目标函数 Objective f(x, y)
              </label>
              <select
                value={selectedFunc.id}
                onChange={(e) => handleFuncChange(e.target.value)}
                id="select-objective"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none hover:bg-slate-100 focus:border-indigo-200 transition"
              >
                {combinedFunctionsList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-indigo-700 font-mono block mt-1 px-1">
                公式: {selectedFunc.formula}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Binary size={12} className="text-teal-500" />
                优化算法 Algorithm
              </label>
              <select
                value={selectedAlgId}
                onChange={(e) => {
                  setSelectedAlgId(e.target.value);
                  // Auto-enable circular constraint if penalty method is selected to show feasibility physics
                  if (e.target.value === "penalty" && activeConstraintIds.length === 0) {
                    setActiveConstraintIds(["circle"]);
                  }
                }}
                id="select-algorithm"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none hover:bg-slate-100 focus:border-indigo-200 transition"
              >
                {algorithmsList.map((alg) => (
                  <option key={alg.id} value={alg.id}>
                    {alg.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block mt-1.5 leading-relaxed px-1">
                {currentAlgorithm.description}
              </span>
            </div>

            {/* Non-linear constraints activation checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                可行域约束条件 $g_i(x) \le 0$
              </label>
              <div className="flex flex-col gap-1.5">
                {constraintsList.map((c) => {
                  const isChecked = activeConstraintIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between p-2 rounded-xl border text-[11px] transition-all cursor-pointer ${
                        isChecked
                          ? "bg-rose-50/40 border-rose-100/50 text-rose-800"
                          : "bg-slate-50/50 border-slate-100 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-medium truncate max-w-[160px]">{c.name}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveConstraintIds((prev) => [...prev, c.id]);
                          } else {
                            setActiveConstraintIds((prev) => prev.filter((id) => id !== c.id));
                          }
                        }}
                        className="rounded border-slate-200 text-rose-500 focus:ring-rose-200"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Playback & Speed Controls Card */}
          <div id="card-controls" className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
            <span className="text-[9px] text-indigo-800 font-bold uppercase tracking-wider block mb-0.5">
              第二步: 迭代演绎控制
            </span>

            {/* Interactive sliders for Line Search factors */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <label className="block text-slate-500 mb-0.5">回溯充分下降 c</label>
                <input
                  type="range"
                  min="0.01"
                  max="0.4"
                  step="0.01"
                  value={lineSearchC}
                  onChange={(e) => setLineSearchC(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between font-mono text-[9px] text-slate-400 mt-0.5">
                  <span>Armijo C:</span>
                  <span className="text-slate-600">{lineSearchC.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5">步长收缩比例 β</label>
                <input
                  type="range"
                  min="0.2"
                  max="0.9"
                  step="0.05"
                  value={lineSearchBeta}
                  onChange={(e) => setLineSearchBeta(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between font-mono text-[9px] text-slate-400 mt-0.5">
                  <span>收缩比 β:</span>
                  <span className="text-slate-600">{lineSearchBeta.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {selectedAlgId === "penalty" && (
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">初始罚函数因子 μ₀</label>
                <input
                  type="range"
                  min="2"
                  max="50"
                  step="2"
                  value={penaltyMu}
                  onChange={(e) => setPenaltyMu(parseInt(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between font-mono text-[9px] text-slate-400 mt-0.5">
                  <span>Penalty Mu:</span>
                  <span className="text-slate-600">{penaltyMu}</span>
                </div>
              </div>
            )}

            {/* Manual starting point manual inputs */}
            <div className="bg-slate-50/50 border border-slate-100 p-2 rounded-xl grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">初始坐标 x₀</span>
                <input
                  type="number"
                  step="0.1"
                  min={selectedFunc.bounds.xMin}
                  max={selectedFunc.bounds.xMax}
                  value={startPoint.x}
                  onChange={(e) => setStartPoint((prev) => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white border border-slate-150 rounded-lg py-1 px-2 text-center text-slate-700 font-mono outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">初始坐标 y₀</span>
                <input
                  type="number"
                  step="0.1"
                  min={selectedFunc.bounds.yMin}
                  max={selectedFunc.bounds.yMax}
                  value={startPoint.y}
                  onChange={(e) => setStartPoint((prev) => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white border border-slate-150 rounded-lg py-1 px-2 text-center text-slate-700 font-mono outline-none"
                />
              </div>
            </div>

            {/* Media controllers buttons list */}
            <div className="flex items-center justify-between gap-1 mt-1">
              <button
                onClick={handleReset}
                title="回到初始点"
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition border border-slate-100"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={handleStepBackward}
                disabled={selectedStepIndex <= 0}
                title="上一步"
                className="p-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 rounded-xl text-slate-500 transition border border-slate-100"
              >
                <SkipBack size={14} />
              </button>
              <button
                onClick={handlePlayPause}
                className="flex-1 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlaying ? "暂停演绎" : "自动演示"}</span>
              </button>
              <button
                onClick={handleStepForward}
                disabled={selectedStepIndex >= trajectory.length - 1}
                title="下一步"
                className="p-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 rounded-xl text-slate-500 transition border border-slate-100"
              >
                <SkipForward size={14} />
              </button>
            </div>

            {/* Animation speed slider */}
            <div className="mt-1">
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5 font-mono">
                <span>步进延迟:</span>
                <span>{playbackSpeed}ms</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          {/* Dynamic Function Sandbox (Custom formula parser) */}
          <DynamicFunctionSandbox
            onLoadCustomFunction={handleLoadCustomFunction}
            currentSelectedFuncId={selectedFunc.id}
          />

          {/* Pseudo Code Synchronous highlight Panel (Mimic maximum flow design) */}
          <div id="card-pseudo" className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 font-sans flex-1">
            <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <BookOpen size={14} className="text-slate-500" />
              <span>算法执行逻辑高亮 (K={selectedStepIndex})</span>
            </h3>
            <div className="flex flex-col gap-1 mt-1 text-[11px]">
              {currentAlgorithm.pseudoCode.map((line) => {
                const isCurrent = line.num === activeLineNum;
                const isExpanded = isCurrent || !!clickedLineNums[line.num];

                let containerClass = "relative overflow-hidden p-2 pl-3.5 pr-2.5 rounded-xl transition-all duration-200 border cursor-pointer select-none ";
                if (isCurrent) {
                  containerClass += "bg-indigo-500/10 border-indigo-500/25 shadow-sm scale-[1.02] origin-left animate-slide-fade";
                } else if (isExpanded) {
                  containerClass += "bg-indigo-50/40 border-indigo-100/60 shadow-xs hover:bg-indigo-50/60";
                } else {
                  containerClass += "bg-slate-50/30 border-transparent text-slate-500 hover:bg-slate-100/50 hover:border-slate-200/50";
                }

                return (
                  <div
                    key={line.num}
                    className={containerClass}
                    onClick={() => {
                      setClickedLineNums((prev) => ({
                        ...prev,
                        [line.num]: !prev[line.num],
                      }));
                    }}
                  >
                    {isCurrent && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 animated-side-stripe" />
                    )}
                    <div className="flex items-center justify-between font-mono font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={isCurrent ? "text-indigo-700" : "text-slate-400"}>
                          0{line.num}
                        </span>
                        <span className={isCurrent ? "text-slate-800" : "text-slate-600"}>
                          {line.text}
                        </span>
                      </div>
                      <div className={isCurrent ? "text-indigo-500" : "text-slate-400"}>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <p className="text-[10px] text-indigo-800/80 font-sans mt-1 leading-normal animate-in fade-in duration-300">
                        {line.desc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </section>

        {/* ================= CENTER COLUMN: THE DUAL-PERSPECTIVE CANVAS (6/12 cols) ================= */}
        <section id="center-canvas" className="lg:col-span-6 flex flex-col gap-5 h-full">
          {/* Main Visual Dual Canvas */}
          <EvolutionCanvas
            func={selectedFunc}
            activeConstraints={activeConstraints}
            trajectory={trajectory}
            selectedStepIndex={selectedStepIndex}
            onSelectStep={setSelectedStepIndex}
            onSetStartPoint={setStartPoint}
            algId={selectedAlgId}
            allTrajectories={allTrajectories}
            enabledAlgs={enabledAlgs}
            showOverlay={showOverlay}
          />

          {/* 1D Line Search Slice representing Wolfe or Armijo backtracks */}
          <LineSearchSlice
            currentStep={currentStepData}
            func={selectedFunc}
            activeConstraints={activeConstraints}
            algId={selectedAlgId}
            penaltyMu={penaltyMu}
          />

          {/* Multi-Algorithm Overlay & Dashboards */}
          <MultiAlgorithmComparison
            allTrajectories={allTrajectories}
            showOverlay={showOverlay}
            setShowOverlay={setShowOverlay}
            enabledAlgs={enabledAlgs}
            setEnabledAlgs={setEnabledAlgs}
            selectedAlgId={selectedAlgId}
            setSelectedAlgId={setSelectedAlgId}
            tol={tol}
          />

          {/* Dynamic Mermaid Algorithm Flowchart with live active nodes highlighting */}
          <AlgorithmMermaidFlowchart
            algId={selectedAlgId}
            algName={currentAlgorithm.name}
            activeLineNum={activeLineNum}
            clickedLineNums={clickedLineNums}
          />
        </section>

        {/* ================= RIGHT COLUMN: ANALYSIS & VERIFICATION (3/12 cols) ================= */}
        <section id="right-sidebar" className="lg:col-span-3 flex flex-col gap-5 h-full">
          {/* Real-time calculated properties & AI Mathematical analysis */}
          <AIInsights
            func={selectedFunc}
            activeConstraints={activeConstraints}
            trajectory={trajectory}
            selectedStepIndex={selectedStepIndex}
            tol={tol}
            maxIter={maxIter}
            scipyMethod={scipyMethod}
          />

          {/* Python scipy.optimize verification script generator & params inputs */}
          <PythonVerification
            func={selectedFunc}
            activeConstraints={activeConstraints}
            startPoint={startPoint}
            tol={tol}
            maxIter={maxIter}
            onUpdateParams={(newTol, newMaxIter) => {
              setTol(newTol);
              setMaxIter(newMaxIter);
            }}
            scipyMethod={scipyMethod}
            onChangeScipyMethod={setScipyMethod}
            trajectory={trajectory}
          />

          {/* Convergence Error Mini-Chart */}
          <ConvergenceChart
            trajectory={trajectory}
            selectedStepIndex={selectedStepIndex}
            onSelectStep={setSelectedStepIndex}
            tol={tol}
            allTrajectories={allTrajectories}
            enabledAlgs={enabledAlgs}
            showOverlay={showOverlay}
            activeMainAlgId={selectedAlgId}
          />
        </section>

      </main>

      {/* Academic report generation view modal */}
      <ReportExportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        func={selectedFunc}
        activeConstraints={activeConstraints}
        trajectory={trajectory}
        algorithmName={currentAlgorithm.name}
        tol={tol}
        maxIter={maxIter}
        scipyMethod={scipyMethod}
        allTrajectories={allTrajectories}
        algorithmsList={algorithmsList}
      />

      {/* 知识导引专业切片 Modal */}
      <KnowledgeGuideModal
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
        func={selectedFunc}
        activeConstraints={activeConstraints}
      />

      {/* AI 洞察专业切片 Modal */}
      <AIInsightsModal
        isOpen={isAIInsightsOpen}
        onClose={() => setIsAIInsightsOpen(false)}
        func={selectedFunc}
        activeConstraints={activeConstraints}
        trajectory={trajectory}
        selectedStepIndex={selectedStepIndex}
        tol={tol}
        maxIter={maxIter}
        scipyMethod={scipyMethod}
      />
    </div>
  );
}
