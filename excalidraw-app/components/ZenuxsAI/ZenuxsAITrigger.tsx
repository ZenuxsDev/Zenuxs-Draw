import React, { useEffect } from "react";

import "./ZenuxsAI.scss";

interface ZenuxsAITriggerProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ZenuxsAITrigger: React.FC<ZenuxsAITriggerProps> = ({
  isOpen,
  onToggle,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + A (or Option + A on Mac)
      if (e.altKey && (e.key === "a" || e.key === "A" || e.code === "KeyA")) {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle]);

  return (
    <button
      className="zenuxs-ai-trigger-btn"
      onClick={onToggle}
      title="Toggle Zenuxs AI Assistant (Alt+A)"
    >
      <span className="sparkle-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.4 7.2L20 8L16 12.4L17.2 18L12 15L6.8 18L8 12.4L4 8L9.6 7.2L12 2Z" />
        </svg>
      </span>
      <span>{isOpen ? "Close AI" : "Zenuxs AI"}</span>
      <span className="hotkey-badge">Alt+A</span>
    </button>
  );
};
