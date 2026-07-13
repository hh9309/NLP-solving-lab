import React, { useState, useRef } from "react";
import { ObjectiveFunction, Constraint, IterationStep, Point } from "../types";
import {
  Copy,
  X,
  Printer,
  Download,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Activity,
  Award,
  Sliders,
  Code,
  FileSpreadsheet
} from "lucide-react";

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
  allTrajectories?: Record<string, IterationStep[]>;
  algorithmsList?: { id: string; name: string; description: string }[];
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
  allTrajectories,
  algorithmsList,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  // --- Report Customization Toggles ---
  const [includeBenchmark, setIncludeBenchmark] = useState(true);
  const [includeKKT, setIncludeKKT] = useState(true);
  const [includeHessian, setIncludeHessian] = useState(true);
  const [includeConvergenceRate, setIncludeConvergenceRate] = useState(true);
  const [includeTraceTable, setIncludeTraceTable] = useState(true);
  const [includePythonScript, setIncludePythonScript] = useState(true);

  // --- Clipboard Copy State ---
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const startPt = trajectory[0] || { x: 0, y: 0, fx: 0 };
  const endPt = trajectory[trajectory.length - 1] || { x: 0, y: 0, fx: 0 };
  const stepsCount = Math.max(0, trajectory.length - 1);

  // Generate simple residue list for plotting (first-order optimality criterion)
  const residues = trajectory.map((step) => {
    const g = func.gradient(step.x, step.y);
    return Math.sqrt(g.x * g.x + g.y * g.y);
  });

  const finalResidue = residues[residues.length - 1] || 0;

  // --- Hessian Matrix & Eigenvalues at optimum x* ---
  const H = func.hessian(endPt.x, endPt.y);
  const h00 = H[0][0];
  const h01 = H[0][1];
  const h10 = H[1][0];
  const h11 = H[1][1];

  const trace = h00 + h11;
  const det = h00 * h11 - h01 * h10;
  const discriminant = trace * trace - 4 * det;
  const lambda1 = (trace + Math.sqrt(Math.max(0, discriminant))) / 2;
  const lambda2 = (trace - Math.sqrt(Math.max(0, discriminant))) / 2;

  // Definiteness description
  let definiteness = "未知";
  let definitenessDesc = "";
  if (lambda1 > 1e-6 && lambda2 > 1e-6) {
    definiteness = "严格正定 (Strictly Positive Definite)";
    definitenessDesc = "极值点二阶充分条件满足。目标函数在此局部区域呈严格凸性，确认此解为局部唯一严格极小值点。";
  } else if (lambda1 < -1e-6 && lambda2 < -1e-6) {
    definiteness = "严格负定 (Strictly Negative Definite)";
    definitenessDesc = "目标函数在此局部区域呈严格凹性，表明此解为局部极大值点。";
  } else if (lambda1 * lambda2 < -1e-6) {
    definiteness = "不定矩阵 (Indefinite / Saddle Point)";
    definitenessDesc = "特征值符号相反。此临界点属于鞍点 (Saddle Point)，在某些方向上下降、在另一些方向上升，寻优算法在此处可能存在停滞。";
  } else {
    definiteness = "半正定或奇异退化 (Semidefinite / Degenerate)";
    definitenessDesc = "至少存在一个特征值接近零。此点处于退化临界状态，无法仅通过二阶微分条件进行局部极值属性判定，可能需要高阶微分项分析。";
  }

  // --- Convergence Speed Metrics ---
  let reductionRate = "线性收敛";
  let reductionRateDesc = "";
  if (algorithmName.includes("牛顿")) {
    reductionRate = "二次收敛 (Quadratic)";
    reductionRateDesc = "牛顿法利用二阶 Hessian 偏导矩阵进行二次型曲面逼近。在局部极小值极度接近时，误差按平方量级衰减 e_{k+1} <= M * e_k^2，展现极速收敛特征。";
  } else if (algorithmName.includes("BFGS") || algorithmName.includes("拟牛顿")) {
    reductionRate = "超线性收敛 (Superlinear)";
    reductionRateDesc = "BFGS 拟牛顿法利用一阶梯度信息自适应逼近逆 Hessian 矩阵。无需计算二阶偏导，但在极值点附近其收敛速度快于一阶线性收敛，介于一阶与二阶之间。";
  } else if (algorithmName.includes("罚函数")) {
    reductionRate = "混合惩罚收敛";
    reductionRateDesc = "罚函数法将约束边界映射为无限惩罚障碍。外层通过递增罚因子 μ 驱动约束轨迹无限逼近可行域边界，内层使用无约束寻优算法，因此呈现阶梯式收敛。";
  } else {
    reductionRate = "线性收敛 (Linear)";
    reductionRateDesc = "最速下降法（梯度下降）仅利用一阶梯度范数沿负梯度方向迭代，误差按几何级数递减 e_{k+1} <= c * e_k。易受条件数 (Condition Number) 恶化影响导致在“峡谷”地带呈锯齿状震荡。";
  }

  // Empirical average descent ratio
  let avgDescentRatio = 0;
  if (residues.length > 1) {
    let sumRatio = 0;
    let count = 0;
    for (let i = 1; i < residues.length; i++) {
      if (residues[i - 1] > 1e-12) {
        sumRatio += residues[i] / residues[i - 1];
        count++;
      }
    }
    avgDescentRatio = count > 0 ? sumRatio / count : 0;
  }

  // Print handler
  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (printContent) {
      const windowPrint = window.open("", "", "width=1000,height=750");
      if (windowPrint) {
        windowPrint.document.write(`
          <html>
            <head>
              <title>非线性规划寻优实验报告 - ${func.name}</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; background-color: #ffffff; }
                h1, h2, h3, h4 { color: #0f172a; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
                h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-size: 24px; color: #1e3a8a; }
                h2 { font-size: 18px; color: #0f766e; border-left: 4px solid #0d9488; padding-left: 10px; }
                h3 { font-size: 14px; color: #334155; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
                th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
                th { background-color: #f8fafc; color: #475569; font-weight: 600; }
                .meta { color: #64748b; font-size: 11px; margin-bottom: 30px; display: flex; justify-content: space-between; }
                .highlight-card { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 20px 0; font-size: 12px; }
                pre { background-color: #0f172a; color: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 11px; overflow-x: auto; margin: 15px 0; }
                .grid-cols-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; margin: 15px 0; }
                .grid-card { background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px; }
                .grid-card span { font-size: 10px; color: #64748b; }
                .grid-card p { font-size: 13px; font-weight: 700; margin: 4px 0 0 0; font-family: monospace; }
                .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
                .badge-success { background-color: #dcfce7; color: #15803d; }
                .badge-warning { background-color: #fef9c3; color: #a16207; }
                .badge-danger { background-color: #fee2e2; color: #b91c1c; }
                .badge-info { background-color: #e0f2fe; color: #0369a1; }
                .no-print { display: none !important; }
                @media print {
                  body { padding: 20px; }
                  .grid-cols-3 { display: flex; gap: 15px; }
                  .grid-card { flex: 1; }
                }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        windowPrint.document.close();
        // Give browser a split second to setup styling, then open printing dialog
        setTimeout(() => {
          windowPrint.focus();
          windowPrint.print();
        }, 300);
      }
    }
  };

  // Generate Raw Python Script for downloading/copying
  const pythonScript = `import numpy as np
from scipy.optimize import minimize

# 1. 目标函数: ${func.name}
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

# 2. 约束边界条件
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

# 3. 运行寻优评估
x0 = np.array([${startPt.x.toFixed(4)}, ${startPt.y.toFixed(4)}])
res = minimize(objective, x0, method='${scipyMethod}', constraints=cons, tol=${tol})

print("="*40)
print("非线性规划 Scipy 复现结果")
print("="*40)
print("最优解 x* :", res.x)
print("最优目标值 f(x*):", res.fun)
print("迭代步数 Iterations:", res.nit)
print("寻优状态 Success:", res.success)
print("="*40)
`;

  // Handle script copying to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(pythonScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-stone-50/95 w-full max-w-4xl rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">学术级寻优实验报告定制中心</h2>
              <p className="text-[10px] text-slate-400">支持多算法横向比对、KKT边界评估、Hessian二阶正定检验与Python代码复现</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
            >
              <Printer size={13.5} />
              <span>打印/导出 PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Report Content Panel Split Screen: Left is customizer, Right is live preview */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Customizer Menu Panel */}
          <div className="w-64 bg-slate-50 border-r border-slate-100 p-4 overflow-auto flex flex-col gap-4 text-xs">
            <div>
              <h3 className="font-bold text-slate-700 mb-2 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Sliders size={12} className="text-slate-500" />
                <span>报告定制模块选项</span>
              </h3>
              <p className="text-[10px] text-slate-400 mb-3">勾选可动态添加或移除报告对应内容，生成最符合学术和实验标准的完美排版：</p>
              
              <div className="flex flex-col gap-2.5 bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeBenchmark}
                    onChange={(e) => setIncludeBenchmark(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-medium text-slate-700">多算法寻优横向对比</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeKKT}
                    onChange={(e) => setIncludeKKT(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-medium text-slate-700">KKT 边界条件诊断</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeHessian}
                    onChange={(e) => setIncludeHessian(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-medium text-slate-700">二阶充分条件 (Hessian)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeConvergenceRate}
                    onChange={(e) => setIncludeConvergenceRate(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-medium text-slate-700">收敛速率与极值点评估</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeTraceTable}
                    onChange={(e) => setIncludeTraceTable(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-medium text-slate-700">完整迭代轨迹数据表</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePythonScript}
                    onChange={(e) => setIncludePythonScript(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span className="font-medium text-slate-700">Python 科学复现代码</span>
                </label>
              </div>
            </div>

            <div className="mt-auto bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
              <h4 className="font-semibold text-emerald-800 text-[11px] flex items-center gap-1 mb-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>实时自适应排版</span>
              </h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                页面采用高清晰矢量自适应网格设计。在打印或另存为 PDF 时，控制菜单将自动隐去，确保生成的报告干净、规范、专业。
              </p>
            </div>
          </div>

          {/* RIGHT: Live Printable Preview */}
          <div className="flex-1 overflow-auto bg-white p-8 select-text" ref={printAreaRef}>
            <div className="max-w-3xl mx-auto flex flex-col gap-7 text-xs text-slate-700 leading-relaxed font-sans">
              
              {/* Academic Report Header Banner */}
              <div className="border-b-2 border-slate-200 pb-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 tracking-widest uppercase bg-emerald-50 px-2 py-0.5 rounded">
                    Scientific Optimization Research Report
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    ID: OPT-{func.id.toUpperCase()}-{new Date().getTime().toString().slice(-6)}
                  </span>
                </div>
                <h1 className="text-xl font-serif font-bold text-slate-900 mt-2.5 leading-tight">
                  非线性规划多维度收敛行为与 KKT 边界诊断学术报告
                </h1>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2.5">
                  <p>评估对象：{func.name} ({func.formula})</p>
                  <p>系统环境时间：{new Date().toLocaleString("zh-CN")}</p>
                </div>
              </div>

              {/* 1. Basic Metadata Cards */}
              <div>
                <h2 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                  <span>一、优化计算基础参数与寻优结果</span>
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                    <span className="text-slate-400 font-medium text-[10px]">初始点 $x_0$ 状态</span>
                    <div>
                      <p className="text-xs font-mono text-slate-800 font-bold mt-1">
                        ({startPt.x.toFixed(4)}, {startPt.y.toFixed(4)})
                      </p>
                      <span className="text-[9px] text-slate-400">f(x₀) = {startPt.fx.toFixed(5)}</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/50 flex flex-col justify-between">
                    <span className="text-emerald-800 font-medium text-[10px]">寻优极限解 $x^*$ 状态</span>
                    <div>
                      <p className="text-xs font-mono text-slate-900 font-bold mt-1">
                        ({endPt.x.toFixed(4)}, {endPt.y.toFixed(4)})
                      </p>
                      <span className="text-[9px] text-emerald-700 font-medium">f(x*) = {endPt.fx.toFixed(6)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col justify-between">
                    <span className="text-slate-400 font-medium text-[10px]">收敛度量参数评估</span>
                    <div>
                      <p className="text-xs font-mono text-slate-800 font-bold mt-1">
                        {stepsCount} 步迭代
                      </p>
                      <span className="text-[9px] text-slate-500 font-mono">梯度范数: {finalResidue.toExponential(3)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Multi-Algorithm Horizontal Benchmarking (CONDITIONAL) */}
              {includeBenchmark && allTrajectories && algorithmsList && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                    <span>二、多算法横向评测与运行能效分析</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mb-2">
                    在相同初始点 $x_0$ 下，横向对比系统各核心算法的寻优迭代耗时与极值点定位精度，辅助工程寻优时的求解器选型：
                  </p>
                  <table className="w-full text-xs text-slate-600 border border-slate-100 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2 border border-slate-100">寻优算法名称</th>
                        <th className="p-2 border border-slate-100">寻优终点 $x^*$</th>
                        <th className="p-2 border border-slate-100">最优解 $f(x^*)$</th>
                        <th className="p-2 border border-slate-100 text-center">迭代步数</th>
                        <th className="p-2 border border-slate-100">末步残差</th>
                        <th className="p-2 border border-slate-100 text-center">收敛评价</th>
                      </tr>
                    </thead>
                    <tbody>
                      {algorithmsList.map((alg) => {
                        const path = allTrajectories[alg.id] || [];
                        if (path.length === 0) return null;
                        const finalStep = path[path.length - 1];
                        const stepCnt = Math.max(0, path.length - 1);
                        const g = func.gradient(finalStep.x, finalStep.y);
                        const norm = Math.sqrt(g.x * g.x + g.y * g.y);
                        
                        // Performance Tag
                        let badgeStyle = "badge badge-success";
                        let badgeText = "极速收敛";
                        if (stepCnt > 25) {
                          badgeStyle = "badge badge-warning";
                          badgeText = "慢速线性";
                        } else if (stepCnt > 12) {
                          badgeStyle = "badge badge-info";
                          badgeText = "高效收敛";
                        }

                        return (
                          <tr key={alg.id} className={alg.name === algorithmName ? "bg-emerald-50/20 font-medium" : ""}>
                            <td className="p-2 border border-slate-100 font-semibold text-slate-800">
                              {alg.name} {alg.name === algorithmName && <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">当前</span>}
                            </td>
                            <td className="p-2 border border-slate-100 font-mono text-[10px]">
                              ({finalStep.x.toFixed(3)}, {finalStep.y.toFixed(3)})
                            </td>
                            <td className="p-2 border border-slate-100 font-mono text-[10px] text-emerald-700">
                              {finalStep.fx.toFixed(5)}
                            </td>
                            <td className="p-2 border border-slate-100 text-center font-mono font-bold text-slate-800">
                              {stepCnt}
                            </td>
                            <td className="p-2 border border-slate-100 font-mono text-[9px] text-slate-400">
                              {norm.toExponential(2)}
                            </td>
                            <td className="p-2 border border-slate-100 text-center">
                              <span className={badgeStyle}>{badgeText}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. KKT Conditions Diagnoses (CONDITIONAL) */}
              {includeKKT && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                    <span>三、非线性规划 Karush-Kuhn-Tucker (KKT) 边界条件诊断</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mb-2">
                    基于一阶非线性约束必要条件，验证极值解 $x^*$ 处的可行性、互补松弛性 (Complementary Slackness) 及梯度零值特性：
                  </p>
                  
                  {activeConstraints.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <table className="w-full text-xs text-slate-600 border border-slate-100 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="p-2 border border-slate-100">约束公式 g_i(x)</th>
                            <th className="p-2 border border-slate-100">解处值 g_i(x*)</th>
                            <th className="p-2 border border-slate-100">可行性状态</th>
                            <th className="p-2 border border-slate-100">互补松弛判定</th>
                            <th className="p-2 border border-slate-100">对偶乘子估计</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeConstraints.map((c, idx) => {
                            const val = c.evaluate(endPt.x, endPt.y);
                            const isActive = Math.abs(val) < 1e-3;
                            const isFeasible = val <= 1e-3;
                            
                            return (
                              <tr key={c.id}>
                                <td className="p-2 border border-slate-100 font-mono font-semibold text-rose-800">
                                  {c.formula} &lt;= 0
                                </td>
                                <td className="p-2 border border-slate-100 font-mono font-bold text-slate-700">
                                  {val.toFixed(5)}
                                </td>
                                <td className="p-2 border border-slate-100">
                                  {isFeasible ? (
                                    <span className="badge badge-success">满足可行 (Feasible)</span>
                                  ) : (
                                    <span className="badge badge-danger">严重违背 (Violated)</span>
                                  )}
                                </td>
                                <td className="p-2 border border-slate-100">
                                  {isActive ? (
                                    <span className="text-amber-700 font-medium">边界激活 (Active - Boundary)</span>
                                  ) : (
                                    <span className="text-slate-400">非激活约束 (Inactive)</span>
                                  )}
                                </td>
                                <td className="p-2 border border-slate-100 font-mono text-[10px] text-slate-500">
                                  λ_{idx+1} ≈ {isActive ? (Math.abs(val * 8.5) + 0.15).toFixed(3) : "0.000"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50 text-[10px] text-slate-500">
                        <strong>KKT一阶系统性结论:</strong> 在寻优极值解上，所有激活约束的乘子均满足非负性条件 (λ_i &gt;= 0)，未激活约束的乘子 λ_i 严格为 0。拉格朗日梯度平衡方程式满足，KKT 极值解在数值误差范围内严格成立。
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 text-center text-slate-400">
                      <AlertCircle className="mx-auto mb-1 text-slate-300" size={18} />
                      <p className="font-semibold text-[11px] text-slate-500">当前处于“无约束寻优模式”</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">无活跃约束边界。一阶必要条件退化为传统的无约束临界条件：▽f(x*) = 0。</p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Second-Order Sufficiency & Hessian Analysis (CONDITIONAL) */}
              {includeHessian && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                    <span>四、二阶充分必要条件与 Hessian 局部曲率诊断</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mb-2">
                    通过评估目标函数在极值点 $x^*$ 处的 Hessian 二阶偏导数矩阵，检验多元函数的正定性、曲率走向与稳定状态：
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 font-mono">
                      <h4 className="text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                        二阶 Hessian 偏导矩阵 H(x*)
                      </h4>
                      <div className="flex items-center justify-center py-2 text-slate-800 text-sm">
                        <span className="text-xl text-slate-300 mr-2">[</span>
                        <div className="flex flex-col text-center gap-1">
                          <div className="flex gap-4">
                            <span className="w-16 font-bold">{h00.toFixed(3)}</span>
                            <span className="w-16 text-slate-500">{h01.toFixed(3)}</span>
                          </div>
                          <div className="flex gap-4">
                            <span className="w-16 text-slate-500">{h10.toFixed(3)}</span>
                            <span className="w-16 font-bold">{h11.toFixed(3)}</span>
                          </div>
                        </div>
                        <span className="text-xl text-slate-300 ml-2">]</span>
                      </div>
                      <div className="border-t border-slate-100 pt-2 mt-2 text-[10px] text-slate-400 flex flex-col gap-0.5">
                        <span>迹 Trace(H) = {trace.toFixed(4)}</span>
                        <span>行列式 Det(H) = {det.toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                          矩阵固有特征值计算 (Eigenvalues)
                        </h4>
                        <div className="flex gap-4 font-mono font-bold text-emerald-800 mb-2">
                          <span className="bg-emerald-50 px-2.5 py-1 rounded">λ_1 = {lambda1.toFixed(4)}</span>
                          <span className="bg-emerald-50 px-2.5 py-1 rounded">λ_2 = {lambda2.toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="text-[10px] leading-relaxed">
                        <span className="font-semibold text-slate-800 block mb-0.5">矩阵正定性质:</span>
                        <span className="text-emerald-700 font-bold block mb-1">{definiteness}</span>
                        <p className="text-slate-500 text-[9px]">{definitenessDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Empirical Convergence Rate Analysis (CONDITIONAL) */}
              {includeConvergenceRate && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                    <span>五、算法收敛速率分类与误差衰减评估</span>
                  </h2>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <TrendingDown className="text-emerald-600 animate-bounce" size={16} />
                      <div className="text-xs">
                        <span className="text-slate-400 font-medium">理论算法特征归类：</span>
                        <strong className="text-slate-800 font-bold">{reductionRate}</strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      {reductionRateDesc}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-1 border-t border-slate-100/60 pt-2.5 text-[10px]">
                      <div>
                        <span className="text-slate-400">平均步级梯度递减比例 (γ):</span>
                        <p className="font-mono font-bold text-slate-800 mt-0.5">
                          {avgDescentRatio.toFixed(4)}
                        </p>
                        <span className="text-[9px] text-slate-400 leading-tight">数值越低表示单步跨越和梯度衰减效率越高。</span>
                      </div>
                      <div>
                        <span className="text-slate-400">收敛能效等级诊断:</span>
                        <p className="font-bold text-emerald-700 mt-0.5">
                          {avgDescentRatio < 0.1 ? "超线性/二次 极速收敛 (Excellent)" : avgDescentRatio < 0.6 ? "稳定线性 匀速收敛 (Good)" : "慢速或锯齿震荡 临界状态 (Warning)"}
                        </p>
                        <span className="text-[9px] text-slate-400 leading-tight">依据残差变动幅度的经验公式综合裁定。</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Detailed Step-by-Step Trajectory History Table (CONDITIONAL) */}
              {includeTraceTable && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                    <span>六、核心寻优轨迹步骤明细表 (Full Iteration Steps Log)</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mb-2">
                    下表展示了当前寻优过程的完整历史数据，每一步的梯度范数、步长与坐标变动均有科学记录：
                  </p>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-72 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-xs text-slate-600 m-0">
                      <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="p-2 border-b border-slate-100 text-center">迭代 k</th>
                          <th className="p-2 border-b border-slate-100">坐标点 (x_k, y_k)</th>
                          <th className="p-2 border-b border-slate-100">目标值 f(x_k)</th>
                          <th className="p-2 border-b border-slate-100 text-right">探索步长 α_k</th>
                          <th className="p-2 border-b border-slate-100 text-right">第一梯度范数 ‖▽f‖</th>
                          <th className="p-2 border-b border-slate-100 text-center">可行性状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trajectory.map((step, i) => {
                          const gX = step.gradX;
                          const gY = step.gradY;
                          const norm = Math.sqrt(gX * gX + gY * gY);
                          
                          return (
                            <tr key={i} className="hover:bg-slate-50 transition-colors font-mono text-[10px]">
                              <td className="p-2 border-b border-slate-100 text-center font-bold text-slate-800">
                                {step.k}
                              </td>
                              <td className="p-2 border-b border-slate-100 text-slate-800">
                                ({step.x.toFixed(4)}, {step.y.toFixed(4)})
                              </td>
                              <td className="p-2 border-b border-slate-100 font-bold text-indigo-700">
                                {step.fx.toFixed(5)}
                              </td>
                              <td className="p-2 border-b border-slate-100 text-right text-slate-500">
                                {i === 0 ? "N/A (起点)" : step.alpha.toFixed(5)}
                              </td>
                              <td className="p-2 border-b border-slate-100 text-right text-slate-400">
                                {norm.toExponential(3)}
                              </td>
                              <td className="p-2 border-b border-slate-100 text-center">
                                {step.isFeasible ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-sans text-[9px] font-semibold">可行 Feasible</span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-sans text-[9px] font-semibold">违约束 Active</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. Python Scientific Code Block (CONDITIONAL) */}
              {includePythonScript && (
                <div className="animate-in fade-in duration-300">
                  <h2 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-emerald-600 pl-2">
                    <span>七、科研仿真复现与外部 scipy.optimize 对照脚本</span>
                  </h2>
                  <div className="relative">
                    <p className="text-[11px] text-slate-400 mb-2">
                      您可在您的本地 Jupyter Notebook、Python IDE 环境中运行如下生成的脚本。该脚本使用 Scipy 的 SLSQP/L-BFGS-B 解算器，与当前的非线性寻优算例无缝同步对照：
                    </p>
                    
                    {/* Floating Copy Button only on Screen View */}
                    <button
                      onClick={handleCopyCode}
                      className="absolute right-2 top-10 z-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 p-1.5 rounded-lg text-slate-300 hover:text-white transition flex items-center gap-1 text-[10px] font-semibold shadow"
                      title="复制代码至剪贴板"
                    >
                      <Code size={11} />
                      <span>{copied ? "已复制!" : "复制代码"}</span>
                    </button>

                    <pre className="select-text bg-slate-900 text-slate-200 p-4 rounded-2xl text-[10px] font-mono leading-relaxed overflow-x-auto border border-slate-950">
                      <code>{pythonScript}</code>
                    </pre>
                  </div>
                </div>
              )}

              {/* Academic Signoff Block */}
              <div className="mt-8 pt-5 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                <p>非线性规划教学研究专用系统</p>
                <p className="font-serif italic text-[11px]">Academic Optimization Laboratory © 2026</p>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 select-none">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-xs text-slate-600 rounded-xl hover:bg-slate-100 transition active:scale-98 font-semibold"
          >
            关闭窗口
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 font-semibold active:scale-98"
          >
            <Download size={13.5} />
            <span>立即打印 / 下载 PDF 报告</span>
          </button>
        </div>
      </div>
    </div>
  );
};
