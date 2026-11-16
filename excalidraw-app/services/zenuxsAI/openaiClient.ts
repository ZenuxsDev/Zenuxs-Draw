import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import {
  type AISettings,
  type ChatMessage,
  type ToolCallExecution,
  DEFAULT_AI_SETTINGS,
  DEFAULT_SYSTEM_PROMPT,
} from "./types";
import {
  ZENUXS_AI_TOOLS,
  executeCanvasTool,
  extractCanvasStyle,
} from "./canvasTools";

const STORAGE_KEY = "zenuxs_ai_settings";

// Load settings from localStorage
export const loadAISettings = (): AISettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const systemPrompt =
        !parsed.systemPrompt ||
        !parsed.systemPrompt.includes("emojis") ||
        !parsed.systemPrompt.includes("Visual Consistency")
          ? DEFAULT_SYSTEM_PROMPT
          : parsed.systemPrompt;
      return {
        ...DEFAULT_AI_SETTINGS,
        ...parsed,
        systemPrompt,
      };
    }
  } catch (err) {
    console.warn("Failed to load AI settings from localStorage:", err);
  }
  return DEFAULT_AI_SETTINGS;
};

// Save settings to localStorage
export const saveAISettings = (settings: AISettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to save AI settings to localStorage:", err);
  }
};

// Safe JSON parser
const safeParseJSON = (str: string): any => {
  try {
    return JSON.parse(str);
  } catch {
    // Try cleaning markdown quotes
    const cleaned = str
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/\s*```$/, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
};

// Parse response whether it is standard JSON or SSE (Server-Sent Events streaming chunks)
export const parseChatResponse = async (
  response: Response,
): Promise<{
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason?: string;
  }>;
}> => {
  const rawText = await response.text();
  const trimmed = rawText.trim();

  // If standard JSON
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue to SSE parsing if JSON.parse fails
    }
  }

  // Handle SSE streaming data lines ("data: {...}")
  if (trimmed.includes("data:")) {
    const lines = trimmed.split("\n");
    let accumulatedContent = "";
    const toolCallsMap: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();
    let finishReason = "stop";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith("data:")) {
        continue;
      }
      const dataStr = trimmedLine.slice(5).trim();
      if (dataStr === "[DONE]") {
        break;
      }

      try {
        const chunk = JSON.parse(dataStr);
        const choice = chunk.choices?.[0];
        if (choice) {
          if (choice.finish_reason) {
            finishReason = choice.finish_reason;
          }
          const delta = choice.delta || choice.message;
          if (delta) {
            if (delta.content) {
              accumulatedContent += delta.content;
            }
            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                const existing = toolCallsMap.get(idx) || {
                  id: tc.id || `call_${idx}`,
                  name: "",
                  arguments: "",
                };
                if (tc.id) {
                  existing.id = tc.id;
                }
                if (tc.function?.name) {
                  existing.name += tc.function.name;
                }
                if (tc.function?.arguments) {
                  existing.arguments += tc.function.arguments;
                }
                toolCallsMap.set(idx, existing);
              }
            }
          }
        }
      } catch {
        // Skip unparseable chunk
      }
    }

    const toolCallsList = Array.from(toolCallsMap.values()).map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.name,
        arguments: tc.arguments,
      },
    }));

    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: accumulatedContent || null,
            ...(toolCallsList.length > 0 ? { tool_calls: toolCallsList } : {}),
          },
          finish_reason: finishReason,
        },
      ],
    };
  }

  return JSON.parse(trimmed);
};

// Fetch with automatic proxy fallback on CORS / network error
const fetchOpenAIEndpoint = async (
  targetUrl: string,
  payload: any,
  apiKey: string,
  forceProxy = false,
): Promise<Response> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey && apiKey.trim()) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  if (forceProxy) {
    return fetch("/api/openai-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: targetUrl,
        headers,
        body: payload,
      }),
    });
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return response;
  } catch (err: any) {
    // If TypeError: Failed to fetch (typically CORS in browser), fallback to proxy
    if (
      err.name === "TypeError" ||
      err.message?.includes("Failed to fetch") ||
      err.message?.includes("NetworkError")
    ) {
      console.warn(
        "Direct fetch failed (likely CORS), attempting via proxy...",
        err,
      );
      try {
        const proxyResponse = await fetch("/api/openai-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            headers,
            body: payload,
          }),
        });
        return proxyResponse;
      } catch (proxyErr) {
        throw new Error(
          `Connection failed. Ensure the server at ${targetUrl} is running and reachable. (${err.message})`,
        );
      }
    }
    throw err;
  }
};

// Test connection
export const testConnection = async (
  settings: AISettings,
): Promise<{ success: boolean; message: string; latency?: number }> => {
  const startTime = Date.now();
  const cleanBase = settings.baseUrl.replace(/\/+$/, "");
  const targetUrl = `${cleanBase}/chat/completions`;

  try {
    const response = await fetchOpenAIEndpoint(
      targetUrl,
      {
        model: settings.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
        stream: false,
      },
      settings.apiKey,
      settings.useProxy,
    );

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `Server returned status ${response.status}: ${response.statusText}`;
      try {
        const json = JSON.parse(errText);
        if (json.error?.message) {
          errorMsg = json.error.message;
        }
      } catch {}
      return { success: false, message: errorMsg, latency };
    }

    const data = await parseChatResponse(response);
    if (data.choices && data.choices.length > 0) {
      return {
        success: true,
        message: `Connected successfully to model "${settings.model}" (${latency}ms)`,
        latency,
      };
    }

    return {
      success: true,
      message: `Endpoint responded successfully (${latency}ms)`,
      latency,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to reach endpoint",
    };
  }
};

export interface ChatSessionCallbacks {
  onStatusUpdate?: (status: string) => void;
  onToolExecution?: (execution: ToolCallExecution) => void;
}

// Check for JSON-based tool call inside text content (fallback for models without native tool calling)
const extractToolCallFromText = (
  text: string,
): { name: string; args: any } | null => {
  if (!text) {
    return null;
  }

  // Look for ```json { "name": ..., "arguments": ... } ``` or ```json { "tool": ... } ```
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const candidate = jsonMatch ? jsonMatch[1] : text.trim();

  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    const parsed = safeParseJSON(candidate);
    if (parsed) {
      const toolName = parsed.name || parsed.tool || parsed.function;
      const toolArgs =
        parsed.arguments ||
        parsed.parameters ||
        parsed.args ||
        (parsed.elements ? { elements: parsed.elements } : {});
      if (
        toolName &&
        [
          "create_elements",
          "get_canvas_elements",
          "update_elements",
          "edit_elements",
          "modify_elements",
          "delete_elements",
          "clear_canvas",
        ].includes(toolName)
      ) {
        return {
          name: toolName,
          args: toolArgs,
        };
      }
    }
  }

  return null;
};

// Main Chat Execution Loop with Tools
export const runAIChatSession = async (
  userMessage: string,
  history: ChatMessage[],
  settings: AISettings,
  excalidrawAPI: ExcalidrawImperativeAPI,
  callbacks?: ChatSessionCallbacks,
): Promise<{ reply: string; toolExecutions: ToolCallExecution[] }> => {
  const cleanBase = settings.baseUrl.replace(/\/+$/, "");
  const targetUrl = `${cleanBase}/chat/completions`;

  callbacks?.onStatusUpdate?.("Thinking...");

  // Extract live canvas elements and style to supply immediate visual & spatial context to the model
  const activeSceneElements = excalidrawAPI
    .getSceneElements()
    .filter((e) => !e.isDeleted);
  const appState = excalidrawAPI.getAppState();
  const canvasStyle = extractCanvasStyle(activeSceneElements, appState);

  let canvasContextPrompt = "";
  if (activeSceneElements.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of activeSceneElements) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + (el.width || 0));
      maxY = Math.max(maxY, el.y + (el.height || 0));
    }
    const width = Math.round(maxX - minX);
    const height = Math.round(maxY - minY);

    canvasContextPrompt = `[CURRENT CANVAS STATE & ACTIVE DESIGN STYLE]
Existing Canvas Elements: ${activeSceneElements.length} elements detected.
Current Diagram Bounding Box: (${Math.round(minX)}, ${Math.round(
      minY,
    )}) to (${Math.round(maxX)}, ${Math.round(
      maxY,
    )}) [${width}px wide x ${height}px high].

CRITICAL PLACEMENT INSTRUCTIONS:
- DO NOT overlap new elements onto existing elements! Keep completely clear of coordinates (${Math.round(
      minX,
    )}, ${Math.round(minY)}) to (${Math.round(maxX)}, ${Math.round(maxY)}).
- If the user asks to add another structure or diagram "down it", "below", "under", or "at the bottom", start the new diagram below: x: ${Math.round(
      minX,
    )}, y: ${Math.round(maxY + 140)}.
- If placing to the right, start at: x: ${Math.round(
      maxX + 140,
    )}, y: ${Math.round(minY)}.

CRITICAL STYLE INHERITANCE:
The user's diagram uses this design style:
- Stroke Color: ${canvasStyle.dominantStrokeColor}
- Background Fill Color: ${canvasStyle.dominantBackgroundColor}
- Fill Style: ${canvasStyle.dominantFillStyle}
- Stroke Width: ${canvasStyle.dominantStrokeWidth}
- Roughness: ${canvasStyle.dominantRoughness}
- Theme: ${
      canvasStyle.isDarkTheme
        ? "Dark Mode (do NOT use black #1e1e1e strokes, use light colors!)"
        : "Light Mode"
    }
YOU MUST MATCH THIS DESIGN STYLE when creating shapes so the new additions look visually cohesive with the existing diagram!`;
  } else {
    canvasContextPrompt = `[CURRENT CANVAS STATE]
Canvas is empty.
Theme: ${
      canvasStyle.isDarkTheme
        ? "Dark Mode (use light stroke colors like #e9ecef or #ced4da, never black!)"
        : "Light Mode"
    }`;
  }

  // Build messages array
  const apiMessages: Array<{
    role: string;
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
  }> = [
    {
      role: "system",
      content: settings.systemPrompt || DEFAULT_AI_SETTINGS.systemPrompt,
    },
    {
      role: "system",
      content: canvasContextPrompt,
    },
  ];

  // Add conversation history
  for (const msg of history) {
    if (msg.role === "user") {
      apiMessages.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      apiMessages.push({
        role: "assistant",
        content: msg.content,
        tool_calls: msg.tool_calls,
      });
    } else if (msg.role === "tool") {
      apiMessages.push({
        role: "tool",
        content: msg.content,
        tool_call_id: msg.tool_call_id,
        name: msg.name,
      });
    }
  }

  // Add current user message
  apiMessages.push({ role: "user", content: userMessage });

  const accumulatedToolExecutions: ToolCallExecution[] = [];
  const MAX_TOOL_TURNS = 6;
  let turns = 0;
  let finalAssistantReply = "";

  while (turns < MAX_TOOL_TURNS) {
    turns++;

    const payload: any = {
      model: settings.model,
      messages: apiMessages,
      tools: ZENUXS_AI_TOOLS,
      tool_choice: "auto",
      stream: false,
    };

    const response = await fetchOpenAIEndpoint(
      targetUrl,
      payload,
      settings.apiKey,
      settings.useProxy,
    );

    if (!response.ok) {
      const errText = await response.text();
      let msg = `API Error ${response.status}: ${response.statusText}`;
      try {
        const json = JSON.parse(errText);
        if (json.error?.message) {
          msg = json.error.message;
        }
      } catch {}
      throw new Error(msg);
    }

    const data = await parseChatResponse(response);
    const choice = data.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error("No response choices returned by model.");
    }

    const assistantMsg = choice.message;
    const rawToolCalls = assistantMsg.tool_calls;

    // Check if there are tool calls in choice.message.tool_calls
    if (
      rawToolCalls &&
      Array.isArray(rawToolCalls) &&
      rawToolCalls.length > 0
    ) {
      callbacks?.onStatusUpdate?.("Executing canvas actions...");

      // Record assistant message with tool calls
      apiMessages.push(assistantMsg);

      for (const call of rawToolCalls) {
        const fnName = call.function?.name;
        const fnArgs = safeParseJSON(call.function?.arguments || "{}") || {};

        callbacks?.onStatusUpdate?.(`Running tool: ${fnName}...`);

        const executionRecord: ToolCallExecution = {
          id: call.id,
          name: fnName,
          args: fnArgs,
          status: "running",
        };
        callbacks?.onToolExecution?.(executionRecord);

        try {
          const result = executeCanvasTool(
            excalidrawAPI,
            fnName,
            fnArgs,
            userMessage,
          );
          executionRecord.status = "success";
          executionRecord.result = result;
          callbacks?.onToolExecution?.(executionRecord);
          accumulatedToolExecutions.push(executionRecord);

          // Append tool result message
          apiMessages.push({
            role: "tool",
            tool_call_id: call.id,
            name: fnName,
            content: JSON.stringify(result),
          });
        } catch (err: any) {
          console.error(`Tool execution error for ${fnName}:`, err);
          executionRecord.status = "error";
          executionRecord.error = err.message || String(err);
          callbacks?.onToolExecution?.(executionRecord);
          accumulatedToolExecutions.push(executionRecord);

          apiMessages.push({
            role: "tool",
            tool_call_id: call.id,
            name: fnName,
            content: JSON.stringify({
              error: err.message || "Execution error",
            }),
          });
        }
      }

      // Loop continues to let model process tool outputs and finish
      continue;
    }

    // Check fallback: did the model output tool call in text?
    const textContent = assistantMsg.content || "";
    const fallbackCall = extractToolCallFromText(textContent);

    if (fallbackCall && turns === 1) {
      callbacks?.onStatusUpdate?.(`Running tool: ${fallbackCall.name}...`);
      const executionRecord: ToolCallExecution = {
        id: `call_${Date.now()}`,
        name: fallbackCall.name,
        args: fallbackCall.args,
        status: "running",
      };
      callbacks?.onToolExecution?.(executionRecord);

      try {
        const result = executeCanvasTool(
          excalidrawAPI,
          fallbackCall.name,
          fallbackCall.args,
          userMessage,
        );
        executionRecord.status = "success";
        executionRecord.result = result;
        callbacks?.onToolExecution?.(executionRecord);
        accumulatedToolExecutions.push(executionRecord);

        apiMessages.push({
          role: "assistant",
          content: textContent,
        });
        apiMessages.push({
          role: "user",
          content: `Tool ${fallbackCall.name} returned: ${JSON.stringify(
            result,
          )}. Please summarize what you did.`,
        });
        continue;
      } catch (err: any) {
        executionRecord.status = "error";
        executionRecord.error = err.message || String(err);
        callbacks?.onToolExecution?.(executionRecord);
        accumulatedToolExecutions.push(executionRecord);
      }
    }

    // If no tool calls, this is the final reply
    finalAssistantReply = textContent;
    break;
  }

  callbacks?.onStatusUpdate?.("");

  if (!finalAssistantReply && accumulatedToolExecutions.length > 0) {
    finalAssistantReply = `I've updated the canvas (${accumulatedToolExecutions.length} action(s) performed).`;
  }

  return {
    reply: finalAssistantReply || "Task complete.",
    toolExecutions: accumulatedToolExecutions,
  };
};
