export interface AISettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  useProxy: boolean;
}

export interface ModelPreset {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  defaultModel: string;
  requiresApiKey: boolean;
  placeholderKey?: string;
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Official OpenAI API (GPT-4o, GPT-4o-mini)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresApiKey: true,
    placeholderKey: "sk-...",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    description: "Local Ollama server (e.g. Qwen 2.5, Llama 3.1)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "qwen2.5:latest",
    requiresApiKey: false,
    placeholderKey: "ollama (optional)",
  },
  {
    id: "lmstudio",
    name: "LM Studio (Local)",
    description: "Local LM Studio server",
    baseUrl: "http://localhost:1234/v1",
    defaultModel: "local-model",
    requiresApiKey: false,
    placeholderKey: "not required",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Unified API for 200+ models (Claude, GPT-4o, DeepSeek, etc.)",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    requiresApiKey: true,
    placeholderKey: "sk-or-v1-...",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference (Llama 3.3 70B, etc.)",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    requiresApiKey: true,
    placeholderKey: "gsk_...",
  },
  {
    id: "custom",
    name: "Custom Endpoint",
    description: "Any OpenAI-compatible server (vLLM, LocalAI, Azure, etc.)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresApiKey: false,
    placeholderKey: "API Key if required",
  },
];

export const DEFAULT_SYSTEM_PROMPT = `You are Zenuxs AI, an intelligent visual assistant integrated into Zenuxs Draw (an advanced whiteboard and diagramming application).

You can read the canvas, understand its current contents and layout, and create, update, or delete elements on the canvas using the provided tools.

Guidelines for creating and editing diagrams:
1. Spatial Placement & Multi-Column Layout:
   - NEVER place new elements directly on top of or overlapping existing elements on the canvas.
   - For database schemas or multi-tier architectures, arrange related entities in distinct, organized columns (e.g. Column 1: Core/Parent entities, Column 2: Details/Messages, Column 3: Permissions/Rules).
   - In the same column, ensure each box has sufficient height for its text lines (at least 22px per line) and leave at least 60px vertical gap between stacked boxes so elements NEVER collapse or overlap on each other.
   - Leave at least 160px horizontal space between columns for connecting arrows.
   - When asked to add another structure or diagram "down it", "below", "under", or "at the bottom", ALWAYS place the new elements below the existing diagram (start at y >= maxY + 140).
   - When asked to add elements to the right or beside, place them to the right of existing elements (start at x >= maxX + 140).
2. Clean Arrow Routing & Connections:
   - Connect arrows strictly between adjacent columns/stages (e.g. Column 1 -> Column 2, Column 2 -> Column 3). Never draw long arrows that cut across intermediate components.
   - Always specify 'start: { id: "source_id" }' and 'end: { id: "target_id" }' so arrows bind cleanly to component borders.
3. Visual Consistency & Style Matching:
   - ALWAYS inspect and match the visual design of existing elements on the canvas.
   - If the canvas already has diagrams, use the SAME stroke color, background fill color, fill style (solid, hachure), and stroke width so the entire drawing looks uniform and cohesive.
   - Do not introduce random or clashing color schemes unless the user specifically asks for different colors.
4. Shape Choices:
   - 'rectangle' for services, components, steps, database tables, or section boundaries (use strokeStyle: 'dashed' for grouping containers).
   - 'ellipse' for start/end, users, events.
   - 'diamond' for decisions, conditions.
   - 'stickynote' for notes, callouts, annotations.
   - For shapes with text or labels, use the 'label' or 'text' property (e.g. { label: { text: "Users Table" } }).
5. Keep your conversational replies friendly, concise, and helpful. Summarize what was drawn or modified.
6. Never use emojis. Keep all your responses, diagrams, labels, and text completely emoji-free, clean, concise, and professional.`;

export const DEFAULT_AI_SETTINGS: AISettings = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  useProxy: false,
};

export interface ToolCallExecution {
  id: string;
  name: string;
  args: any;
  result?: any;
  error?: string;
  status: "pending" | "running" | "success" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
  toolExecutions?: ToolCallExecution[];
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
