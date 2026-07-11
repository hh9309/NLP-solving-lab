import React, { useRef } from "react";
import { ObjectiveFunction, Constraint, IterationStep, Point } from "../types";
import { Copy, X, Printer, Download, BookOpen } from "lucide-react";

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  func: ObjectiveFunction;
  activeConstraints: Constraint[];
  trajectory: IterationStep[];
  algorithmName: string;
  tol: number;
  maxIter: number;
  scipyMethod: string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  func,
  activeConstraints,
  trajectory,
  algorithmName,
  tol,
  maxIter,
  scipyMethod,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const startPt = trajectory[0] || { x: 0, y: 0, fx: 0 };
  const endPt = trajectory[trajectory.length - 1] || { x: 0, y: 0, fx: 0 };
  const stepsCount = Math.max(0, trajectory.length - 1);

  // Generate simple residue list for plotting
  const residues = trajectory.map((step) => {
    const g = func.gradient(step.x, step.y);
    return Math.sqrt(g.x * g.x + g.y * g.y);
  });

  const finalResidue = residues[residues.length - 1] || 0;

  // Print handler
  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    if (printContent) {
      const windowPrint = window.open("", "", "width=900,height=650");
      if (windowPrint) {
        windowPrint.document.write(`
          <html>
            <head>
              <title>非线性规划优化报告 - ${func.name}</title>
              <style>
                body { font-family: Georgia, serif; color: #1e293b; padding: 40px; line-height: 1.6; }
                h1, h2, h3 { color: #065f46; font-family: sans-serif; font-weight: 600; }
                h1 { border-bottom: 2px solid #059669; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
                th { bg-color: #f1f5f9; }
                .meta { color: #64748b; font-size: 0.9em; margin-bottom: 30px; }
                .highlight { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
                pre { background-color: #0f172a; color: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 11px; overflow-x: auto; }
              </style>
            </head>
            <body>
              ${printContent}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                }
              </script>
            </body>
          </html>
        `);
        windowPrint.document.close();
      }
    }
  };

  // Generate raw python script for downloading
  const pythonScript = `import numpy as np
from scipy.optimize import minimize

# 目标函数: ${func.name}
def objective(x):
    return ${
      func.id === "rosenbrock"
        ? "(1 - x[0])**2 + 100 * (x[1] - x[0]**2)**2"
        : func.id === "booth"
        ? "(x[0] + 2*x[1] - 7)**2 + (2*x[0] + x[1] - 5)**2"
        : func.id === "beale"
        ? "(1.5 - x[0] + x[0]*x[1])**2 + (2.25 - x[0] + x[0]*x[1]**2)**2 + (2.625 - x[0] + x[0]*x[1]**3)**2"
        : "(x[0]**2 + x[1] - 11)**2 + (x[0] + x[1]**2 - 7)**2"
    }

# 约束条件
cons = []
${activeConstraints
  .map((c) => {
    if (c.id === "circle") return "cons.append({'type': 'ineq', 'fun': lambda x: 4 - (x[0]**2 + x[1]**2)})";
    if (c.id === "parabola") return "cons.append({'type': 'ineq', 'fun': lambda x: x[1] - x[0]**2 + 1})";
    if (c.id === "linear") return "cons.append({'type': 'ineq', 'fun': lambda x: 1.5 - (x[0] + x[1])})";
    return "";
  })
  .filter(Boolean)
  .join("\n")}

x0 = np.array([${startPt.x.toFixed(4)}, ${startPt.y.toFixed(4)}])
res = minimize(objective, x0, method='${scipyMethod}', constraints=cons, tol=${tol})

print("最优解 x*:", res.x)
print("最优目标值 f(x*):", res.fun)
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-stone-50/95 w-full max-w-3xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen className="text-emerald-700" size={18} />
            <h2 className="text-sm font-semibold text-slate-800">优化项目专业报告与数据导出</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-emerald-700 rounded-lg transition flex items-center gap-1.5 text-xs font-medium"
            >
              <Printer size={14} />
              <span>打印报告</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Report Content Panel */}
        <div className="flex-1 overflow-auto p-8 bg-white select-text" ref={printAreaRef}>
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            {/* Academic Title */}
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] text-emerald-800 tracking-wider font-semibold uppercase">
                Academic Optimization Research Report
              </span>
              <h1 className="text-xl font-serif text-slate-900 mt-1 font-medium leading-tight">
                非线性规划算法寻优收敛行为与 KKT 边界诊断报告
              </h1>
              <p className="text-xs text-slate-400 mt-1.5">
                评估时间: {new Date().toLocaleString("zh-CN")} · 试验算法: {algorithmName}
              </p>
            </div>

            {/* Core Summary Cards */}
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-400 font-medium">初始点位置 $x_0$</span>
                <p className="text-[13px] font-mono text-slate-800 font-bold mt-1">
                  ({startPt.x.toFixed(4)}, {startPt.y.toFixed(4)})
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 inline-block">f(x₀) = {startPt.fx.toFixed(4)}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-400 font-medium">极值收敛解 $x^*$</span>
                <p className="text-[13px] font-mono text-slate-800 font-bold mt-1">
                  ({endPt.x.toFixed(4)}, {endPt.y.toFixed(4)})
                </p>
                <span className="text-[10px] text-emerald-700 mt-0.5 inline-block">f(x*) = {endPt.fx.toFixed(6)}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-400 font-medium">迭代评估步数</span>
                <p className="text-[13px] font-mono text-slate-800 font-bold mt-1">{stepsCount} 步</p>
                <span className="text-[10px] text-slate-400 mt-0.5 inline-block">最终残差: {finalResidue.toExponential(3)}</span>
              </div>
            </div>

            {/* Problem definition & Constraints */}
            <div>
              <h3 className="text-xs font-semibold text-slate-800 mb-2 font-serif border-l-2 border-emerald-600 pl-2">
                一、数学模型定义
              </h3>
              <table className="w-full text-xs text-slate-600 border border-slate-100 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 border-b border-r border-slate-100 text-left font-medium text-slate-500">参数名</th>
                    <th className="p-2 border-b border-slate-100 text-left font-medium text-slate-500">数学公式与具体设置</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b border-r border-slate-100 font-medium text-slate-700">目标函数</td>
                    <td className="p-2 border-b border-slate-100 font-mono text-emerald-800">{func.formula}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-b border-r border-slate-100 font-medium text-slate-700">约束边界 conditions</td>
                    <td className="p-2 border-b border-slate-100 font-sans text-slate-600">
                      {activeConstraints.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {activeConstraints.map((c, i) => (
                            <span key={i} className="font-mono text-rose-800">
                              g_{i + 1}(x, y) = {c.formula}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "无（无约束优化问题）"
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Convergence Path and Residue Graph */}
            <div>
              <h3 className="text-xs font-semibold text-slate-800 mb-2 font-serif border-l-2 border-emerald-600 pl-2">
                二、残差收敛曲线评估（梯度一阶残差下降 $\\|\nabla f(x_k)\\| \to 0$）
              </h3>
              <div className="w-full h-36 border border-slate-100 bg-slate-50/50 rounded-xl p-4 flex items-center justify-center">
                {residues.length > 1 ? (
                  <svg className="w-full h-full" viewBox="0 0 500 120">
                    {/* Graph grid lines */}
                    <line x1="30" y1="10" x2="480" y2="10" stroke="#f1f5f9" />
                    <line x1="30" y1="60" x2="480" y2="60" stroke="#f1f5f9" />
                    <line x1="30" y1="105" x2="480" y2="105" stroke="#e2e8f0" />
                    <line x1="30" y1="10" x2="30" y2="105" stroke="#e2e8f0" />

                    {/* Plot Line */}
                    <polyline
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2"
                      points={residues
                        .map((res, i) => {
                          const px = 30 + (i / (residues.length - 1)) * 450;
                          // simple linear scale for visual representation (capping outliers)
                          const capped = Math.min(res, Math.max(...residues) * 0.8);
                          const py = 105 - (capped / (Math.max(...residues) || 1)) * 90;
                          return `${px},${py}`;
                        })
                        .join(" ")}
                    />

                    {/* Scatter points for highlights */}
                    {residues.map((res, i) => {
                      if (i % Math.max(1, Math.floor(residues.length / 10)) === 0 || i === residues.length - 1) {
                        const px = 30 + (i / (residues.length - 1)) * 450;
                        const capped = Math.min(res, Math.max(...residues) * 0.8);
                        const py = 105 - (capped / (Math.max(...residues) || 1)) * 90;
                        return (
                          <g key={i}>
                            <circle cx={px} cy={py} r="2.5" fill="#14b8a6" />
                            <text x={px} y={py - 6} fontSize="7" fill="#64748b" textAnchor="middle" className="font-mono">
                              k={i}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })}

                    <text x="480" y="115" fontSize="8" fill="#64748b" textAnchor="end" className="font-mono">
                      迭代次数 k
                    </text>
                    <text x="15" y="15" fontSize="8" fill="#64748b" textAnchor="middle" transform="rotate(-90 15 15)" className="font-mono">
                      梯度范数
                    </text>
                  </svg>
                ) : (
                  <div className="text-slate-400 italic text-xs">迭代点不足以绘制收敛曲线</div>
                )}
              </div>
            </div>

            {/* Python code block for paper reproduction */}
            <div>
              <h3 className="text-xs font-semibold text-slate-800 mb-2 font-serif border-l-2 border-emerald-600 pl-2">
                三、科学复现与 scipy 验证脚本
              </h3>
              <p className="text-[11px] text-slate-400 mb-1.5">
                此脚本生成于本地优化条件。您可直接在 Python 终端中复制、运行并与上述试验结果进行交互对照。
              </p>
              <pre>
                <code>{pythonScript}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 select-none">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-xs text-slate-600 rounded-xl hover:bg-slate-50 transition"
          >
            关闭窗口
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-1.5 font-medium"
          >
            <Download size={13} />
            <span>导出并下载 PDF/打印</span>
          </button>
        </div>
      </div>
    </div>
  );
};
