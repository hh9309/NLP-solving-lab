import React, { useState, useEffect } from "react";
import * as math from "mathjs";
import { Point, ObjectiveFunction } from "../types";
import { Sparkles, HelpCircle, AlertCircle, CheckCircle2, RefreshCw, Layers } from "lucide-react";

interface DynamicFunctionSandboxProps {
  onLoadCustomFunction: (func: ObjectiveFunction) => void;
  currentSelectedFuncId: string;
}

export const DynamicFunctionSandbox: React.FC<DynamicFunctionSandboxProps> = ({
  onLoadCustomFunction,
  currentSelectedFuncId,
}) => {
  const [formulaInput, setFormulaInput] = useState<string>("sin(x) * cos(y) + 0.1 * (x^2 + y^2)");
  const [boundsInput, setBoundsInput] = useState({
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
  });
  const [defaultStart, setDefaultStart] = useState<Point>({ x: -2.5, y: 2.5 });

  const [parseError, setParseError] = useState<string | null>(null);
  const [symbolicGrad, setSymbolicGrad] = useState<{ dx: string; dy: string } | null>(null);
  const [symbolicHessian, setSymbolicHessian] = useState<{ dxx: string; dxy: string; dyy: string } | null>(null);
  const [isApplied, setIsApplied] = useState<boolean>(false);

  // Quick preset templates
  const presets = [
    {
      name: "波动鞍曲面",
      formula: "sin(x) * cos(y) + 0.1 * (x^2 + y^2)",
      bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
      start: { x: -3.0, y: 3.0 },
    },
    {
      name: "非对称双阱",
      formula: "x^4 - 2 * x^2 + y^2 + 0.5 * x * y",
      bounds: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
      start: { x: 1.8, y: -1.8 },
    },
    {
      name: "轻度谷底",
      formula: "0.2 * (x^2 - y)^2 + 0.5 * (x - 1)^2",
      bounds: { xMin: -3, xMax: 3, yMin: -1, yMax: 5 },
      start: { x: -2.0, y: 4.0 },
    },
  ];

  // Symbolically differentiate and compile formula
  const validateAndParse = (expression: string) => {
    try {
      setParseError(null);
      // Try to parse the expression
      const node = math.parse(expression);
      
      // Try symbolic derivative
      const derivativeX = math.derivative(node, "x");
      const derivativeY = math.derivative(node, "y");

      const derivativeXX = math.derivative(derivativeX, "x");
      const derivativeXY = math.derivative(derivativeX, "y");
      const derivativeYY = math.derivative(derivativeY, "y");

      // Verify that compiling works
      node.compile();
      derivativeX.compile();
      derivativeY.compile();
      derivativeXX.compile();
      derivativeXY.compile();
      derivativeYY.compile();

      setSymbolicGrad({
        dx: derivativeX.toString(),
        dy: derivativeY.toString(),
      });

      setSymbolicHessian({
        dxx: derivativeXX.toString(),
        dxy: derivativeXY.toString(),
        dyy: derivativeYY.toString(),
      });

      return true;
    } catch (err: any) {
      setParseError(err.message || "无法解析公式，请检查语法 (例如乘号 * 是否漏写)");
      setSymbolicGrad(null);
      setSymbolicHessian(null);
      return false;
    }
  };

  useEffect(() => {
    validateAndParse(formulaInput);
    setIsApplied(false);
  }, [formulaInput]);

  const handleApply = () => {
    const isValid = validateAndParse(formulaInput);
    if (!isValid) return;

    try {
      const node = math.parse(formulaInput);
      const compiledF = node.compile();

      const derivativeX = math.derivative(node, "x");
      const derivativeY = math.derivative(node, "y");
      const compiledDx = derivativeX.compile();
      const compiledDy = derivativeY.compile();

      const derivativeXX = math.derivative(derivativeX, "x");
      const derivativeXY = math.derivative(derivativeX, "y");
      const derivativeYY = math.derivative(derivativeY, "y");
      const compiledDxx = derivativeXX.compile();
      const compiledDxy = derivativeXY.compile();
      const compiledDyy = derivativeYY.compile();

      const customFunc: ObjectiveFunction = {
        id: "custom",
        name: "✨ 自定义数学沙盒函数",
        formula: formulaInput,
        evaluate: (x: number, y: number) => {
          try {
            const val = compiledF.evaluate({ x, y });
            if (typeof val !== "number" || isNaN(val)) return 0;
            return val;
          } catch {
            return 0;
          }
        },
        gradient: (x: number, y: number) => {
          try {
            return {
              x: compiledDx.evaluate({ x, y }),
              y: compiledDy.evaluate({ x, y }),
            };
          } catch {
            return { x: 0, y: 0 };
          }
        },
        hessian: (x: number, y: number) => {
          try {
            const dxx = compiledDxx.evaluate({ x, y });
            const dxy = compiledDxy.evaluate({ x, y });
            const dyy = compiledDyy.evaluate({ x, y });
            return [
              [dxx, dxy],
              [dxy, dyy],
            ];
          } catch {
            return [
              [0, 0],
              [0, 0],
            ];
          }
        },
        defaultStart: { ...defaultStart },
        bounds: { ...boundsInput },
      };

      onLoadCustomFunction(customFunc);
      setIsApplied(true);
    } catch (err: any) {
      setParseError("运行评估失败: " + (err.message || "未知错误"));
    }
  };

  const applyPreset = (p: typeof presets[0]) => {
    setFormulaInput(p.formula);
    setBoundsInput(p.bounds);
    setDefaultStart(p.start);
    setIsApplied(false);
  };

  const isCurrentActive = currentSelectedFuncId === "custom";

  return (
    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <Layers size={14} className="text-indigo-600 animate-pulse" />
          <span>自定义公式沙盒 (Dynamic Sandbox)</span>
        </h3>
        {isCurrentActive && (
          <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100 animate-pulse">
            当前激活中
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {/* Presets Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[10px] text-slate-400 font-medium shrink-0">快捷模板:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-0.5 hover:bg-indigo-50/50 hover:border-indigo-100/60 hover:text-indigo-700 transition shrink-0"
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Math Expression Input */}
        <div>
          <label className="block text-[10px] text-slate-500 font-medium mb-1">
            定义目标函数 f(x, y) =
          </label>
          <div className="relative">
            <input
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              placeholder="请输入数学公式, e.g. x^2 + 2*y^2"
              className={`w-full bg-slate-50/50 border rounded-xl pl-3 pr-8 py-2 text-xs font-mono text-slate-700 outline-none transition focus:bg-white ${
                parseError
                  ? "border-rose-200 focus:border-rose-400"
                  : isApplied && isCurrentActive
                  ? "border-emerald-200 focus:border-emerald-400"
                  : "border-slate-100 focus:border-indigo-200"
              }`}
            />
            <div className="absolute right-2 top-2.5 text-slate-300">
              <Sparkles size={12} className={parseError ? "" : "text-indigo-500 animate-spin-slow"} />
            </div>
          </div>
        </div>

        {/* Bounds & Default Start Config */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-slate-400 font-medium block mb-1">二阶曲面渲染范围 (Bounds)</span>
            <div className="grid grid-cols-2 gap-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100 font-mono">
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-slate-400">X_min:</span>
                <input
                  type="number"
                  value={boundsInput.xMin}
                  onChange={(e) =>
                    setBoundsInput((prev) => ({ ...prev, xMin: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-white border border-slate-200 rounded text-center py-0.5 text-slate-600 outline-none"
                />
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-[9px] text-slate-400">X_max:</span>
                <input
                  type="number"
                  value={boundsInput.xMax}
                  onChange={(e) =>
                    setBoundsInput((prev) => ({ ...prev, xMax: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-white border border-slate-200 rounded text-center py-0.5 text-slate-600 outline-none"
                />
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <span className="text-[9px] text-slate-400">Y_min:</span>
                <input
                  type="number"
                  value={boundsInput.yMin}
                  onChange={(e) =>
                    setBoundsInput((prev) => ({ ...prev, yMin: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-white border border-slate-200 rounded text-center py-0.5 text-slate-600 outline-none"
                />
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <span className="text-[9px] text-slate-400">Y_max:</span>
                <input
                  type="number"
                  value={boundsInput.yMax}
                  onChange={(e) =>
                    setBoundsInput((prev) => ({ ...prev, yMax: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-white border border-slate-200 rounded text-center py-0.5 text-slate-600 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-medium block mb-1">自定义默认起点 (Start Point)</span>
            <div className="flex flex-col gap-1.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100 font-mono h-[52px] justify-center">
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400">X₀:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={defaultStart.x}
                    onChange={(e) =>
                      setDefaultStart((prev) => ({ ...prev, x: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-slate-600 outline-none"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400">Y₀:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={defaultStart.y}
                    onChange={(e) =>
                      setDefaultStart((prev) => ({ ...prev, y: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-12 bg-white border border-slate-200 rounded text-center py-0.5 text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation and Symbolic differentiation preview */}
        {parseError ? (
          <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-1.5 text-[10px] text-rose-800 animate-in fade-in duration-200">
            <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        ) : (
          symbolicGrad && (
            <div className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl flex flex-col gap-1 text-[10px] text-slate-600 font-mono animate-in fade-in duration-200">
              <div className="flex items-center gap-1 text-[9px] font-sans text-indigo-700 font-bold uppercase tracking-wider border-b border-slate-100 pb-1 mb-1">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span>符号微分引擎解析成功 (Symbolic Derivatives)</span>
              </div>
              <div className="truncate" title={`df/dx = ${symbolicGrad.dx}`}>
                <span className="text-indigo-600 font-semibold">∂f/∂x =</span> {symbolicGrad.dx}
              </div>
              <div className="truncate" title={`df/dy = ${symbolicGrad.dy}`}>
                <span className="text-indigo-600 font-semibold">∂f/∂y =</span> {symbolicGrad.dy}
              </div>
              <div className="truncate text-slate-400 mt-0.5 pt-0.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-sans">
                <span>Hessian 矩阵将实时自动求值。</span>
                <span className="text-indigo-500 font-medium">支持阻尼牛顿与拟牛顿法</span>
              </div>
            </div>
          )
        )}

        {/* Action Button */}
        <button
          onClick={handleApply}
          disabled={!!parseError}
          className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
            parseError
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              : isApplied && isCurrentActive
              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
              : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          <RefreshCw size={12} className={isCurrentActive ? "animate-spin" : ""} />
          <span>{isApplied && isCurrentActive ? "公式已应用到三维曲面中" : "解析并加载到三维曲面"}</span>
        </button>
      </div>
    </div>
  );
};
