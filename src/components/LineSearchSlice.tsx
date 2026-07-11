import React from "react";
import { IterationStep, ObjectiveFunction, Constraint } from "../types";

interface LineSearchSliceProps {
  currentStep: IterationStep | null;
  func: ObjectiveFunction;
  activeConstraints: Constraint[];
  algId: string;
  penaltyMu: number;
}

export const LineSearchSlice: React.FC<LineSearchSliceProps> = ({
  currentStep,
  func,
  activeConstraints,
  algId,
  penaltyMu,
}) => {
  if (!currentStep || !currentStep.lineSearchSteps || currentStep.lineSearchSteps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-xs italic font-sans">
        点击迭代点或运行算法，即可在此观察一维线搜索（Line Search）回溯切片
      </div>
    );
  }

  const steps = currentStep.lineSearchSteps;
  const alphas = steps.map((s) => s.alpha);
  const vals = steps.map((s) => s.val);

  const minAlpha = 0;
  const maxAlpha = 1.5;
  const minVal = Math.min(...vals, currentStep.fx);
  const maxVal = Math.max(...vals, currentStep.fx);

  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;
  const padMinVal = minVal - valRange * 0.1;
  const padMaxVal = maxVal + valRange * 0.1;
  const padRange = padMaxVal - padMinVal;

  // SVG dimensions
  const width = 360;
  const height = 140;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const getX = (alpha: number) => {
    return paddingLeft + ((alpha - minAlpha) / (maxAlpha - minAlpha)) * (width - paddingLeft - paddingRight);
  };

  const getY = (val: number) => {
    return height - paddingBottom - ((val - padMinVal) / padRange) * (height - paddingTop - paddingBottom);
  };

  // Generate curve path
  let pathD = "";
  // Draw curve using step test values
  steps.forEach((s, idx) => {
    const px = getX(s.alpha);
    const py = getY(s.val);
    if (idx === 0) {
      pathD = `M ${px} ${py}`;
    } else {
      pathD += ` L ${px} ${py}`;
    }
  });

  // Current selected alpha marker
  const chosenX = getX(currentStep.alpha);
  // We can approximate the chosen value
  const chosenY = getY(currentStep.fx);

  return (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          一维搜索方向切片 $h(\alpha) = f(x_k + \alpha d_k)$
        </h4>
        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono">
          k={currentStep.k}, 选定步长 α={currentStep.alpha.toFixed(4)}
        </span>
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={height - paddingBottom}
            stroke="#e2e8f0"
            strokeWidth={1}
          />

          {/* Curve Path */}
          {pathD && <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3,3" />}

          {/* Test Backtracking points */}
          {steps.map((s, idx) => {
            const isChosen = Math.abs(s.alpha - currentStep.alpha) < 1e-5;
            return (
              <g key={idx}>
                <circle
                  cx={getX(s.alpha)}
                  cy={getY(s.val)}
                  r={isChosen ? 4 : 3}
                  className={isChosen ? "fill-indigo-500 stroke-indigo-100 stroke-[3]" : "fill-rose-400 opacity-70"}
                />
                {!isChosen && (
                  <line
                    x1={getX(s.alpha)}
                    y1={getY(s.val)}
                    x2={getX(s.alpha)}
                    y2={height - paddingBottom}
                    stroke="#fda4af"
                    strokeWidth={0.5}
                    strokeDasharray="2,2"
                  />
                )}
              </g>
            );
          })}

          {/* Chosen Step Vertical line */}
          <line
            x1={chosenX}
            y1={paddingTop}
            x2={chosenX}
            y2={height - paddingBottom}
            stroke="#4f46e5"
            strokeWidth={1.5}
          />

          {/* Armijo upper bound line representation (concept tangent slope) */}
          <line
            x1={paddingLeft}
            y1={getY(currentStep.fx)}
            x2={getX(0.8)}
            y2={getY(currentStep.fx) + (height - paddingBottom - getY(currentStep.fx)) * 0.2}
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4,2"
          />

          {/* Labels */}
          <text
            x={width - paddingRight}
            y={height - 8}
            textAnchor="end"
            fontSize="9"
            fill="#64748b"
            className="font-mono"
          >
            步长 α
          </text>
          <text x={10} y={paddingTop + 5} fontSize="9" fill="#64748b" className="font-mono">
            f值
          </text>

          {/* Y axis ticks */}
          <text x={paddingLeft - 6} y={getY(minVal) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
            {minVal.toFixed(1)}
          </text>
          <text x={paddingLeft - 6} y={getY(maxVal) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
            {maxVal.toFixed(1)}
          </text>

          {/* X axis ticks */}
          <text x={getX(0)} y={height - 12} textAnchor="middle" fontSize="8" fill="#94a3b8">
            0
          </text>
          <text x={getX(0.5)} y={height - 12} textAnchor="middle" fontSize="8" fill="#94a3b8">
            0.5
          </text>
          <text x={getX(1.0)} y={height - 12} textAnchor="middle" fontSize="8" fill="#94a3b8">
            1.0
          </text>
          <text x={getX(1.5)} y={height - 12} textAnchor="middle" fontSize="8" fill="#94a3b8">
            1.5
          </text>
        </svg>

        {/* Floating Legends */}
        <div className="absolute right-2 top-0 flex flex-col gap-0.5 text-[8px] scale-90 origin-top-right">
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-indigo-500 inline-block" />
            <span className="text-slate-500">已选步长 (Armijo充分下降)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
            <span className="text-slate-500">回溯试探点 (不满足下降)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 border-t border-amber-500 border-dashed inline-block" />
            <span className="text-slate-500">充分下降限界</span>
          </div>
        </div>
      </div>
    </div>
  );
};
