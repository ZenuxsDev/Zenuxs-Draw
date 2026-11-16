import type { ChatConversation } from "./types";

const CONVERSATIONS_STORAGE_KEY = "zenuxs_ai_conversations_v2";
const ACTIVE_CONV_STORAGE_KEY = "zenuxs_ai_active_conv_id_v2";

export const createNewConversation = (
  initialTitle = "New Chat",
): ChatConversation => {
  const now = Date.now();
  return {
    id: `conv_${now}_${Math.random().toString(36).substring(2, 8)}`,
    title: initialTitle,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const loadConversations = (): ChatConversation[] => {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load conversations from localStorage:", err);
  }

  const defaultConv = createNewConversation();
  saveConversations([defaultConv]);
  return [defaultConv];
};

export const saveConversations = (conversations: ChatConversation[]): void => {
  try {
    localStorage.setItem(
      CONVERSATIONS_STORAGE_KEY,
      JSON.stringify(conversations),
    );
  } catch (err) {
    console.warn("Failed to save conversations to localStorage:", err);
  }
};

export const loadActiveConversationId = (
  conversations: ChatConversation[],
): string => {
  try {
    const saved = localStorage.getItem(ACTIVE_CONV_STORAGE_KEY);
    if (saved && conversations.some((c) => c.id === saved)) {
      return saved;
    }
  } catch (err) {
    console.warn("Failed to load active conversation ID:", err);
  }

  return conversations[0]?.id || "";
};

export const saveActiveConversationId = (id: string): void => {
  try {
    localStorage.setItem(ACTIVE_CONV_STORAGE_KEY, id);
  } catch (err) {
    console.warn("Failed to save active conversation ID:", err);
  }
};

export const generateTitleFromPrompt = (prompt: string): string => {
  const clean = prompt
    .replace(/^[\s\W]+/, "")
    .replace(/\n.*/s, "")
    .trim();

  if (!clean) {
    return "New Chat";
  }

  if (clean.length <= 32) {
    return clean;
  }

  return `${clean.substring(0, 32)}...`;
};

export const formatConversationDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};
