import React, { useState, useEffect, useRef, useMemo } from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import {
  type AISettings,
  type ChatMessage,
  type ChatConversation,
  type ToolCallExecution,
  MODEL_PRESETS,
} from "../../services/zenuxsAI/types";
import {
  loadAISettings,
  saveAISettings,
  runAIChatSession,
  testConnection,
} from "../../services/zenuxsAI/openaiClient";
import {
  createNewConversation,
  loadConversations,
  saveConversations,
  loadActiveConversationId,
  saveActiveConversationId,
  generateTitleFromPrompt,
  formatConversationDate,
} from "../../services/zenuxsAI/chatStorage";
import {
  exportCanvasAsJSON,
  exportCanvasElementsOnly,
  getCanvasJSONString,
  exportChatAsJSON,
  exportChatAsMarkdown,
  getChatMarkdownString,
  copyTextToClipboard,
} from "../../services/zenuxsAI/exportUtils";

import "./ZenuxsAI.scss";

interface ZenuxsAIModalProps {
  excalidrawAPI: ExcalidrawImperativeAPI;
  isOpen: boolean;
  onClose: () => void;
}

export const ZenuxsAIModal: React.FC<ZenuxsAIModalProps> = ({
  excalidrawAPI,
  isOpen,
  onClose,
}) => {
  const [conversations, setConversations] =
    useState<ChatConversation[]>(loadConversations);
  const [activeConversationId, setActiveConversationId] = useState<string>(() =>
    loadActiveConversationId(conversations),
  );
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");
  const [view, setView] = useState<"chat" | "settings" | "conversations">(
    "chat",
  );
  const [settings, setSettings] = useState<AISettings>(loadAISettings);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const activeConv: ChatConversation =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0] ||
    createNewConversation();

  const messages = useMemo(
    () => activeConv.messages || [],
    [activeConv.messages],
  );

  useEffect(() => {
    if (isOpen && view === "chat") {
      textareaRef.current?.focus();
    }
  }, [isOpen, view, activeConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showExportMenu &&
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportMenu]);

  if (!isOpen) {
    return null;
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    saveActiveConversationId(id);
    setView("chat");
  };

  const handleCreateNewChat = () => {
    const newConv = createNewConversation();
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConversationId(newConv.id);
    saveConversations(updated);
    saveActiveConversationId(newConv.id);
    setView("chat");
  };

  const handleDeleteConversation = (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewConversation();
      setConversations([fresh]);
      setActiveConversationId(fresh.id);
      saveConversations([fresh]);
      saveActiveConversationId(fresh.id);
    } else {
      setConversations(remaining);
      saveConversations(remaining);
      if (activeConversationId === id) {
        setActiveConversationId(remaining[0].id);
        saveActiveConversationId(remaining[0].id);
      }
    }
  };

  const handleClearCurrentChat = () => {
    const updated = conversations.map((conv) => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          messages: [],
          updatedAt: Date.now(),
        };
      }
      return conv;
    });
    setConversations(updated);
    saveConversations(updated);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 2200);
  };

  const handleExportCanvasJSON = () => {
    try {
      exportCanvasAsJSON(excalidrawAPI);
      showToast("Canvas exported (.json)");
      setShowExportMenu(false);
    } catch (err: any) {
      showToast(`Export failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleExportElementsJSON = () => {
    try {
      exportCanvasElementsOnly(excalidrawAPI);
      showToast("Elements exported (.json)");
      setShowExportMenu(false);
    } catch (err: any) {
      showToast(`Export failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleCopyCanvasJSON = async () => {
    try {
      const jsonStr = getCanvasJSONString(excalidrawAPI);
      const success = await copyTextToClipboard(jsonStr);
      if (success) {
        showToast("Canvas JSON copied to clipboard");
      } else {
        showToast("Copy failed");
      }
      setShowExportMenu(false);
    } catch (err: any) {
      showToast(`Copy failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleExportChatJSON = () => {
    try {
      exportChatAsJSON(activeConv);
      showToast("Chat exported (.json)");
      setShowExportMenu(false);
    } catch (err: any) {
      showToast(`Export failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleExportChatMarkdown = () => {
    try {
      exportChatAsMarkdown(activeConv);
      showToast("Chat exported (.md)");
      setShowExportMenu(false);
    } catch (err: any) {
      showToast(`Export failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleCopyChatMarkdown = async () => {
    try {
      const md = getChatMarkdownString(activeConv);
      const success = await copyTextToClipboard(md);
      if (success) {
        showToast("Chat copied to clipboard");
      } else {
        showToast("Copy failed");
      }
      setShowExportMenu(false);
    } catch (err: any) {
      showToast(`Copy failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isGenerating) {
      return;
    }

    setInput("");
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: promptText,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];

    // Determine updated title if first message
    const isFirstMessage = messages.length === 0;
    const nextTitle =
      isFirstMessage && activeConv.title === "New Chat"
        ? generateTitleFromPrompt(promptText)
        : activeConv.title;

    // Update conversations list with user message immediately (store forever)
    const updatedWithUser = conversations.map((conv) => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          title: nextTitle,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
      }
      return conv;
    });

    setConversations(updatedWithUser);
    saveConversations(updatedWithUser);

    setIsGenerating(true);
    setCurrentStatus("Thinking...");

    try {
      const activeExecutions: ToolCallExecution[] = [];

      const result = await runAIChatSession(
        promptText,
        messages,
        settings,
        excalidrawAPI,
        {
          onStatusUpdate: (st) => setCurrentStatus(st),
          onToolExecution: (execution) => {
            const idx = activeExecutions.findIndex(
              (e) => e.id === execution.id,
            );
            if (idx >= 0) {
              activeExecutions[idx] = execution;
            } else {
              activeExecutions.push(execution);
            }
          },
        },
      );

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: result.reply,
        toolExecutions: result.toolExecutions,
        timestamp: Date.now(),
      };

      const finalMessages = [...nextMessages, assistantMsg];
      const updatedWithAssistant = updatedWithUser.map((conv) => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            messages: finalMessages,
            updatedAt: Date.now(),
          };
        }
        return conv;
      });

      setConversations(updatedWithAssistant);
      saveConversations(updatedWithAssistant);
    } catch (err: any) {
      console.error("AI error:", err);
      const errorMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: `Error: ${
          err.message || "Failed to process request"
        }. Please verify your API endpoint or model settings.`,
        timestamp: Date.now(),
      };

      const finalMessages = [...nextMessages, errorMsg];
      const updatedWithError = updatedWithUser.map((conv) => {
        if (conv.id === activeConversationId) {
          return {
            ...conv,
            messages: finalMessages,
            updatedAt: Date.now(),
          };
        }
        return conv;
      });

      setConversations(updatedWithError);
      saveConversations(updatedWithError);
    } finally {
      setIsGenerating(false);
      setCurrentStatus("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(settings);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Connection failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = () => {
    saveAISettings(settings);
    setView("chat");
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = MODEL_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      return;
    }

    setSettings((prev) => ({
      ...prev,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
      useProxy: presetId === "ollama" || presetId === "lmstudio",
    }));
  };

  const currentPreset = MODEL_PRESETS.find(
    (p) =>
      p.baseUrl.toLowerCase() ===
        settings.baseUrl.toLowerCase().replace(/\/+$/, "") ||
      (p.id === "openai" && settings.baseUrl.includes("api.openai.com")),
  );

  const renderFormattedText = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((para, i) => {
      const lines = para.split("\n").map((line, j) => {
        const isBullet = line.startsWith("- ") || line.startsWith("* ");
        const lineText = isBullet ? line.substring(2) : line;

        const parts = lineText.split(/(\*\*.*?\*\*|`.*?`)/g);
        const formattedLine = parts.map((part, k) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={k}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={k}>{part.slice(1, -1)}</code>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <li key={j} style={{ marginLeft: "1rem" }}>
              {formattedLine}
            </li>
          );
        }

        return (
          <React.Fragment key={j}>
            {formattedLine}
            {j < para.split("\n").length - 1 && <br />}
          </React.Fragment>
        );
      });

      return <p key={i}>{lines}</p>;
    });
  };

  return (
    <div className={`zenuxs-ai-window ${isMinimized ? "minimized" : ""}`}>
      {/* Header */}
      <div className="zenuxs-ai-header">
        <div className="header-left">
          <div className="ai-logo-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" />
            </svg>
          </div>
          <span className="title">Zenuxs AI</span>
          <span className="model-tag" title={settings.model}>
            {settings.model}
          </span>
        </div>

        <div className="header-actions">
          {/* New Chat Button */}
          <button
            title="New Chat"
            className="header-btn"
            onClick={handleCreateNewChat}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Conversations Drawer Toggle */}
          <button
            title="Chat History"
            className={`header-btn ${view === "conversations" ? "active" : ""}`}
            onClick={() => {
              setView(view === "conversations" ? "chat" : "conversations");
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Export Menu Dropdown */}
          <div className="export-menu-container" ref={exportMenuRef}>
            <button
              title="Export Canvas or Chat"
              className={`header-btn ${showExportMenu ? "active" : ""}`}
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="export-dropdown-menu">
                <div className="dropdown-section-title">Canvas Diagram</div>
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={handleExportCanvasJSON}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <div className="item-text">
                    <span className="item-title">Export Canvas (.json)</span>
                    <span className="item-desc">
                      Full whiteboard diagram format
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={handleExportElementsJSON}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <div className="item-text">
                    <span className="item-title">Export Elements (.json)</span>
                    <span className="item-desc">Shapes array only</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={handleCopyCanvasJSON}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <div className="item-text">
                    <span className="item-title">Copy Canvas JSON</span>
                    <span className="item-desc">Direct to clipboard</span>
                  </div>
                </button>

                <div className="dropdown-divider" />

                <div className="dropdown-section-title">Chat Conversation</div>
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={handleExportChatJSON}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <div className="item-text">
                    <span className="item-title">Export Chat (.json)</span>
                    <span className="item-desc">Messages & tool history</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={handleExportChatMarkdown}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <div className="item-text">
                    <span className="item-title">Export Chat (.md)</span>
                    <span className="item-desc">Formatted markdown log</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={handleCopyChatMarkdown}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <div className="item-text">
                    <span className="item-title">Copy Chat Transcript</span>
                    <span className="item-desc">Markdown to clipboard</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <button
            title="AI Settings"
            className={`header-btn ${view === "settings" ? "active" : ""}`}
            onClick={() => {
              setView(view === "settings" ? "chat" : "settings");
              setTestResult(null);
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* Minimize Button */}
          <button
            title={isMinimized ? "Expand" : "Minimize"}
            className="header-btn"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Close Button */}
          <button
            title="Close Assistant"
            className="header-btn"
            onClick={onClose}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && view === "conversations" && (
        <div className="zenuxs-ai-conversations">
          <div className="conversations-top-bar">
            <div className="conversations-heading">
              <span className="heading-text">Chat History</span>
              <span className="conv-badge">{conversations.length}</span>
            </div>
            <button className="create-chat-btn" onClick={handleCreateNewChat}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Chat</span>
            </button>
          </div>

          <div className="conversations-scroll-list">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const msgCount = (conv.messages || []).filter(
                (m) => m.role === "user" || m.role === "assistant",
              ).length;

              return (
                <div
                  key={conv.id}
                  className={`conversation-card ${isActive ? "active" : ""}`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="card-left">
                    <div className="conv-icon">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <div className="card-text">
                      <div className="card-title">{conv.title}</div>
                      <div className="card-meta">
                        <span>{formatConversationDate(conv.updatedAt)}</span>
                        <span className="meta-dot">|</span>
                        <span>
                          {msgCount} {msgCount === 1 ? "message" : "messages"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    className="delete-card-btn"
                    title="Delete Chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isMinimized && view === "chat" && (
        <>
          {/* Thread header sub-bar */}
          <div className="chat-thread-bar">
            <span className="thread-title">{activeConv.title}</span>
            <div className="thread-actions">
              <button
                className="thread-action-btn"
                title="Export Canvas or Chat"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export</span>
              </button>
              <button
                className="clear-thread-btn"
                title="Clear current messages"
                onClick={handleClearCurrentChat}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="zenuxs-ai-body">
            {messages.length === 0 ? (
              <div className="zenuxs-ai-empty">
                <div className="empty-symbol">
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" />
                  </svg>
                </div>
                <h3>Zenuxs AI</h3>
                <p>
                  Whiteboard assistant. Ask to draw diagrams, analyze elements,
                  or modify the canvas.
                </p>
              </div>
            ) : (
              messages
                .filter((m) => m.role === "user" || m.role === "assistant")
                .map((msg) => (
                  <div key={msg.id} className={`chat-message ${msg.role}`}>
                    {/* Render tool executions if present */}
                    {msg.toolExecutions && msg.toolExecutions.length > 0 && (
                      <div className="tool-executions-container">
                        {msg.toolExecutions.map((tool) => (
                          <div key={tool.id} className="tool-execution-card">
                            <div
                              className="tool-header"
                              onClick={() =>
                                setExpandedToolId(
                                  expandedToolId === tool.id ? null : tool.id,
                                )
                              }
                            >
                              <div className="tool-name-wrap">
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <polyline points="4 17 10 11 4 5" />
                                  <line x1="12" y1="19" x2="20" y2="19" />
                                </svg>
                                <span className="tool-badge">{tool.name}</span>
                              </div>
                              <span className={`tool-status ${tool.status}`}>
                                {tool.status === "success" && (
                                  <svg
                                    width="11"
                                    height="11"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                                {tool.status === "error" && "Error"}
                                {tool.status === "running" && "Running..."}
                              </span>
                            </div>

                            {expandedToolId === tool.id && (
                              <div className="tool-details">
                                <div>
                                  <strong>Arguments:</strong>{" "}
                                  {JSON.stringify(tool.args, null, 2)}
                                </div>
                                {tool.result && (
                                  <div>
                                    <strong>Result:</strong>{" "}
                                    {JSON.stringify(tool.result, null, 2)}
                                  </div>
                                )}
                                {tool.error && (
                                  <div style={{ color: "#ef4444" }}>
                                    <strong>Error:</strong> {tool.error}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Bubble */}
                    {msg.content && (
                      <div className="bubble">
                        {renderFormattedText(msg.content)}
                      </div>
                    )}
                  </div>
                ))
            )}

            {/* Current generation status */}
            {isGenerating && (
              <div className="status-indicator">
                <div className="spinner" />
                <span>{currentStatus || "Thinking..."}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="zenuxs-ai-footer">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Zenuxs AI to draw or edit anything on the canvas..."
                rows={1}
                disabled={isGenerating}
              />
              <button
                className="send-btn"
                onClick={() => handleSendMessage()}
                disabled={isGenerating || !input.trim()}
                title="Send Message"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div className="footer-meta">
              <span className="tip">
                Enter to send, Shift+Enter for new line
              </span>
              <span className="shortcut">Alt+A</span>
            </div>
          </div>
        </>
      )}

      {/* Settings View */}
      {!isMinimized && view === "settings" && (
        <div className="zenuxs-ai-settings">
          <div className="settings-top-bar">
            <h4 className="settings-title">AI Settings</h4>
            <button
              className="back-btn"
              onClick={() => setView("chat")}
              title="Back to Chat"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Model Presets */}
          <div className="form-group">
            <label>Model Preset</label>
            <div className="preset-buttons">
              {MODEL_PRESETS.map((preset) => {
                const isSelected =
                  currentPreset?.id === preset.id ||
                  (preset.id === "custom" && !currentPreset);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`preset-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => handlePresetSelect(preset.id)}
                  >
                    <div className="preset-name">{preset.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base URL */}
          <div className="form-group">
            <label>Base URL</label>
            <input
              type="text"
              value={settings.baseUrl}
              onChange={(e) =>
                setSettings({ ...settings, baseUrl: e.target.value })
              }
              placeholder="https://api.openai.com/v1"
            />
          </div>

          {/* Model Name */}
          <div className="form-group">
            <label>Model</label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value })
              }
              placeholder="gpt-4o-mini, qwen2.5, etc."
            />
          </div>

          {/* API Key */}
          <div className="form-group">
            <label>API Key</label>
            <div className="input-with-action">
              <input
                type={showApiKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) =>
                  setSettings({ ...settings, apiKey: e.target.value })
                }
                placeholder="sk-... or leave empty for local models"
              />
              <button
                type="button"
                className="toggle-vis-btn"
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? "Hide API Key" : "Show API Key"}
              >
                {showApiKey ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* System Prompt */}
          <div className="form-group">
            <label>System Prompt</label>
            <textarea
              rows={4}
              value={settings.systemPrompt}
              onChange={(e) =>
                setSettings({ ...settings, systemPrompt: e.target.value })
              }
            />
          </div>

          {/* Test Status Box */}
          {testResult && (
            <div
              className={`test-status-box ${
                testResult.success ? "success" : "error"
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              {isTesting ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveSettings}
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="zenuxs-ai-toast">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
