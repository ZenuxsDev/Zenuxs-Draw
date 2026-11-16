import { serializeAsJSON } from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type { ChatConversation } from "./types";

export const downloadFile = (
  filename: string,
  content: string,
  contentType = "application/json",
): void => {
  let url = "";
  try {
    const blob = new Blob([content], { type: contentType });
    if (
      typeof URL !== "undefined" &&
      typeof URL.createObjectURL === "function"
    ) {
      url = URL.createObjectURL(blob);
    }
  } catch {
    url = "";
  }

  if (!url) {
    url = `data:${contentType};charset=utf-8,${encodeURIComponent(content)}`;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  if (
    typeof URL !== "undefined" &&
    typeof URL.revokeObjectURL === "function" &&
    url.startsWith("blob:")
  ) {
    URL.revokeObjectURL(url);
  }
};

export const getCanvasJSONString = (
  excalidrawAPI: ExcalidrawImperativeAPI,
): string => {
  const elements = excalidrawAPI.getSceneElements();
  const appState = excalidrawAPI.getAppState();
  const files = excalidrawAPI.getFiles();

  return serializeAsJSON(elements, appState, files, "local");
};

export const exportCanvasAsJSON = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  filename?: string,
): void => {
  const jsonString = getCanvasJSONString(excalidrawAPI);
  const defaultName = filename || `zenuxs-canvas-${Date.now()}.json`;
  downloadFile(defaultName, jsonString, "application/json");
};

export const exportCanvasElementsOnly = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  filename?: string,
): void => {
  const elements = excalidrawAPI
    .getSceneElements()
    .filter((el) => !el.isDeleted);
  const jsonString = JSON.stringify(elements, null, 2);
  const defaultName = filename || `zenuxs-elements-${Date.now()}.json`;
  downloadFile(defaultName, jsonString, "application/json");
};

export const exportChatAsJSON = (
  conversation: ChatConversation,
  filename?: string,
): void => {
  const exportPayload = {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages,
  };
  const jsonString = JSON.stringify(exportPayload, null, 2);
  const safeTitle = conversation.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const defaultName = filename || `zenuxs-chat-${safeTitle || "session"}.json`;
  downloadFile(defaultName, jsonString, "application/json");
};

export const getChatMarkdownString = (
  conversation: ChatConversation,
): string => {
  let md = `# ${conversation.title}\n\n`;
  md += `*Exported from Zenuxs AI on ${new Date().toLocaleString()}*\n\n---\n\n`;

  for (const msg of conversation.messages) {
    if (msg.role === "user") {
      md += `### User\n\n${msg.content}\n\n`;
    } else if (msg.role === "assistant") {
      md += `### Zenuxs AI\n\n`;
      if (msg.toolExecutions && msg.toolExecutions.length > 0) {
        md += `**Tools Executed:**\n`;
        for (const tool of msg.toolExecutions) {
          md += `- \`${tool.name}\` (${tool.status})\n`;
        }
        md += `\n`;
      }
      if (msg.content) {
        md += `${msg.content}\n\n`;
      }
    }
  }

  return md;
};

export const exportChatAsMarkdown = (
  conversation: ChatConversation,
  filename?: string,
): void => {
  const md = getChatMarkdownString(conversation);
  const safeTitle = conversation.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const defaultName = filename || `zenuxs-chat-${safeTitle || "session"}.md`;
  downloadFile(defaultName, md, "text/markdown");
};

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for browsers / environments without clipboard API
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.warn("Failed to copy to clipboard:", err);
    return false;
  }
};
