var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var apiKey = process.env.GEMINI_API_KEY;
var ai = null;
if (apiKey) {
  ai = new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
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
      scipyParams
    } = req.body;
    if (!ai) {
      return res.status(503).json({
        error: "AI \u8BCA\u65AD\u5F15\u64CE\u6682\u672A\u5C31\u7EEA\uFF08\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u914D\u7F6E GEMINI_API_KEY\uFF09"
      });
    }
    if (isCustomChat) {
      const contents = history ? history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : msg.role,
        parts: [{ text: msg.content }]
      })) : [];
      contents.push({ role: "user", parts: [{ text: customPrompt }] });
      const response2 = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: customSystemInstruction || "\u4F60\u662F\u4E00\u4E2A\u4E16\u754C\u7EA7\u7684\u4F18\u5316\u7B97\u6CD5\u5BFC\u5E08\u3002\u8BF7\u56DE\u7B54\u7528\u6237\u5173\u4E8E\u6570\u5B66\u4F18\u5316\u548C\u975E\u7EBF\u6027\u89C4\u5212\u7684\u95EE\u9898\u3002",
          temperature: 0.7
        }
      });
      return res.json({ text: response2.text });
    }
    const systemInstruction = `\u4F60\u662F\u4E00\u4F4D\u4E16\u754C\u7EA7\u7684\u975E\u7EBF\u6027\u89C4\u5212\uFF08Nonlinear Programming, NLP\uFF09\u548C\u6570\u5B66\u4F18\u5316\u9886\u57DF\u5B66\u672F\u5BFC\u5E08\u3002\u4F60\u7684\u76EE\u6807\u662F\u9488\u5BF9\u7528\u6237\u7684\u5177\u4F53\u6570\u503C\u4F18\u5316\u8FED\u4EE3\u5B9E\u9A8C\uFF0C\u63D0\u4F9B\u4E25\u8C28\u3001\u4F18\u96C5\u4E14\u6781\u5177\u6D1E\u5BDF\u529B\u7684\u5B66\u672F\u7EA7\u89E3\u8BFB\u3002
\u7528\u6E29\u67D4\u5927\u65B9\u3001\u6DE1\u96C5\u4ECE\u5BB9\u7684\u5B66\u672F\u53E3\u543B\u8FDB\u884C\u5206\u6790\uFF0C\u907F\u514D\u5E72\u71E5\u6B7B\u677F\u3002\u4F7F\u7528 LaTeX \u683C\u5F0F\u4E66\u5199\u6570\u5B66\u516C\u5F0F\uFF08\u5982 $f(x)$ \u6216 $H = \\nabla^2 f$\uFF09\u3002`;
    const prompt = `\u8BF7\u5BF9\u4EE5\u4E0B\u975E\u7EBF\u6027\u89C4\u5212\u8FED\u4EE3\u5B9E\u9A8C\u7ED3\u679C\u8FDB\u884C\u5B66\u672F\u8BCA\u65AD\u4E0E\u89E3\u8BFB\uFF1A

\u3010\u5B9E\u9A8C\u80CC\u666F\u3011
- \u76EE\u6807\u51FD\u6570\uFF1A${functionName} (${functionFormula})
- \u4F18\u5316\u7B97\u6CD5\uFF1A${algorithm}
- \u521D\u59CB\u70B9 $x_0$\uFF1A(${startingPoint?.x?.toFixed(4)}, ${startingPoint?.y?.toFixed(4)})
- \u8FED\u4EE3\u6B65\u6570\uFF1A${stepsCount} \u6B65
- \u6700\u7EC8\u70B9 $x^*$\uFF1A(${finalPoint?.x?.toFixed(4)}, ${finalPoint?.y?.toFixed(4)})
- \u6700\u7EC8\u68AF\u5EA6\u8303\u6570 $\\|\\nabla f(x^*)\\|$\uFF1A${finalGradientNorm?.toExponential(4)}
- \u6536\u655B\u72B6\u6001\uFF1A${converged ? "\u6210\u529F\u6536\u655B\u81F3\u6781\u503C\u70B9" : "\u672A\u8FBE\u5230\u7CBE\u5EA6\u8981\u6C42\uFF08\u8FBE\u5230\u6700\u5927\u8FED\u4EE3\u6B21\u6570\u6216\u53D1\u6563\uFF09"}

\u3010\u5C40\u57DF\u6027\u6001\u8BCA\u65AD\u3011
- Hessian \u77E9\u9635\u7279\u5F81\u503C\uFF1A[${hessianEigenvalues?.map((v) => v?.toFixed(4))?.join(", ")}]
- \u5C40\u57DF\u51F8\u6027\u5224\u65AD\uFF1A\u5F53\u524D\u533A\u57DF\u662F${isConvex ? "\u4E25\u683C\u5C40\u90E8\u51F8\u7684" : "\u975E\u51F8/\u978D\u70B9/\u534A\u6B63\u5B9A\u533A\u57DF"}

\u3010\u7EA6\u675F\u4E0E KKT \u8BCA\u65AD\u3011
- \u6FC0\u6D3B\u7684\u7EA6\u675F\u6761\u4EF6\uFF08Active Constraints\uFF09\uFF1A${activeConstraints?.length > 0 ? activeConstraints.join(", ") : "\u65E0\uFF08\u5904\u4E8E\u53EF\u884C\u57DF\u5185\u90E8\uFF0C\u4E0D\u53D7\u8FB9\u754C\u7EA6\u675F\u5F71\u54CD\uFF09"}
- KKT \u6761\u4EF6\u4F59\u91CF\u8FDD\u80CC\u91CF\uFF1A${kktViolations?.toFixed(6) || "0.000000"}

\u3010Python \u6C42\u89E3\u5668\u914D\u7F6E\u5BF9\u6BD4\u3011
- SLSQP / L-BFGS-B \u53C2\u6570\uFF1A${JSON.stringify(scipyParams)}

\u8BF7\u751F\u6210\u4E00\u4EFD\u7CBE\u7F8E\u7684\u5B66\u672F\u8BCA\u65AD\u62A5\u544A\uFF0C\u5305\u542B\u4EE5\u4E0B\u56DB\u4E2A\u677F\u5757\uFF1A
1. **\u6536\u655B\u52A8\u6001\u4E0E\u6548\u7387\u8BCA\u65AD**\uFF1A\u6DF1\u5EA6\u89E3\u6790\u8BE5\u7B97\u6CD5\u5728\u5F53\u524D\u66F2\u9762\uFF08\u5982 Rosenbrock \u8C37\u5E95\u7684\u952F\u9F7F\u73B0\u8C61\u6216\u4E8C\u6B21\u66F2\u9762\u7684\u6781\u901F\u6536\u655B\uFF09\u4E0A\u7684\u8F68\u8FF9\u884C\u4E3A\u4E0E\u5BFB\u4F18\u6B65\u957F\u7279\u5F81\u3002
2. **\u66F2\u9762\u51F8\u6027\u4E0E\u6781\u503C\u8BCA\u65AD**\uFF1A\u7ED3\u5408 Hessian \u77E9\u9635\u7279\u5F81\u503C\u5224\u65AD\u6781\u70B9\u6027\u8D28\uFF08\u662F\u5C40\u90E8\u6781\u5C0F\u503C\u3001\u978D\u70B9\uFF0C\u8FD8\u662F\u5168\u5C40\u6700\u4F18\uFF1F\uFF09\uFF0C\u89E3\u91CA\u4E3A\u4F55\u8BE5\u5904\u504F\u5BFC\u6570\u4E3A\u96F6\u6216\u63A5\u8FD1\u96F6\u3002
3. **KKT\u6761\u4EF6\u4E0E\u6D3B\u52A8\u7EA6\u675F\u5206\u6790**\uFF1A\u8BE6\u7EC6\u9610\u8FF0\u6D3B\u52A8\u7EA6\u675F\u5BF9\u6781\u503C\u70B9\u4F4D\u7F6E\u7684\u9650\u5236\uFF0C\u89E3\u91CA\u62C9\u683C\u6717\u65E5\u4E58\u5B50\u7684\u7269\u7406\u542B\u4E49\uFF08\u5F71\u5B50\u4EF7\u683C\uFF09\u4EE5\u53CA KKT \u6761\u4EF6\u7684\u5951\u5408\u5EA6\u3002
4. **\u5B66\u672F\u6539\u8FDB\u4E0E\u7B97\u6CD5\u6289\u62E9\u5EFA\u8BAE**\uFF1A\u7ED9\u51FA\u4E00\u4E2A\u9488\u5BF9\u8BE5\u95EE\u9898\u7684\u8FDB\u9636\u7B97\u6CD5\u4F18\u5316\u5EFA\u8BAE\uFF0C\u6216\u8005\u5982\u4F55\u8C03\u6574\u7EBF\u641C\u7D22\u6761\u4EF6\uFF08\u5982 Wolfe/Armijo \u51C6\u5219\uFF09\u4EE5\u63D0\u5347\u6536\u655B\u7A33\u5B9A\u6027\u3002`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("AI Insights Error:", error);
    res.status(500).json({ error: error?.message || "\u8BCA\u65AD\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" });
  }
});
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
setupApp();
//# sourceMappingURL=server.cjs.map
