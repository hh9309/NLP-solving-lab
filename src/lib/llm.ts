export interface LLMConfig {
  apiKey: string;
  model: "gemini-3.5-flash" | "deepseek-reasoner";
}

export interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

const STORAGE_KEY = "nlp_llm_config";

export function getLLMConfig(): LLMConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        apiKey: parsed.apiKey || "",
        model: parsed.model === "deepseek-reasoner" ? "deepseek-reasoner" : "gemini-3.5-flash",
      };
    }
  } catch (e) {
    console.error("Failed to load LLM config:", e);
  }
  return { apiKey: "", model: "gemini-3.5-flash" };
}

export function saveLLMConfig(config: LLMConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Clean system instruction content of any latex guidance or styling if needed,
 * or keep it as defined in components.
 */
export async function callLLM(options: {
  systemInstruction?: string;
  prompt: string;
  history?: ChatMessage[];
}): Promise<string> {
  const config = getLLMConfig();
  const { systemInstruction = "", prompt, history = [] } = options;

  // Case 1: If there's an API Key, call directly from browser to support static deployment (e.g., GitHub Pages)
  if (config.apiKey) {
    if (config.model === "gemini-3.5-flash") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${config.apiKey}`;
      
      // Map history to Gemini's format: roles are user and model, parts has text
      const contents = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : msg.role,
        parts: [{ text: msg.content }],
      }));
      // Append current prompt
      contents.push({
        role: "user",
        parts: [{ text: prompt }],
      });

      const body: any = { contents };
      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API 呼叫失败: ${response.status} ${errorText || ""}`);
      }

      const resData = await response.json();
      const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("未收到有效的 AI 回复，请检查 API Key 是否正确。");
      }
      return text;
    } else {
      // DeepSeek model
      const url = "https://api.deepseek.com/chat/completions";
      
      const messages: any[] = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      
      history.forEach((msg) => {
        messages.push({
          role: msg.role === "model" ? "assistant" : msg.role,
          content: msg.content,
        });
      });

      messages.push({ role: "user", content: prompt });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-reasoner",
          messages,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API 呼叫失败: ${response.status} ${errorText || ""}`);
      }

      const resData = await response.json();
      const text = resData?.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error("未收到有效的 DeepSeek 回复，请检查 API Key 或网络状况。");
      }
      return text;
    }
  }

  // Case 2: No API key, fallback to local node.js backend proxy
  try {
    const response = await fetch("/api/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customModel: config.model,
        prompt: prompt,
        systemInstruction: systemInstruction,
        isCustomChat: true,
        history: history,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "请求诊断失败");
    }

    const data = await response.json();
    return data.text;
  } catch (err: any) {
    throw new Error(err?.message || "后端连接失败。请点击右上角小齿轮配置您的 API Key。");
  }
}
