import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { GitBranch, Info, AlertCircle, HelpCircle, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// Initialize mermaid once globally with clean style settings
mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  themeVariables: {
    primaryColor: "#f8fafc",
    primaryTextColor: "#334155",
    primaryBorderColor: "#e2e8f0",
    lineColor: "#94a3b8",
    secondaryColor: "#f1f5f9",
    tertiaryColor: "#f8fafc",
  },
  securityLevel: "loose",
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    nodeSpacing: 85,
    rankSpacing: 55,
  },
});

interface AlgorithmMermaidFlowchartProps {
  algId: string;
  algName: string;
  activeLineNum: number;
  clickedLineNums: Record<number, boolean>;
}

export const AlgorithmMermaidFlowchart: React.FC<AlgorithmMermaidFlowchartProps> = ({
  algId,
  algName,
  activeLineNum,
  clickedLineNums,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svgCode, setSvgCode] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);

  // Derive highlighted lines (both active and clicked)
  const highlightedLines = new Set<number>();
  if (activeLineNum !== undefined) {
    highlightedLines.add(activeLineNum);
  }
  Object.entries(clickedLineNums).forEach(([numStr, clicked]) => {
    if (clicked) {
      highlightedLines.add(parseInt(numStr, 10));
    }
  });

  // Build the nodes to highlight in Mermaid
  const activeNodes: string[] = [];
  if (algId === "gd") {
    if (highlightedLines.has(1)) activeNodes.push("Line1");
    if (highlightedLines.has(2)) activeNodes.push("Line2");
    if (highlightedLines.has(3)) activeNodes.push("Line3");
    if (highlightedLines.has(4)) activeNodes.push("Line4", "End");
  } else if (algId === "newton") {
    if (highlightedLines.has(1)) activeNodes.push("Line1");
    if (highlightedLines.has(2)) activeNodes.push("Line2");
    if (highlightedLines.has(3)) activeNodes.push("Line3", "Line3_1");
    if (highlightedLines.has(4)) activeNodes.push("Line4", "Check");
  } else if (algId === "bfgs") {
    if (highlightedLines.has(1)) activeNodes.push("Line1");
    if (highlightedLines.has(2)) activeNodes.push("Line2");
    if (highlightedLines.has(3)) activeNodes.push("Line3");
    if (highlightedLines.has(4)) activeNodes.push("Line4", "Check");
  } else if (algId === "penalty") {
    if (highlightedLines.has(1)) activeNodes.push("Line1");
    if (highlightedLines.has(2)) activeNodes.push("Line2");
    if (highlightedLines.has(3)) activeNodes.push("Line3");
    if (highlightedLines.has(4)) activeNodes.push("Line4", "End");
  }

  // Generate Mermaid Diagram source based on selected Algorithm
  const getMermaidChart = () => {
    let diagram = "";

    const classDef = `
  classDef default fill:#f8fafc,stroke:#e2e8f0,stroke-width:1.5px,color:#475569,font-size:10px,font-family:sans-serif;
  classDef active fill:#e0e7ff,stroke:#6366f1,stroke-width:2.5px,color:#1e1b4b,font-weight:bold,font-size:10.5px;
    `;

    const activeClassApply = activeNodes.length > 0 ? `  class ${activeNodes.join(",")} active;` : "";

    if (algId === "gd") {
      diagram = `
flowchart LR
  Start([开始优化流程]) --> Line1[1: 计算负梯度方向 d_k = -∇f]
  Line1 --> Line2[2: 线搜索确定最佳步长 α_k]
  Line2 --> Line3[3: 更新位置 x_next = x + α_k * d_k]
  Line3 --> Line4{4: 检验收敛 ‖∇f‖ < tol?}
  Line4 -- 否 (未收敛) --> Line1
  Line4 -- 是 (已收敛) --> End([迭代收敛，结束])

  ${classDef}
  ${activeClassApply}
      `;
    } else if (algId === "newton") {
      diagram = `
flowchart LR
  Start([开始优化流程]) --> Line1[1: 计算梯度 g_k 与 Hessian H_k]
  Line1 --> Line2[2: 求解牛顿方程 H_k * d_k = -g_k]
  Line2 --> Line3_Check{Hessian 是否正定?}
  Line3_Check -- 否 --> Line3_1[3: 正则化修正 H_k' = H_k + εI]
  Line3_Check -- 是 --> Line3[3: 保持原始二阶曲面率]
  Line3_1 --> Line4[4: 线搜索确定步长 α_k 并更新状态]
  Line3 --> Line4
  Line4 --> Check{收敛性校验: ‖∇f‖ < tol?}
  Check -- 否 --> Line1
  Check -- 是 --> End([迭代收敛，结束])

  ${classDef}
  ${activeClassApply}
      `;
    } else if (algId === "bfgs") {
      diagram = `
flowchart LR
  Start([开始优化流程]) --> Line1[1: 计算拟牛顿方向 d_k = -B_k * ∇f]
  Line1 --> Line2[2: Armijo 回溯线搜索 确定步长并更新]
  Line2 --> Line3[3: 计算变位 s_k = Δx 与 变度 y_k = Δg]
  Line3 --> Line4[4: BFGS 公式滚动更新逆 Hessian B_next]
  Line4 --> Check{收敛性校验: ‖∇f‖ < tol?}
  Check -- 否 --> Line1
  Check -- 是 --> End([迭代收敛，结束])

  ${classDef}
  ${activeClassApply}
      `;
    } else if (algId === "penalty") {
      diagram = `
flowchart LR
  Start([外层罚函数循环]) --> Line1[1: 构造罚函数 F(x, y) = f(x) + μ * Σ max(0, g_i(x))^2]
  Line1 --> Line2[2: 求解无约束子问题 x_k = argmin F(x, μ_k)]
  Line2 --> Line3[3: 递增外层罚因子 μ_next = ρ * μ_k]
  Line3 --> Line4{4: 是否满足约束容差与收敛条件?}
  Line4 -- 否 (逐步增加惩罚力度) --> Line1
  Line4 -- 是 (进入可行域边界) --> End([迭代收敛，结束])

  ${classDef}
  ${activeClassApply}
      `;
    } else {
      diagram = `
flowchart LR
  Start([开始优化流程]) --> Step[算法核心迭代]
  Step --> End([优化完成])
  ${classDef}
      `;
    }

    return diagram.trim();
  };

  const chart = getMermaidChart();

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!chart) return;
      try {
        setRenderError(null);
        // Clean out any stale container content if needed
        const uniqueId = `mermaid-chart-svg-${algId}-${Math.floor(Math.random() * 100000)}`;
        const { svg } = await mermaid.render(uniqueId, chart);
        if (isMounted) {
          setSvgCode(svg);
        }
      } catch (err: any) {
        console.error("Mermaid Render Error:", err);
        if (isMounted) {
          setRenderError(err.message || "流程图渲染异常，正在重新载入...");
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart, algId]);

  return (
    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 font-sans w-full flex-1">
      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
        <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <GitBranch size={14} className="text-indigo-600" />
          <span>算法决策与状态转移流程图</span>
        </h3>
        
        {/* Zoom controls + algorithm name indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100/80 border border-slate-200/50 rounded-lg p-0.5 text-slate-500 shadow-xs">
            <button
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))}
              title="缩小 (Zoom Out)"
              className="p-1 hover:bg-white hover:text-indigo-600 rounded transition active:scale-95"
            >
              <ZoomOut size={11} />
            </button>
            <span className="text-[9px] font-mono font-bold text-slate-600 px-1 min-w-[28px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}
              title="放大 (Zoom In)"
              className="p-1 hover:bg-white hover:text-indigo-600 rounded transition active:scale-95"
            >
              <ZoomIn size={11} />
            </button>
            <div className="w-px h-3.5 bg-slate-200 mx-1" />
            <button
              onClick={() => setZoom(1.0)}
              title="恢复 100% (Reset)"
              className="p-1 hover:bg-white hover:text-indigo-600 rounded transition active:scale-95"
            >
              <Maximize2 size={11} />
            </button>
          </div>
          <span className="text-[10px] bg-indigo-50/70 text-indigo-700 font-semibold px-2 py-0.5 rounded-lg border border-indigo-100/40">
            {algName}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-1.5 p-2 bg-slate-50/50 border border-slate-100/50 rounded-xl text-[10px] text-slate-500 leading-relaxed">
        <Info size={12} className="text-indigo-500 shrink-0 mt-0.5" />
        <span>
          <strong>动态交互提示：</strong>流程图中的高亮节点实时对应当前的计算状态。您也可以直接<strong>点击左侧伪代码行</strong>来手动展开详细解释并同步高亮下方的流程节点。
        </span>
      </div>

      <div
        ref={containerRef}
        className="w-full flex-1 bg-slate-50/30 rounded-xl border border-slate-100/30 min-h-[140px] relative overflow-auto scrollbar-thin transition-all flex items-center justify-center p-3"
      >
        {renderError ? (
          <div className="flex flex-col items-center gap-1.5 text-rose-500 max-w-xs text-center py-6">
            <AlertCircle size={16} />
            <span className="text-[10px] font-medium leading-normal">{renderError}</span>
          </div>
        ) : svgCode ? (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
            }}
            className="w-full flex justify-center [&>svg]:max-w-none [&>svg]:h-auto transition-opacity duration-300 animate-in fade-in"
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 py-6">
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
            <span className="text-[10px]">绘制流程结构中...</span>
          </div>
        )}
      </div>
    </div>
  );
};
