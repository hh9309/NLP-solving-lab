import React, { useState, useEffect, useRef } from "react";
import { ObjectiveFunction, Constraint, IterationStep } from "../types";
import { getEigenvalues } from "../algorithms";
import { 
  X, BookOpen, Brain, Sparkles, Compass, HelpCircle, 
  ChevronRight, CheckCircle2, AlertCircle, Cpu, ShieldAlert,
  Dna, Flame, FileText, Info, Settings, Send, Trash, Eye, EyeOff, Bot, User, MessageSquare
} from "lucide-react";
import { getLLMConfig, saveLLMConfig, callLLM, ChatMessage } from "../lib/llm";

// ==========================================
// 1. KNOWLEDGE GUIDE MODAL (知识导引)
// ==========================================
interface KnowledgeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  func: ObjectiveFunction;
  activeConstraints: Constraint[];
}

export const KnowledgeGuideModal: React.FC<KnowledgeGuideModalProps> = ({
  isOpen,
  onClose,
  func,
  activeConstraints,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"basics" | "algorithms" | "kkt">("basics");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100/80">
          <div className="flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={18} />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">非线性规划知识导引</h2>
              <p className="text-[10px] text-slate-400">Nonlinear Programming Guide & Mathematical Foundations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dynamic Segment Buttons */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1">
          <button
            onClick={() => setActiveSubTab("basics")}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition ${
              activeSubTab === "basics"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            }`}
          >
            1. 非线性规划基础理论
          </button>
          <button
            onClick={() => setActiveSubTab("algorithms")}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition ${
              activeSubTab === "algorithms"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            }`}
          >
            2. 寻优算法对比与公式
          </button>
          <button
            onClick={() => setActiveSubTab("kkt")}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition ${
              activeSubTab === "kkt"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-100/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            }`}
          >
            3. KKT约束条件与影子价格
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 select-text">
          {activeSubTab === "basics" && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/30">
                <h4 className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5 mb-1.5">
                  <Flame size={13} className="text-indigo-600" />
                  数学模型定义
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  非线性规划 (Nonlinear Programming, NLP) 研究在有一组约束下，如何寻找一个或多个变量的非线性目标函数的极值点。数学形式通常表示为：
                </p>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] my-2 text-center shadow-inner">
                  min f(x) <br />
                  s.t. &nbsp; g_i(x) ≤ 0, &nbsp; i = 1, ..., m <br />
                  h_j(x) = 0, &nbsp; j = 1, ..., p
                </div>
                <p className="text-[11px] text-slate-400">
                  其中，f(x) 为非线性目标函数，g_i(x) 为不等式约束，h_j(x) 为等式约束。本系统重点展示二维决策变量下的全局与局部最优搜索演进。
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-800 mb-2">经典测试函数说明</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Bowl 经典抛物面</span>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      数学表达式为 $z = x^2 + y^2$。一个对称、圆润的纯凸函数。等高线是完美的同心圆，任何优化算法从此区域释放都会笔直、无阻碍地收敛到唯一的全局极小值 $z = 0$ 处 $(0,0)$。
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Pyramid 尖峰锥形面</span>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      数学表达式为 $z = |x| + |y|$。倒四棱锥。四周梯度为常数，但在中心 $(0,0)$ 处不可导。用来演示传统梯度法在尖底如何反复震荡跨越。
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Maron 倾斜单峰槽</span>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      数学表达式为 $z = x^2 + xy + y^2$。一个倾斜了 45 度的椭圆状山谷。展示交叉项（$xy$）对优化的影响，需要斜着向下追踪。
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Rosenbrock 罗森布罗克</span>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      常被称为"香蕉函数"。其极小值位于一个狭窄、弯曲的抛物线山谷中。寻找山谷方向较为容易，但要在山谷中收敛到全局最优点极其困难，极度考验二阶牛顿及拟牛顿法的收敛效率。
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Himmelblau 希梅尔布劳</span>
                    <p className="text-[11px] text-slate-600 mt-1.5">
                      一个经典的多峰测试函数。它拥有 <strong>4 个完全相同的全局极小值点</strong>。根据初始选择点 $x_0$ 的微小偏差，算法将分流收敛到不同的局部漏斗，完美演示了非凸空间的多局域收敛。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "algorithms" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-indigo-900">1. 最速下降法 / 梯度下降 (Gradient Descent)</span>
                    <span className="text-[9px] text-slate-400 font-mono">一阶收敛 / 线性</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal mb-1.5">
                    沿着负梯度方向 $- \nabla f(x)$ 进行搜索。对于病态函数（如 Rosenbrock）极易在狭窄的山谷两侧产生"锯齿效应"（Zig-zagging），效率极低。
                  </p>
                  <div className="bg-slate-900/90 text-slate-100 p-2 rounded-lg font-mono text-[10px] text-center">
                    x_(k+1) = x_k - α_k * ∇f(x_k)
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-indigo-900">2. 经典牛顿法 (Newton's Method)</span>
                    <span className="text-[9px] text-amber-600 font-mono">二阶收敛 / 平方收敛</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal mb-1.5">
                    利用二阶泰勒展开，在局部用二次曲面逼近。搜索方向结合了黑塞矩阵（Hessian）的逆：$d = -H^{-1} \nabla f$。在最优点附近具有极快的平方收敛速度，但远离最优点时，若 Hessian 不正定，可能会发散或走向鞍点。
                  </p>
                  <div className="bg-slate-900/90 text-slate-100 p-2 rounded-lg font-mono text-[10px] text-center">
                    x_(k+1) = x_k - [∇²f(x_k)]⁻¹ * ∇f(x_k)
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-indigo-900">3. 拟牛顿 BFGS 算法 (Quasi-Newton BFGS)</span>
                    <span className="text-[9px] text-emerald-600 font-mono">超线性收敛</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal mb-1.5">
                    无需计算黑塞矩阵的逆。通过每次迭代中梯度和坐标的变化量，动态构造一个正定对称矩阵 $B_k$ 逐步逼近 Hessian，既省去了二阶导数计算，又保持了超线性的收敛优势。
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === "kkt" && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/30 text-xs">
                <h4 className="font-semibold text-emerald-900 flex items-center gap-1.5 mb-1.5">
                  <Compass size={13} className="text-emerald-700" />
                  KKT (Karush-Kuhn-Tucker) 条件精讲
                </h4>
                <p className="text-slate-600 leading-relaxed mb-2">
                  KKT条件是非线性规划问题最优解的核心一阶必要条件。对于含不等式约束 $g_i(x) \le 0$ 的问题，最优解 $x^*$ 处必存在乘子 $\lambda_i \ge 0$ 满足以下方程组：
                </p>
                
                <div className="grid grid-cols-2 gap-2 font-mono text-[10.5px] text-slate-800 my-2">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">1. 定常条件 (Stationarity)</span>
                    ∇f(x*) + Σ λ_i * ∇g_i(x*) = 0
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">2. 互补松弛性 (Complementary Slackness)</span>
                    λ_i * g_i(x*) = 0, &nbsp; ∀ i
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">3. 可行性 (Primal Feasibility)</span>
                    g_i(x*) ≤ 0, &nbsp; ∀ i
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-bold block mb-1">4. 对偶可行性 (Dual Feasibility)</span>
                    λ_i ≥ 0, &nbsp; ∀ i
                  </div>
                </div>

                <div className="mt-2 text-slate-500 leading-normal text-[11px]">
                  <strong>关于影子价格 (Shadow Price):</strong> 拉格朗日乘子 $\lambda_i$ 的物理和经济学意义是“影子价格”。它代表了当约束条件 $g_i(x) \le 0$ 边界向外松弛一个微小单位时，最优目标函数值 $f(x^*)$ 能够获得改善（减小）的敏感度速率。若乘子 $\lambda_i = 0$，表示该约束不处于激活状态，松弛它不会对最优结果产生任何影响。
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            我已知晓
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 2. AI INSIGHTS DIAGNOSIS MODAL (AI 洞察)
// ==========================================
interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  func: ObjectiveFunction;
  activeConstraints: Constraint[];
  trajectory: IterationStep[];
  selectedStepIndex: number;
  tol: number;
  maxIter: number;
  scipyMethod: string;
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  func,
  activeConstraints,
  trajectory,
  selectedStepIndex,
  tol,
  maxIter,
  scipyMethod,
}) => {
  const [activeTab, setActiveTab] = useState<"diagnosis" | "chat">("diagnosis");

  // Settings states
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<"gemini-3.5-flash" | "deepseek-reasoner">("gemini-3.5-flash");

  // Diagnosis states
  const [loading, setLoading] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Synchronize settings from localStorage on open
  useEffect(() => {
    if (isOpen) {
      const config = getLLMConfig();
      setApiKey(config.apiKey);
      setSelectedModel(config.model);
    }
  }, [isOpen]);

  // Scroll chat to bottom when chatHistory updates
  useEffect(() => {
    if (activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

  if (!isOpen) return null;

  const currentStep = trajectory[selectedStepIndex] || (trajectory.length > 0 ? trajectory[trajectory.length - 1] : null);

  if (!currentStep) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-2" size={24} />
          <p className="text-xs text-slate-600">等待算法加载中，请先在主界面运行寻优轨迹。</p>
          <button onClick={onClose} className="mt-4 px-4 py-1.5 bg-slate-100 rounded-lg text-xs">关闭</button>
        </div>
      </div>
    );
  }

  // Calculate local properties at current node
  const H = func.hessian(currentStep.x, currentStep.y);
  const evs = getEigenvalues(H);
  const isConvex = evs[0] > 0 && evs[1] > 0;
  const isSaddle = evs[0] * evs[1] < 0;

  const estimatedMultipliers = activeConstraints.map((c) => {
    const gVal = c.evaluate(currentStep.x, currentStep.y);
    const isActive = gVal >= -5e-2;
    let lambdaVal = 0;
    if (isActive) {
      const fGrad = func.gradient(currentStep.x, currentStep.y);
      const gGrad = c.gradient(currentStep.x, currentStep.y);
      const gNormSq = gGrad.x * gGrad.x + gGrad.y * gGrad.y;
      if (gNormSq > 1e-6) {
        lambdaVal = -(fGrad.x * gGrad.x + fGrad.y * gGrad.y) / gNormSq;
        if (lambdaVal < 0) lambdaVal = 0;
      }
    }
    return { name: c.name, formula: c.formula, isActive, val: lambdaVal, currentVal: gVal };
  });

  const getHessianDescription = () => {
    if (isConvex) return "局部严格凸 (Hessian 严格正定)";
    if (isSaddle) return "局部鞍点 (Hessian 不定)";
    if (evs[0] < 0 && evs[1] < 0) return "局部严格凹 (Hessian 严格负定)";
    return "退化非凸曲面";
  };

  const getGradientNorm = () => {
    const g = func.gradient(currentStep.x, currentStep.y);
    return Math.sqrt(g.x * g.x + g.y * g.y);
  };

  const currentGradNorm = getGradientNorm();

  // Settings save
  const handleSaveSettings = () => {
    saveLLMConfig({ apiKey, model: selectedModel });
    setShowSettings(false);
  };

  const quickQuestions = [
    "解释此处的梯度大小与 Hessian 特征值",
    "为什么拉格朗日乘子代表影子价格？",
    "介绍一下多局域极值测试函数（如 Himmelblau 或 Ackley）",
  ];

  // Call API for Gemini AI Academic diagnosis
  const fetchAiInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const systemInstruction = `你是一位世界级的非线性规划（Nonlinear Programming, NLP）和数学优化领域专业导师。你的目标是针对用户的具体数值优化迭代实验，提供严谨、优雅且极具洞察力的专业级解读。
用温柔大方、淡雅从容的专业口吻进行分析，避免干燥死板。使用 LaTeX 格式书写数学公式（如 $f(x)$ 或 $H = \\nabla^2 f$）。`;

      const prompt = `请对以下非线性规划迭代实验结果进行专业诊断与解读：

【实验背景】
- 目标函数：${func.name} (${func.formula})
- 优化算法：当前配置的迭代优化寻优
- 初始点 $x_0$：(${trajectory[0]?.x?.toFixed(4)}, ${trajectory[0]?.y?.toFixed(4)})
- 迭代步数：${trajectory.length} 步
- 最终点 $x^*$：(${currentStep.x.toFixed(4)}, ${currentStep.y.toFixed(4)})
- 最终梯度范数 $\\|\\nabla f(x^*)\\|$：${currentGradNorm.toExponential(4)}
- 收敛状态：${currentGradNorm < tol ? "成功收敛至极值点" : "未达到精度要求（达到最大迭代次数或发散）"}

【局域性态诊断】
- Hessian 矩阵特征值：[${evs.map((v) => v.toFixed(4)).join(", ")}]
- 局域凸性判断：当前区域是${isConvex ? "严格局部凸的" : "非凸/鞍点/半正定区域"}

【约束与 KKT 诊断】
- 激活的约束条件（Active Constraints）：${estimatedMultipliers.filter((m) => m.isActive).length > 0 ? estimatedMultipliers.filter((m) => m.isActive).map((m) => m.name).join(", ") : "无（处于可行域内部，不受边界约束影响）"}
- KKT 条件余量违背量：${currentStep.kktViolation.toFixed(6)}

请生成一份精美的诊断报告，包含以下四个板块：
1. **收敛动态与效率诊断**：深度解析该算法在当前曲面（如 Rosenbrock 谷底的锯齿现象或二次曲面的极速收敛）上的轨迹行为与寻优步长特征。
2. **曲面凸性与极值诊断**：结合 Hessian 矩阵特征值判断极点性质（是局部极小值、鞍点，还是全局最优？），解释为何该处偏导数为零或接近零。
3. **KKT条件与活动约束分析**：详细阐述活动约束对极值点位置的限制，解释拉格朗日乘子的物理含义（影子价格）以及 KKT 条件的契合度。
4. **算法改进与抉择建议**：给出一个针对该问题的进阶算法优化建议，或者如何调整线搜索条件以提升收敛稳定性。`;

      const responseText = await callLLM({
        systemInstruction,
        prompt,
      });

      setAiReport(responseText);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "诊断生成中遇到网络波动，请检查 API Key 后重试");
    } finally {
      setLoading(false);
    }
  };

  // Send Chat Q&A Message
  const handleSendChat = async (textToSend?: string) => {
    const input = textToSend || chatInput;
    if (!input.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setChatHistory((prev) => [...prev, userMessage]);
    if (!textToSend) setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const systemInstruction = `你是一个世界级非线性规划和数值最优化方向的专业导师 AI 助手。用户正在进行目标函数为 "${func.name}" (${func.formula}) 的数值寻优迭代实验。
请深度解答用户的任何优化算法、步长回溯、或者约束 KKT 条件的专业性或实践性疑问。要求回答专业、细致、生动。`;

      const responseText = await callLLM({
        systemInstruction,
        prompt: input,
        history: chatHistory,
      });

      setChatHistory((prev) => [...prev, { role: "assistant", content: responseText }]);
    } catch (err: any) {
      console.error(err);
      setChatError(err?.message || "发送失败，请检查 API Key 选配或网络状况");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-stone-50 w-full max-w-3xl rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="text-indigo-600 animate-pulse" size={18} />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">AI 导师实时数学诊断与问答室</h2>
              <p className="text-[10px] text-slate-400">AI Diagnosis Room & Real-time Hessian / KKT Q&A Chat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Gear settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition flex items-center gap-1 text-xs"
              title="配置大模型"
            >
              <Settings size={14} className={showSettings ? "rotate-45" : ""} />
              <span className="text-[11px] font-medium hidden md:inline">配置大模型</span>
            </button>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Dynamic Navigation Sub-Tabs */}
        <div className="flex border-b border-slate-100 bg-white px-6 py-2 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab("diagnosis")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeTab === "diagnosis"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            }`}
          >
            数学评估报告诊断
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === "chat"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
            }`}
          >
            <MessageSquare size={13} />
            <span>智能 AI 问答</span>
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-4 relative min-h-0">
          
          {/* Settings Overlay Form inside Modal */}
          {showSettings && (
            <div className="absolute inset-x-6 top-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-45 animate-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings size={13} className="text-indigo-600" />
                  <span>配置大模型 & API Key</span>
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">本地浏览器缓存保存</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">选择目标大模型：</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none"
                  >
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (极速诊断)</option>
                    <option value="deepseek-reasoner">DeepSeek R1 (深度思考与推理)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-slate-500 font-medium">输入 API Key：</label>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      {showApiKey ? <EyeOff size={10} /> : <Eye size={10} />}
                      {showApiKey ? "隐藏密码" : "显示明文"}
                    </button>
                  </div>
                  <input
                    type={showApiKey ? "text" : "password"}
                    placeholder={selectedModel === "gemini-3.5-flash" ? "请输入 Gemini API Key" : "请输入 DeepSeek API Key"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                * 本系统已被优化以完全支持部署至 <strong>GitHub Pages</strong>。在静态页面中，您必须填入相应的 API Key。浏览器将发起端对端直接调用，不会经过 any 中转服务器，100% 保护您的隐私。
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-3.5 py-1.5 text-slate-500 hover:bg-slate-50 rounded-lg text-xs"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  确认并保存
                </button>
              </div>
            </div>
          )}

          {activeTab === "diagnosis" ? (
            /* Sub-View 1: Mathematical Diagnosis */
            <div className="flex flex-col gap-4 select-text">
              {/* Top Numeric Diagnostics Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
                
                {/* Gradient norm */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">1. 梯度平坦度</span>
                  <div className="my-2">
                    <span className="text-xs text-slate-500 font-mono block">一阶偏导数范数 ‖∇f‖:</span>
                    <span className="text-base font-mono font-bold text-slate-800">{currentGradNorm.toExponential(5)}</span>
                  </div>
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md inline-block w-max ${
                    currentGradNorm < tol ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700 animate-pulse"
                  }`}>
                    {currentGradNorm < tol ? "● 梯度已清零 (一阶极小点)" : "● 尚未达到一阶平坦区"}
                  </span>
                </div>

                {/* Hessian Curvature */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">2. 二阶黑塞矩阵特征值</span>
                  <div className="my-1.5 font-mono text-[11px] text-slate-700 space-y-0.5">
                    <div>λ₁ = {evs[0].toFixed(5)}</div>
                    <div>λ₂ = {evs[1].toFixed(5)}</div>
                  </div>
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md inline-block w-max ${
                    isConvex ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}>
                    {getHessianDescription()}
                  </span>
                </div>

                {/* KKT System violation */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">3. KKT 系统残差 / 违约度</span>
                  <div className="my-2">
                    <span className="text-xs text-slate-500 font-mono block">边界可行条件违反量:</span>
                    <span className="text-base font-mono font-bold text-slate-800">{currentStep.kktViolation.toExponential(4)}</span>
                  </div>
                  <span className={`text-[9px] font-medium px-2 py-0.5 rounded-md inline-block w-max ${
                    currentStep.kktViolation <= 1e-4 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                  }`}>
                    {currentStep.kktViolation <= 1e-4 ? "● 可行域完整满足" : "● 位于非可行约束区"}
                  </span>
                </div>

              </div>

              {/* Constraint Lagrange multiplier pricing detailed desk */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 shrink-0">
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-3">
                  <Compass size={14} className="text-indigo-600" />
                  <span>不等式约束激活剖析 & 对偶乘子 (影子价格) 计算结果</span>
                </h4>
                
                {estimatedMultipliers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">当前为无约束优化情况，KKT 乘子均为零。</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {estimatedMultipliers.map((m, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100/80 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className="font-bold text-slate-700 block truncate">{m.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{m.formula}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                          <span className={`px-1 rounded text-[8px] ${m.isActive ? "bg-rose-100 text-rose-700 font-bold" : "bg-slate-200 text-slate-500"}`}>
                            {m.isActive ? "激活" : "松弛"}
                          </span>
                          <span className="font-mono font-medium text-slate-800">
                            λ ≈ {m.val.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive AI Tutor Section */}
              <div className="bg-gradient-to-r from-indigo-500/5 to-indigo-600/5 rounded-2xl border border-indigo-500/10 p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-indigo-600 animate-spin-slow" size={16} />
                    <h4 className="text-xs font-semibold text-indigo-900">
                      AI 导师深度专业解读报告
                    </h4>
                  </div>
                  <button
                    onClick={fetchAiInsights}
                    disabled={loading}
                    className="text-[11px] flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition disabled:opacity-50 font-semibold"
                  >
                    <Cpu size={12} className={loading ? "animate-spin" : ""} />
                    {loading ? "深度分析中..." : aiReport ? "重新生成解读报告" : "点此生成 AI 专业解读"}
                  </button>
                </div>

                {aiReport ? (
                  <div className="bg-white/90 p-4 rounded-xl border border-indigo-500/15 max-h-[220px] overflow-auto text-xs leading-relaxed text-slate-700 space-y-2 select-text">
                    {aiReport.split("\n").map((line, i) => {
                      if (line.startsWith("###")) {
                        return (
                          <h5 key={i} className="text-indigo-900 font-bold mt-3 mb-1 text-xs border-b border-indigo-50 pb-1 flex items-center gap-1">
                            <ChevronRight size={12} className="text-indigo-600" />
                            {line.replace("###", "")}
                          </h5>
                        );
                      } else if (line.startsWith("**") || line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.") || line.startsWith("4.")) {
                        return (
                          <p key={i} className="font-semibold text-indigo-950 mt-1.5">
                            {line}
                          </p>
                        );
                      }
                      return <p key={i} className="mb-1 text-slate-600 font-sans">{line}</p>;
                    })}
                  </div>
                ) : error ? (
                  <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-center gap-2 select-text">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center justify-center gap-1 select-none">
                    <Info size={16} className="text-slate-300" />
                    <p className="font-medium text-slate-500">还未生成专业诊断</p>
                    <p className="text-[10px] text-slate-400">点击上方右侧按钮，AI 将全面审视局部曲率、收敛极值并为您生成独家多维解读。</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Sub-View 2: Q&A Chatbot */
            <div className="flex-1 flex flex-col min-h-0 select-text">
              {/* Quick Prompt Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 select-none no-scrollbar shrink-0">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(q)}
                    disabled={chatLoading}
                    className="whitespace-nowrap px-3 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-full text-xs text-slate-600 border border-slate-200 transition active:scale-95 disabled:opacity-40 shrink-0"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 overflow-y-auto mb-3 flex flex-col gap-3 min-h-0">
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs py-16 gap-2 select-none">
                    <Bot size={32} className="text-indigo-500/80 animate-bounce" />
                    <p className="font-bold text-slate-600 text-sm">智能 AI 答疑室</p>
                    <p className="max-w-md text-slate-400 text-[11px] leading-relaxed">
                      欢迎进入数学最优化答疑专区。由于本系统适配了 <strong>GitHub Pages 静态网络直连</strong>，您可以输入任意关于二阶牛顿法阻尼寻优、或者是香蕉谷底步长病态折返等深度专业问题，AI 导师将为您耐心解答。
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {chatHistory.map((msg, idx) => {
                      const isAi = msg.role === "assistant" || msg.role === "model";
                      return (
                        <div
                          key={idx}
                          className={`flex gap-2 items-start ${isAi ? "justify-start" : "justify-end"}`}
                        >
                          {isAi && (
                            <div className="w-6.5 h-6.5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                              <Bot size={13} />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                              isAi
                                ? "bg-slate-50 text-slate-700 border border-slate-100 font-sans"
                                : "bg-indigo-600 text-white font-medium"
                            }`}
                          >
                            {msg.content.split("\n").map((para, i) => (
                              <p key={i} className="mb-1 last:mb-0">
                                {para}
                              </p>
                            ))}
                          </div>
                          {!isAi && (
                            <div className="w-6.5 h-6.5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-sm mt-0.5">
                              <User size={13} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {chatLoading && (
                      <div className="flex gap-2 items-start justify-start">
                        <div className="w-6.5 h-6.5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 animate-spin">
                          <Sparkles size={13} />
                        </div>
                        <div className="bg-slate-50 rounded-2xl px-3.5 py-2 text-xs text-slate-400 border border-slate-100 flex items-center gap-2">
                          <span>AI 导师正在深入思考该最优化问题的本质</span>
                          <span className="flex gap-0.5">
                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-75" />
                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-150" />
                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-300" />
                          </span>
                        </div>
                      </div>
                    )}
                    {chatError && (
                      <div className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-xl border border-rose-150">
                        {chatError}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="flex gap-2 shrink-0 select-none">
                <button
                  onClick={() => setChatHistory([])}
                  disabled={chatHistory.length === 0 || chatLoading}
                  className="p-2.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-400 rounded-xl transition"
                  title="清空答疑历史"
                >
                  <Trash size={14} />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="请输入关于算法、寻优、拉格朗日影子价格的数学提问..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    disabled={chatLoading}
                    className="w-full bg-white hover:bg-slate-250 border border-slate-250 focus:border-indigo-300 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-700 outline-none transition"
                  />
                  <button
                    onClick={() => handleSendChat()}
                    disabled={!chatInput.trim() || chatLoading}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-45 text-white rounded-lg transition"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
          >
            完成评估
          </button>
        </div>
      </div>
    </div>
  );
};
