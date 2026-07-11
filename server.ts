import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google Gen AI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// AI Insights API
app.post("/api/insights", async (req, res) => {
  try {
    const {
      isCustomChat,
      prompt: customPrompt,
      systemInstruction: customSystemInstruction,
      history,
      algorithm,
      functionName,
      functionFormula,
      startingPoint,
      stepsCount,
      finalPoint,
      finalGradientNorm,
      converged,
      hessianEigenvalues,
      isConvex,
      activeConstraints,
      kktViolations,
      scipyParams,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: "AI 诊断引擎暂未就绪（请在设置中配置 GEMINI_API_KEY）",
      });
    }

    if (isCustomChat) {
      // General Q&A Chat Proxy
      const contents = history ? history.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : msg.role,
        parts: [{ text: msg.content }]
      })) : [];
      contents.push({ role: "user", parts: [{ text: customPrompt }] });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: customSystemInstruction || "你是一个世界级的优化算法导师。请回答用户关于数学优化和非线性规划的问题。",
          temperature: 0.7,
        },
      });
      return res.json({ text: response.text });
    }

    const systemInstruction = `你是一位世界级的非线性规划（Nonlinear Programming, NLP）和数学优化领域学术导师。你的目标是针对用户的具体数值优化迭代实验，提供严谨、优雅且极具洞察力的学术级解读。
用温柔大方、淡雅从容的学术口吻进行分析，避免干燥死板。使用 LaTeX 格式书写数学公式（如 $f(x)$ 或 $H = \\nabla^2 f$）。`;

    const prompt = `请对以下非线性规划迭代实验结果进行学术诊断与解读：

【实验背景】
- 目标函数：${functionName} (${functionFormula})
- 优化算法：${algorithm}
- 初始点 $x_0$：(${startingPoint?.x?.toFixed(4)}, ${startingPoint?.y?.toFixed(4)})
- 迭代步数：${stepsCount} 步
- 最终点 $x^*$：(${finalPoint?.x?.toFixed(4)}, ${finalPoint?.y?.toFixed(4)})
- 最终梯度范数 $\\|\\nabla f(x^*)\\|$：${finalGradientNorm?.toExponential(4)}
- 收敛状态：${converged ? "成功收敛至极值点" : "未达到精度要求（达到最大迭代次数或发散）"}

【局域性态诊断】
- Hessian 矩阵特征值：[${hessianEigenvalues?.map((v: number) => v?.toFixed(4))?.join(", ")}]
- 局域凸性判断：当前区域是${isConvex ? "严格局部凸的" : "非凸/鞍点/半正定区域"}

【约束与 KKT 诊断】
- 激活的约束条件（Active Constraints）：${activeConstraints?.length > 0 ? activeConstraints.join(", ") : "无（处于可行域内部，不受边界约束影响）"}
- KKT 条件余量违背量：${kktViolations?.toFixed(6) || "0.000000"}

【Python 求解器配置对比】
- SLSQP / L-BFGS-B 参数：${JSON.stringify(scipyParams)}

请生成一份精美的学术诊断报告，包含以下四个板块：
1. **收敛动态与效率诊断**：深度解析该算法在当前曲面（如 Rosenbrock 谷底的锯齿现象或二次曲面的极速收敛）上的轨迹行为与寻优步长特征。
2. **曲面凸性与极值诊断**：结合 Hessian 矩阵特征值判断极点性质（是局部极小值、鞍点，还是全局最优？），解释为何该处偏导数为零或接近零。
3. **KKT条件与活动约束分析**：详细阐述活动约束对极值点位置的限制，解释拉格朗日乘子的物理含义（影子价格）以及 KKT 条件的契合度。
4. **学术改进与算法抉择建议**：给出一个针对该问题的进阶算法优化建议，或者如何调整线搜索条件（如 Wolfe/Armijo 准则）以提升收敛稳定性。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Insights Error:", error);
    res.status(500).json({ error: error?.message || "诊断生成失败，请稍后重试" });
  }
});

// Setup Vite or static serving
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

setupApp();
