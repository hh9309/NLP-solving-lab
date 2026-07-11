import React, { useState } from "react";
import { IterationStep } from "../types";
import { TrendingDown, Info, BarChart2 } from "lucide-react";

interface ConvergenceChartProps {
  trajectory: IterationStep[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
  tol: number;
  allTrajectories?: Record<string, IterationStep[]>;
  enabledAlgs?: string[];
  showOverlay?: boolean;
  activeMainAlgId?: string;
}

export const ConvergenceChart: React.FC<ConvergenceChartProps> = ({
  trajectory,
  selectedStepIndex,
  onSelectStep,
  tol,
  allTrajectories,
  enabledAlgs,
  showOverlay = false,
  activeMainAlgId = "gd",
}) => {
  const [scaleMode, setScaleMode] = useState<"log" | "linear">("log");

  if (!trajectory || trajectory.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center py-8 min-h-[160px] font-sans flex-1">
        <TrendingDown size={20} className="text-slate-300 mb-1 animate-pulse" />
        <p className="text-xs font-semibold text-slate-500">等待收敛轨迹数据...</p>
        <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">
          请在上方点击“自动演示”或“调整参数”开始寻优。
        </p>
      </div>
    );
  }

  // Calculate gradient norms for each step of the main trajectory
  const data = trajectory.map((step, idx) => {
    const gNorm = Math.sqrt(step.gradX * step.gradX + step.gradY * step.gradY);
    return {
      k: step.k,
      gNorm: gNorm,
      fx: step.fx,
      index: idx,
    };
  });

  // Find minGrad and maxGrad across all visible trajectories for comparison
  let allGNorms: number[] = [];
  if (showOverlay && allTrajectories && enabledAlgs) {
    enabledAlgs.forEach((id) => {
      const path = allTrajectories[id] || [];
      path.forEach((step) => {
        const gn = Math.sqrt(step.gradX * step.gradX + step.gradY * step.gradY);
        if (!isNaN(gn) && isFinite(gn)) {
          allGNorms.push(gn);
        }
      });
    });
  } else {
    data.forEach((d) => {
      if (!isNaN(d.gNorm) && isFinite(d.gNorm)) {
        allGNorms.push(d.gNorm);
      }
    });
  }

  const minGrad = allGNorms.length > 0 ? Math.max(Math.min(...allGNorms), 1e-12) : 1e-12;
  const maxGrad = allGNorms.length > 0 ? Math.max(Math.max(...allGNorms), 1.0) : 1.0;

  let maxK = data.length - 1;
  if (showOverlay && allTrajectories && enabledAlgs) {
    let lengths = enabledAlgs.map((id) => (allTrajectories[id] || []).length);
    maxK = Math.max(...lengths, 1) - 1;
  }

  // SVG dimensions
  const width = 320;
  const height = 110;
  const paddingLeft = 32;
  const paddingRight = 12;
  const paddingTop = 10;
  const paddingBottom = 20;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  // Transform coordinates
  const getX = (k: number) => {
    if (maxK <= 0) return paddingLeft + chartW / 2;
    return paddingLeft + (k / maxK) * chartW;
  };

  const getY = (val: number) => {
    // Top fallback for NaN input
    if (isNaN(val) || !isFinite(val)) {
      return height - paddingBottom;
    }

    if (scaleMode === "log") {
      // Ensure positive values for log base
      const safeVal = Math.max(val, 1e-12);
      const safeMin = Math.max(minGrad, 1e-12);
      const safeMax = Math.max(maxGrad, 1e-10);
      
      const logMin = Math.log10(safeMin);
      const logMax = Math.log10(safeMax);
      const logRange = logMax - logMin <= 0 ? 1 : logMax - logMin;
      
      const pct = (Math.log10(safeVal) - logMin) / logRange;
      const result = height - paddingBottom - pct * chartH;
      return isNaN(result) ? height - paddingBottom : result;
    } else {
      const range = maxGrad - minGrad <= 0 ? 1 : maxGrad - minGrad;
      const pct = (val - minGrad) / range;
      const result = height - paddingBottom - pct * chartH;
      return isNaN(result) ? height - paddingBottom : result;
    }
  };

  // Generate path points
  let pathD = "";
  let areaD = "";
  
  if (data.length > 0) {
    const points = data.map((d) => ({
      x: getX(d.k),
      y: getY(d.gNorm),
    }));

    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
  }

  // Calculate threshold line height
  const tolY = getY(tol);

  return (
    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 font-sans flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={14} className="text-indigo-500 animate-pulse" />
          <div>
            <h3 className="text-xs font-semibold text-slate-800">收敛速度与误差分析</h3>
            <p className="text-[9px] text-slate-400">一阶梯度范数 ‖∇f‖ 随迭代次数 K 的变化</p>
          </div>
        </div>

        {/* Scale Toggle Tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[9px] font-semibold">
          <button
            onClick={() => setScaleMode("log")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              scaleMode === "log" ? "bg-white shadow-xs text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
            title="对数刻度适合观察超线性及二次收敛速度"
          >
            Log
          </button>
          <button
            onClick={() => setScaleMode("linear")}
            className={`px-1.5 py-0.5 rounded transition-all ${
              scaleMode === "linear" ? "bg-white shadow-xs text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Linear
          </button>
        </div>
      </div>

      {/* SVG Plot view */}
      <div className="relative w-full overflow-hidden select-none">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <line
            x1={paddingLeft}
            y1={getY(maxGrad)}
            x2={width - paddingRight}
            y2={getY(maxGrad)}
            stroke="rgba(148, 163, 184, 0.15)"
            strokeDasharray="2 2"
          />
          <line
            x1={paddingLeft}
            y1={getY(minGrad)}
            x2={width - paddingRight}
            y2={getY(minGrad)}
            stroke="rgba(148, 163, 184, 0.15)"
            strokeDasharray="2 2"
          />

          {/* Tolerance Threshold horizontal target indicator line */}
          {tolY >= paddingTop && tolY <= height - paddingBottom && (
            <>
              <line
                x1={paddingLeft}
                y1={tolY}
                x2={width - paddingRight}
                y2={tolY}
                stroke="rgba(16, 185, 129, 0.45)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={width - paddingRight - 2}
                y={tolY - 3}
                fill="rgb(16, 185, 129)"
                fontSize="7px"
                fontWeight="bold"
                fontFamily="font-mono"
                textAnchor="end"
              >
                TOL ({tol.toExponential(0)})
              </text>
            </>
          )}

          {/* Y Axis ticks & Labels */}
          <text
            x={paddingLeft - 6}
            y={getY(maxGrad) + 3}
            fill="#64748b"
            fontSize="7px"
            fontFamily="font-mono"
            textAnchor="end"
          >
            {maxGrad.toExponential(0)}
          </text>
          <text
            x={paddingLeft - 6}
            y={getY(minGrad) - 1}
            fill="#64748b"
            fontSize="7px"
            fontFamily="font-mono"
            textAnchor="end"
          >
            {minGrad.toExponential(0)}
          </text>

          {/* X Axis base line */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth={1}
          />

          {/* X Axis scale ticks */}
          <text
            x={paddingLeft}
            y={height - paddingBottom + 11}
            fill="#64748b"
            fontSize="7px"
            fontFamily="font-mono"
            textAnchor="middle"
          >
            K=0
          </text>
          {maxK > 0 && (
            <text
              x={paddingLeft + chartW}
              y={height - paddingBottom + 11}
              fill="#64748b"
              fontSize="7px"
              fontFamily="font-mono"
              textAnchor="middle"
            >
              K={maxK}
            </text>
          )}

          {/* Area & curve line path */}
          {showOverlay && allTrajectories && enabledAlgs ? (
            enabledAlgs.map((id) => {
              const path = allTrajectories[id] || [];
              if (path.length <= 1) return null;

              const points = path.map((step) => ({
                x: getX(step.k),
                y: getY(Math.sqrt(step.gradX * step.gradX + step.gradY * step.gradY)),
              }));

              const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
              const color = id === "gd" ? "#eab308" : id === "newton" ? "#10b981" : id === "bfgs" ? "#3b82f6" : "#ec4899";
              const isMain = id === activeMainAlgId;

              return (
                <g key={id}>
                  {isMain && (
                    <path
                      d={`${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`}
                      fill="url(#chartAreaGradient)"
                      opacity={0.15}
                    />
                  )}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth={isMain ? 2.0 : 1.2}
                    strokeDasharray={id === "gd" ? "3 2" : id === "penalty" ? "1 1" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })
          ) : (
            data.length > 1 && (
              <>
                <path d={areaD} fill="url(#chartAreaGradient)" />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )
          )}

          {/* Clickable transparent hotzones for step selection (based on active main trajectory) */}
          {(showOverlay && allTrajectories ? allTrajectories[activeMainAlgId] || [] : trajectory).map((step, i) => {
            const gNorm = Math.sqrt(step.gradX * step.gradX + step.gradY * step.gradY);
            const x = getX(step.k);
            const y = getY(gNorm);
            const isSelected = i === selectedStepIndex;
            const mainColor = activeMainAlgId === "gd" ? "#eab308" : activeMainAlgId === "newton" ? "#10b981" : activeMainAlgId === "bfgs" ? "#3b82f6" : "#ec4899";

            return (
              <g key={i} className="cursor-pointer group" onClick={() => onSelectStep(i)}>
                {/* Expand the hit target radius to make clicking on touch screens exceptionally easy */}
                <circle
                  cx={x}
                  cy={y}
                  r={8}
                  fill="transparent"
                />

                {/* Visible tracking dots */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 3.5 : 1.5}
                  fill={isSelected ? mainColor : "rgba(129, 140, 248, 0.75)"}
                  stroke={isSelected ? "#ffffff" : "transparent"}
                  strokeWidth={1}
                  className="transition-all duration-200 group-hover:r-3"
                />

                {/* Mini pulsing outer ring for currently selected active step */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r={7}
                    fill="none"
                    stroke={mainColor}
                    strokeWidth={0.75}
                    className="animate-ping"
                    style={{ transformOrigin: `${x}px ${y}px` }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected step details overlay */}
        {selectedStepIndex < data.length && (
          <div className="mt-1 flex items-center justify-between text-[10px] bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2 font-mono text-slate-600">
            <div>
              <span className="text-[9px] text-slate-400 font-semibold block uppercase">选中迭代 K={data[selectedStepIndex].k}</span>
              <span className="text-slate-700 font-bold block truncate">‖∇f‖ = {data[selectedStepIndex].gNorm.toExponential(4)}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-semibold block uppercase">当前目标函数值</span>
              <span className="text-slate-700 font-bold block">f(x) = {data[selectedStepIndex].fx.toFixed(6)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 bg-amber-500/5 text-amber-700 border border-amber-500/15 rounded-lg p-1.5 text-[9.5px] leading-relaxed">
        <Info size={11} className="shrink-0 text-amber-500" />
        <span>可直接点击折线上的节点，实现图形画布、高亮代码及状态指标的<strong>全方位极速联动</strong>。</span>
      </div>
    </div>
  );
};
