import React from "react";
import { IterationStep } from "../types";
import { Play, TrendingDown, Swords, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

interface MultiAlgorithmComparisonProps {
  allTrajectories: Record<string, IterationStep[]>;
  showOverlay: boolean;
  setShowOverlay: (val: boolean) => void;
  enabledAlgs: string[];
  setEnabledAlgs: (algs: string[]) => void;
  selectedAlgId: string;
  setSelectedAlgId: (id: string) => void;
  tol: number;
}

export const algConfig: Record<string, { name: string; color: string; styleName: string; speedClass: string; desc: string }> = {
  gd: {
    name: "最速下降法 (GD)",
    color: "#eab308", // Yellow-500
    styleName: "黄色虚线",
    speedClass: "一阶线性收敛 (Linear)",
    desc: "经典一阶梯度法，易在谷底震荡",
  },
  newton: {
    name: "阻尼牛顿法 (Newton)",
    color: "#10b981", // Emerald-500
    styleName: "绿色粗实线",
    speedClass: "二阶二次收敛 (Quadratic)",
    desc: "二阶牛顿方向，局部极速收敛",
  },
  bfgs: {
    name: "拟牛顿法 (BFGS)",
    color: "#3b82f6", // Blue-500
    styleName: "蓝色实线",
    speedClass: "超线性收敛 (Superlinear)",
    desc: "一阶曲率近似二阶逆 Hessian",
  },
  penalty: {
    name: "外罚函数法 (Penalty)",
    color: "#ec4899", // Pink-500
    styleName: "粉色点划线",
    speedClass: "线性/超线性子步收敛",
    desc: "针对约束规划，逐步收紧可行域",
  },
};

export const MultiAlgorithmComparison: React.FC<MultiAlgorithmComparisonProps> = ({
  allTrajectories,
  showOverlay,
  setShowOverlay,
  enabledAlgs,
  setEnabledAlgs,
  selectedAlgId,
  setSelectedAlgId,
  tol,
}) => {
  const toggleAlg = (algId: string) => {
    if (enabledAlgs.includes(algId)) {
      if (enabledAlgs.length > 1) {
        setEnabledAlgs(enabledAlgs.filter((id) => id !== algId));
      }
    } else {
      setEnabledAlgs([...enabledAlgs, algId]);
    }
  };

  return (
    <div id="multi-alg-comparison" className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
            <Swords size={14} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-800">多算法轨迹同屏竞速对比</h3>
            <p className="text-[9.5px] text-slate-400">在相同初始点和超参下，多条经典搜索算法极速 PK</p>
          </div>
        </div>

        {/* Master Comparison Toggle Switch */}
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            showOverlay
              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
          }`}
        >
          <span>{showOverlay ? "🟢 正在同屏竞速中" : "🏁 开启同屏对比"}</span>
        </button>
      </div>

      {showOverlay && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Legend and Toggle Area */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(algConfig).map(([id, cfg]) => {
              const isEnabled = enabledAlgs.includes(id);
              const isPrimary = id === selectedAlgId;
              const path = allTrajectories[id] || [];
              const stepsCount = path.length > 0 ? path.length - 1 : 0;

              return (
                <div
                  key={id}
                  className={`p-2 rounded-xl border transition-all flex flex-col justify-between gap-1.5 relative ${
                    isEnabled
                      ? "bg-slate-50/60 border-slate-200"
                      : "bg-slate-50/10 border-transparent opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleAlg(id)}
                        className="rounded text-indigo-600 border-slate-200 focus:ring-indigo-300"
                      />
                      <span className="text-[10px] font-bold text-slate-700">{cfg.name.split(" ")[0]}</span>
                    </label>

                    {/* Color dot indicator with styling line description */}
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white shadow-xs"
                      style={{ backgroundColor: cfg.color }}
                      title={cfg.styleName}
                    />
                  </div>

                  <div className="text-[9px] text-slate-400 leading-snug">
                    <span>{cfg.desc}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setSelectedAlgId(id);
                        if (!isEnabled) {
                          setEnabledAlgs([...enabledAlgs, id]);
                        }
                      }}
                      className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded transition-all ${
                        isPrimary
                          ? "bg-indigo-500 text-white"
                          : "text-indigo-600 hover:bg-indigo-50"
                      }`}
                    >
                      {isPrimary ? "主控制" : "设为主控"}
                    </button>
                    <span className="text-[8.5px] font-mono text-slate-500 font-semibold bg-white border border-slate-100 px-1 rounded">
                      {stepsCount} 步
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mathematical PK Leaderboard Table */}
          <div className="border border-slate-100 rounded-xl overflow-hidden bg-white/40">
            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="p-2 pl-3">参战算法</th>
                  <th className="p-2">收敛速度等级</th>
                  <th className="p-2">迭代步数</th>
                  <th className="p-2">最终误差 ‖∇f‖</th>
                  <th className="p-2">最终函数值 f(x*)</th>
                  <th className="p-2 pr-3 text-right">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {enabledAlgs.map((id) => {
                  const cfg = algConfig[id];
                  const path = allTrajectories[id] || [];
                  const hasData = path.length > 0;
                  const finalStep = hasData ? path[path.length - 1] : null;
                  const stepsCount = hasData ? path.length - 1 : 0;
                  
                  // Compute gradient norm of second to last step or final step
                  let finalGradNorm = 0;
                  if (finalStep) {
                    // For the very final appended point, grad is saved as 0 in algorithms.ts,
                    // so we extract gradient of the second-to-last step to see the final search step's true state,
                    // or evaluate the gradient analytically
                    if (path.length > 1) {
                      const prevStep = path[path.length - 2];
                      finalGradNorm = Math.sqrt(prevStep.gradX * prevStep.gradX + prevStep.gradY * prevStep.gradY);
                    } else {
                      finalGradNorm = Math.sqrt(finalStep.gradX * finalStep.gradX + finalStep.gradY * finalStep.gradY);
                    }
                  }

                  const isConverged = finalGradNorm < tol || stepsCount < 40; // simplified
                  const isMain = id === selectedAlgId;

                  return (
                    <tr
                      key={id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isMain ? "bg-indigo-500/5 font-semibold" : ""
                      }`}
                    >
                      <td className="p-2 pl-3 flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        <span className="text-slate-700 font-sans">{cfg.name}</span>
                        {isMain && (
                          <span className="text-[8px] bg-indigo-500 text-white font-bold px-1 rounded-sm leading-none">
                            主控
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-slate-500 font-sans text-[9px]">{cfg.speedClass}</td>
                      <td className="p-2 text-slate-700 font-semibold">{stepsCount} 步</td>
                      <td className="p-2 text-indigo-600">
                        {finalGradNorm === 0 ? "0.000e+0" : finalGradNorm.toExponential(4)}
                      </td>
                      <td className="p-2 text-slate-700">
                        {finalStep ? finalStep.fx.toFixed(6) : "—"}
                      </td>
                      <td className="p-2 pr-3 text-right">
                        {finalGradNorm < tol ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-sans font-bold text-[9px]">
                            <CheckCircle2 size={10} />
                            已收敛
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-amber-500 font-sans font-bold text-[9px]">
                            <AlertTriangle size={10} />
                            达上限
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[9.5px] leading-relaxed text-indigo-700">
            <HelpCircle size={12} className="shrink-0 text-indigo-500" />
            <span>
              <strong>专业解读</strong>: ‖∇f‖ 误差下降趋势充分揭示了收敛性质。最速下降法（黄色）呈线性下降；拟牛顿 BFGS（蓝色）在极值点附近开始超线性陡降；阻尼牛顿法（绿色）拥有二阶 Hessian 定位，一旦切入极值邻域便呈“断崖式”二次极速收敛！
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
