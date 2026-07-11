import React, { useState, useEffect, useRef } from "react";
import { ObjectiveFunction, Constraint, IterationStep } from "../types";
import { getEigenvalues } from "../algorithms";
import { 
  Sparkles, Brain, Compass, CheckCircle2, Settings, Send, 
  Trash, MessageSquare, Eye, EyeOff, Bot, User 
} from "lucide-react";
import { getLLMConfig, saveLLMConfig, callLLM, ChatMessage } from "../lib/llm";

interface AIInsightsProps {
  func: ObjectiveFunction;
  activeConstraints: Constraint[];
  trajectory: IterationStep[];
  selectedStepIndex: number;
  tol: number;
  maxIter: number;
  scipyMethod: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  func,
  activeConstraints,
  trajectory,
  selectedStepIndex,
  tol,
  maxIter,
  scipyMethod,
}) => {
  // Tabs: "diagnose" (Academic Diagnosis) or "assistant" (Q&A Chat)
  const [activeTab, setActiveTab] = useState<"diagnose" | "assistant">("diagnose");

  // Settings popup/overlay state
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<"gemini-3.5-flash" | "deepseek-reasoner">("gemini-3.5-flash");

  // AI Academic Diagnosis states
  const [loading, setLoading] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Assistant Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Synchronize settings from localStorage on load
  useEffect(() => {
    const config = getLLMConfig();
    setApiKey(config.apiKey);
    setSelectedModel(config.model);
  }, []);

  // Auto scroll chat to bottom when history changes
  useEffect(() => {
    if (activeTab === "assistant") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, activeTab]);

  const currentStep = trajectory[selectedStepIndex] || (trajectory.length > 0 ? trajectory[trajectory.length - 1] : null);

  if (!currentStep) {
    return (
      <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm h-full flex items-center justify-center text-xs text-slate-400 italic">
        等待算法加载或运行，以激活局域性态诊断
      </div>
    );
  }

  // Calculate local properties at current node
  const H = func.hessian(currentStep.x, currentStep.y);
  const evs = getEigenvalues(H);
  const isConvex = evs[0] > 0 && evs[1] > 0;
  const isSaddle = evs[0] * evs[1] < 0;

  // Let's estimate Lagrange Multiplier for active constraints
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
    return { name: c.name, isActive, val: lambdaVal };
  });

  const getHessianDescription = () => {
    if (isConvex) return "局部严格凸 (Hessian 严格正定)";
    if (isSaddle) return "局部鞍点/非凸区域 (Hessian 不定)";
    if (evs[0] < 0 && evs[1] < 0) return "局部严格凹 (Hessian 严格负定)";
    return "局部半正定 / 退化曲面";
  };

  const getGradientNorm = () => {
    const g = func.gradient(currentStep.x, currentStep.y);
    return Math.sqrt(g.x * g.x + g.y * g.y);
  };

  const currentGradNorm = getGradientNorm();

  // Save Settings handler
  const handleSaveSettings = () => {
    saveLLMConfig({ apiKey, model: selectedModel });
    setShowSettings(false);
  };

  // Quick chips for helper Q&A
  const quickQuestions = [
    "解释此极值点的 KKT 条件",
    "Rosenbrock 为什么很难收敛",
    "牛顿法对比梯度下降的优劣",
  ];

  // Ask LLM for Academic critique
  const fetchAiInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const systemInstruction = `你是一位世界级的非线性规划（Nonlinear Programming, NLP）和数学优化领域专业导师。你的目标是针对用户的具体数值优化迭代实验，提供严谨、优雅且极具洞察力的专业级解读。
用温柔大方、淡雅从容的专业口吻进行分析，避免干燥死板。使用 LaTeX 格式书写数学公式（如 $f(x)$ 或 $H = \\nabla^2 f$）。`;

      const prompt = `请对以下非线性规划迭代实验结果进行专业诊断与解读：

【实验背景】
- 目标函数：${func.name} (${func.formula})
- 优化算法：当前非线性规划搜索
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
1. **收敛动态与效率诊断**：解析该算法在当前曲面上的轨迹行为与寻优步长特征。
2. **曲面凸性与极值诊断**：结合 Hessian 矩阵特征值判断极点性质，解释为何该处偏导数为零或接近零。
3. **KKT条件与活动约束分析**：阐述活动约束对极值点位置的限制，解释影子价格以及 KKT 条件的契合度。
4. **专业改进与算法抉择建议**：给出一个针对该问题的进阶算法优化建议（如调整 Armijo/Wolfe 参数）。`;

      const responseText = await callLLM({
        systemInstruction,
        prompt,
      });

      setAiReport(responseText);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "诊断生成遇到了一些波动，请检查 API Key 后重试");
    } finally {
      setLoading(false);
    }
  };

  // Send message in Chatbot
  const handleSendChat = async (textToSend?: string) => {
    const input = textToSend || chatInput;
    if (!input.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setChatHistory((prev) => [...prev, userMessage]);
    if (!textToSend) setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const systemInstruction = `你是一位世界级非线性规划和数值最优化方向的智能 AI 助手。你对 Rosenbrock、Beale、Himmelblau、Ackley、Booth 等经典的非约束/约束最优化函数了如指掌。
你能深入浅出地用严谨且易懂的形式解答用户提出的问题。当前优化的目标函数为 "${func.name}" (${func.formula})，当前选择点坐标为 (${currentStep.x.toFixed(4)}, ${currentStep.y.toFixed(4)})。
回答应当生动细致、条理清晰。`;

      const responseText = await callLLM({
        systemInstruction,
        prompt: input,
        history: chatHistory,
      });

      setChatHistory((prev) => [...prev, { role: "assistant", content: responseText }]);
    } catch (err: any) {
      console.error(err);
      setChatError(err?.message || "发送失败，请检查 API Key 设置并重试");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 font-sans h-[420px] relative overflow-hidden">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <Brain size={14} className="text-indigo-600 animate-pulse" />
          <h3 className="text-xs font-semibold text-indigo-900">
            AI 智能助手与专业诊断
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition"
            title="大模型 API Key 选配设置"
          >
            <Settings size={13} className={showSettings ? "rotate-45 text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* Settings Panel Popover Overlay */}
      {showSettings && (
        <div className="absolute inset-x-4 top-10 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xl z-30 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Settings size={11} className="text-indigo-600" />
              <span>大模型选配面板 (Settings)</span>
            </h4>
            <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded">Local Storage 存储</span>
          </div>

          <div className="flex flex-col gap-2.5 text-[11px]">
            {/* Model Selector */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">选择大语言模型：</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-slate-700 outline-none"
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (推荐)</option>
                <option value="deepseek-reasoner">DeepSeek R1 (深度推理)</option>
              </select>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-slate-500 font-medium">配置 API Key：</label>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[9px] text-indigo-600 hover:underline flex items-center gap-0.5"
                >
                  {showApiKey ? <EyeOff size={10} /> : <Eye size={10} />}
                  {showApiKey ? "隐藏" : "明文"}
                </button>
              </div>
              <input
                type={showApiKey ? "text" : "password"}
                placeholder={selectedModel === "gemini-3.5-flash" ? "请输入 Gemini API Key" : "请输入 DeepSeek API Key"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-slate-700 outline-none font-mono text-[10px]"
              />
              <p className="text-[8.5px] text-slate-400 mt-1 leading-normal">
                项目部署到 GitHub Pages 等静态托管时，浏览器可直连大模型。数据本地保存，绝不外泄。
              </p>
            </div>

            {/* Button Confirm */}
            <div className="flex gap-1.5 mt-1 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-2.5 py-1 text-slate-500 hover:bg-slate-50 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-sm"
              >
                保存确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Menu Selection */}
      <div className="flex border-b border-slate-100 text-[11px] shrink-0">
        <button
          onClick={() => setActiveTab("diagnose")}
          className={`flex-1 pb-1.5 font-semibold text-center border-b-2 transition ${
            activeTab === "diagnose"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          专业诊断
        </button>
        <button
          onClick={() => setActiveTab("assistant")}
          className={`flex-1 pb-1.5 font-semibold text-center border-b-2 transition flex items-center justify-center gap-1 ${
            activeTab === "assistant"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <MessageSquare size={10} />
          <span>AI 问答助手</span>
        </button>
      </div>

      {/* Sub-Views */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "diagnose" ? (
          <div className="flex flex-col gap-3 h-full pb-1">
            {/* Numeric math diagnostics */}
            <div className="grid grid-cols-2 gap-2 text-[11px] leading-relaxed shrink-0">
              <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
                <span className="text-slate-500 font-medium">Hessian 特征值</span>
                <span className="text-slate-700 font-mono font-medium text-[11px] mt-0.5">
                  λ₁ = {evs[0].toFixed(4)} <br />
                  λ₂ = {evs[1].toFixed(4)}
                </span>
                <span className="text-[9px] text-indigo-700/80 mt-1">{getHessianDescription()}</span>
              </div>

              <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
                <span className="text-slate-500 font-medium">梯度范数 ‖∇f‖</span>
                <span className="text-slate-700 font-mono font-medium text-xs mt-0.5">
                  {currentGradNorm.toExponential(4)}
                </span>
                <span className="text-[9px] text-slate-500 mt-1">
                  {currentGradNorm < tol ? "★ 极小点 (一阶收敛)" : "迭代中... 偏导数未清零"}
                </span>
              </div>
            </div>

            {/* KKT Constraint details */}
            <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 text-[11px] shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <Compass size={11} className="text-indigo-600" />
                  约束激活与 KKT 乘子
                </span>
                {currentStep.kktViolation > 1e-3 && (
                  <span className="text-[8px] bg-rose-50 text-rose-600 px-1 py-0.2 rounded font-mono">
                    违背值: {currentStep.kktViolation.toFixed(4)}
                  </span>
                )}
              </div>
              {estimatedMultipliers.length === 0 ? (
                <div className="text-slate-400 italic text-[10px] py-1 text-center">
                  无激活约束（当前为无约束优化问题）
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {estimatedMultipliers.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/50 p-1 rounded border border-slate-100/50">
                      <span className="text-slate-600 truncate max-w-[150px]">{m.name}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span
                          className={`text-[8px] px-1 rounded font-sans ${
                            m.isActive ? "bg-rose-50 text-rose-600 font-medium" : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {m.isActive ? "激活" : "松弛"}
                        </span>
                        <span className="text-slate-700 font-medium text-[10px]">
                          λ ≈ {m.val.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diagnostic Action Block */}
            <div className="mt-1 shrink-0">
              <button
                onClick={fetchAiInsights}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition disabled:opacity-50"
              >
                <Sparkles size={13} className={loading ? "animate-spin" : "animate-spin-slow"} />
                {loading ? "AI 导师正在审视全谱特征..." : "AI 导师生成专业诊断"}
              </button>
            </div>

            {/* Dynamic AI response output */}
            {aiReport ? (
              <div className="bg-indigo-50/20 rounded-xl border border-indigo-100/40 p-3 overflow-y-auto flex-1 select-text">
                <div className="flex items-center gap-1 text-[10px] text-indigo-800 font-semibold mb-1">
                  <CheckCircle2 size={11} />
                  <span>诊断报告结论：</span>
                </div>
                <div className="text-[10.5px] text-slate-700 leading-relaxed font-sans pr-1">
                  {aiReport.split("\n").map((line, i) => {
                    if (line.startsWith("###")) {
                      return (
                        <h4 key={i} className="text-indigo-800 font-semibold mt-2 mb-1 text-[11px]">
                          {line.replace("###", "")}
                        </h4>
                      );
                    } else if (line.startsWith("**") || line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.") || line.startsWith("4.")) {
                      return (
                        <p key={i} className="font-semibold text-slate-800 mt-1">
                          {line}
                        </p>
                      );
                    }
                    return <p key={i} className="mb-1">{line}</p>;
                  })}
                </div>
              </div>
            ) : error ? (
              <div className="text-[10px] text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100 select-text shrink-0">{error}</div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-[10px] flex flex-col items-center justify-center gap-1 border border-dashed border-slate-200 rounded-xl flex-1">
                <Brain size={16} className="text-slate-300" />
                <span>暂无专业解读报告</span>
                <span>请点击按钮发起，获取关于二阶 Hessian 特征值及 KKT 物理学敏感度的专业讲评。</span>
              </div>
            )}
          </div>
        ) : (
          /* Q&A AI Assistant view */
          <div className="flex flex-col h-full pb-1">
            {/* Quick Suggestions Chips */}
            <div className="flex gap-1 overflow-x-auto pb-2 shrink-0 select-none no-scrollbar">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(q)}
                  disabled={chatLoading}
                  className="whitespace-nowrap px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-full text-[10px] text-slate-500 border border-slate-100 transition active:scale-95 disabled:opacity-40 shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 bg-slate-50/50 border border-slate-100/80 rounded-xl p-2.5 overflow-y-auto mb-2 flex flex-col gap-2 min-h-0 select-text">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-[10px] py-12 gap-1.5 select-none">
                  <Bot size={22} className="text-indigo-400/80 animate-bounce" />
                  <p className="font-semibold text-slate-500">NLP 优化 AI 智能助手</p>
                  <p>您可以问我关于罗森布罗克梯度锯齿、Hessian 正定对偶、或者约束罚函数的求解机理。</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {chatHistory.map((msg, idx) => {
                    const isAi = msg.role === "assistant" || msg.role === "model";
                    return (
                      <div
                        key={idx}
                        className={`flex gap-1.5 items-start ${isAi ? "justify-start" : "justify-end"}`}
                      >
                        {isAi && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                            <Bot size={11} />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[10.5px] leading-relaxed shadow-sm ${
                            isAi
                              ? "bg-white text-slate-700 border border-slate-100 font-sans"
                              : "bg-indigo-600 text-white font-medium"
                          }`}
                        >
                          {msg.content.split("\n").map((para, i) => (
                            <p key={i} className="mb-0.5 last:mb-0">
                              {para}
                            </p>
                          ))}
                        </div>
                        {!isAi && (
                          <div className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-sm mt-0.5">
                            <User size={11} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {chatLoading && (
                    <div className="flex gap-1.5 items-start justify-start">
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 animate-spin">
                        <Sparkles size={11} />
                      </div>
                      <div className="bg-white rounded-xl px-2.5 py-1.5 text-[10px] text-slate-400 border border-slate-100 flex items-center gap-1.5">
                        <span>AI 导师深度分析中</span>
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-75" />
                          <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-150" />
                          <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-300" />
                        </span>
                      </div>
                    </div>
                  )}
                  {chatError && (
                    <div className="text-[9.5px] text-rose-500 bg-rose-50 p-2 rounded-lg border border-rose-100">
                      {chatError}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="flex gap-1.5 shrink-0 select-none">
              <button
                onClick={() => setChatHistory([])}
                disabled={chatHistory.length === 0 || chatLoading}
                className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 border border-slate-150 text-slate-400 rounded-lg transition"
                title="清空对话历史"
              >
                <Trash size={12} />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="请输入您的数学问题..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  disabled={chatLoading}
                  className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-150 focus:border-indigo-300 rounded-lg pl-2.5 pr-8 py-1.5 text-[11px] text-slate-700 outline-none transition"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="absolute right-1 top-1 bottom-1 px-2 text-indigo-500 hover:text-indigo-700 disabled:opacity-40 transition"
                >
                  <Send size={11} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
