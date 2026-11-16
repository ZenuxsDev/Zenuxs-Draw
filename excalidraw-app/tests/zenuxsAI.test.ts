import { describe, it, expect, vi } from "vitest";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import {
  extractCanvasStyle,
  normalizeSkeletonElement,
  executeCreateElements,
  executeGetCanvasElements,
} from "../services/zenuxsAI/canvasTools";
import {
  exportCanvasAsJSON,
  exportCanvasElementsOnly,
  getCanvasJSONString,
  exportChatAsJSON,
  exportChatAsMarkdown,
  getChatMarkdownString,
  copyTextToClipboard,
} from "../services/zenuxsAI/exportUtils";

import type { ChatConversation } from "../services/zenuxsAI/types";

describe("Zenuxs AI - Style Extraction & Inheritance", () => {
  it("extracts dominant style from existing canvas elements", () => {
    const mockElements = [
      {
        id: "1",
        type: "rectangle",
        isDeleted: false,
        strokeColor: "#1971c2",
        backgroundColor: "#a5d8ff",
        fillStyle: "solid",
        strokeWidth: 2,
        roughness: 0,
        x: 100,
        y: 100,
        width: 180,
        height: 80,
      },
      {
        id: "2",
        type: "rectangle",
        isDeleted: false,
        strokeColor: "#1971c2",
        backgroundColor: "#a5d8ff",
        fillStyle: "solid",
        strokeWidth: 2,
        roughness: 0,
        x: 350,
        y: 100,
        width: 180,
        height: 80,
      },
    ] as unknown as ExcalidrawElement[];

    const style = extractCanvasStyle(mockElements, { theme: "light" });

    expect(style.dominantStrokeColor).toBe("#1971c2");
    expect(style.dominantBackgroundColor).toBe("#a5d8ff");
    expect(style.dominantFillStyle).toBe("solid");
    expect(style.dominantStrokeWidth).toBe(2);
    expect(style.dominantRoughness).toBe(0);
  });

  it("handles dark mode without picking black strokes", () => {
    const mockElements = [
      {
        id: "1",
        type: "rectangle",
        isDeleted: false,
        strokeColor: "#1e1e1e",
        backgroundColor: "transparent",
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      },
    ] as unknown as ExcalidrawElement[];

    const style = extractCanvasStyle(mockElements, { theme: "dark" });
    expect(style.isDarkTheme).toBe(true);
    expect(style.dominantStrokeColor).toBe("#e9ecef");
  });

  it("normalizes skeleton elements and inherits canvas style", () => {
    const style = {
      dominantStrokeColor: "#2f9e44",
      dominantBackgroundColor: "#b2f2bb",
      dominantFillStyle: "solid" as const,
      dominantStrokeWidth: 2,
      dominantStrokeStyle: "solid" as const,
      dominantRoughness: 0,
      palette: { strokeColors: ["#2f9e44"], backgroundColors: ["#b2f2bb"] },
      isDarkTheme: false,
    };

    const raw = {
      type: "rectangle",
      text: "Test Box",
      x: 100,
      y: 100,
    };

    const normalized = normalizeSkeletonElement(raw, style);

    expect(normalized.strokeColor).toBe("#2f9e44");
    expect(normalized.backgroundColor).toBe("#b2f2bb");
    expect(normalized.fillStyle).toBe("solid");
    expect(normalized.strokeWidth).toBe(2);
    expect(normalized.roughness).toBe(0);
    expect(normalized.label.text).toBe("Test Box");
  });

  it("prevents frame crash and safely converts to dashed container rectangle", () => {
    const rawFrame = {
      type: "frame",
      name: "My Frame",
      x: 50,
      y: 50,
      width: 400,
      height: 300,
    };

    const normalized = normalizeSkeletonElement(rawFrame);
    expect(normalized.type).toBe("rectangle");
    expect(normalized.strokeStyle).toBe("dashed");
    expect(normalized.children).toBeUndefined();
    expect(normalized.label.text).toBe("My Frame");
  });
});

describe("Zenuxs AI - Spatial Placement & Downstream Offset", () => {
  it("automatically places elements below existing content when requested 'down it'", () => {
    const existing = [
      {
        id: "exist_1",
        type: "rectangle",
        isDeleted: false,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      },
    ] as unknown as ExcalidrawElement[];

    let capturedElements: any[] = [];
    const mockAPI: any = {
      getAppState: () => ({ theme: "light" }),
      getSceneElements: () => existing,
      updateScene: vi.fn(({ elements }) => {
        capturedElements = elements;
      }),
      setViewport: vi.fn(),
    };

    const newSkeletons = [
      {
        type: "rectangle",
        x: 100,
        y: 100, // LLM tried placing at same y: 100
        width: 180,
        height: 80,
        text: "Database Service",
      },
    ];

    executeCreateElements(
      mockAPI,
      { elements: newSkeletons },
      "you make a another good structure, down it t",
    );

    // Existing maxY is 100 + 150 = 250.
    // New element target Y should be >= 250 + 140 = 390.
    const createdEl = capturedElements.find((el) => el.id !== "exist_1");
    expect(createdEl).toBeDefined();
    expect(createdEl.y).toBeGreaterThanOrEqual(390);
  });

  it("automatically shifts elements when they overlap existing elements", () => {
    const existing = [
      {
        id: "exist_1",
        type: "rectangle",
        isDeleted: false,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      },
    ] as unknown as ExcalidrawElement[];

    let capturedElements: any[] = [];
    const mockAPI: any = {
      getAppState: () => ({ theme: "light" }),
      getSceneElements: () => existing,
      updateScene: vi.fn(({ elements }) => {
        capturedElements = elements;
      }),
      setViewport: vi.fn(),
    };

    // LLM forgot to specify placement, but elements collide with existing (100, 100)
    const newSkeletons = [
      {
        type: "rectangle",
        x: 120,
        y: 120,
        width: 150,
        height: 60,
        text: "Overlapping Box",
      },
    ];

    executeCreateElements(mockAPI, { elements: newSkeletons });

    const createdEl = capturedElements.find((el) => el.id !== "exist_1");
    expect(createdEl).toBeDefined();
    // Overlap prevention should push it below existing diagram (250 + 140 = 390)
    expect(createdEl.y).toBeGreaterThanOrEqual(390);
  });

  it("includes canvas style and open space recommendations in executeGetCanvasElements", () => {
    const existing = [
      {
        id: "exist_1",
        type: "rectangle",
        isDeleted: false,
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        strokeColor: "#e03131",
      },
    ] as unknown as ExcalidrawElement[];

    const mockAPI: any = {
      getAppState: () => ({ theme: "light", selectedElementIds: {} }),
      getSceneElements: () => existing,
    };

    const result = executeGetCanvasElements(mockAPI, {});
    expect(result.canvas_bounds).toBeDefined();
    expect(result.canvas_bounds?.maxY).toBe(150);
    expect(result.canvas_style.dominantStrokeColor).toBe("#e03131");
    expect(result.open_space_recommendations.below_existing?.y).toBe(290); // 150 + 140
  });
});

describe("Zenuxs AI - Multi-Chat & Permanent Storage", () => {
  it("creates, saves, and loads multiple conversations in persistent storage", async () => {
    const {
      createNewConversation,
      loadConversations,
      saveConversations,
      generateTitleFromPrompt,
    } = await import("../services/zenuxsAI/chatStorage");

    const conv1 = createNewConversation("Diagram 1");
    const conv2 = createNewConversation("Diagram 2");

    saveConversations([conv1, conv2]);
    const loaded = loadConversations();

    expect(loaded.length).toBe(2);
    expect(loaded[0].id).toBe(conv1.id);
    expect(loaded[1].id).toBe(conv2.id);

    const title = generateTitleFromPrompt(
      "Draw a complete user registration workflow",
    );
    expect(title).toBe("Draw a complete user registratio...");
  });
});

describe("Zenuxs AI - Edit & Update Tool", () => {
  it("edits and updates existing elements by id", async () => {
    const { executeCanvasTool, executeUpdateElements } = await import(
      "../services/zenuxsAI/canvasTools"
    );

    const existingElements: any[] = [
      {
        id: "box_1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 150,
        height: 80,
        backgroundColor: "transparent",
        strokeColor: "#1e1e1e",
        isDeleted: false,
      },
    ];

    let capturedElements: any[] = [];
    const mockAPI: any = {
      getSceneElements: () => existingElements,
      updateScene: vi.fn(({ elements }) => {
        capturedElements = elements;
      }),
    };

    // Test executeUpdateElements with single update object
    const updateResult = executeUpdateElements(mockAPI, {
      id: "box_1",
      backgroundColor: "#b2f2bb",
      strokeColor: "#2f9e44",
      text: "Updated Service",
    });

    expect(updateResult.success).toBe(true);
    expect(capturedElements.length).toBe(1);
    expect(capturedElements[0].backgroundColor).toBe("#b2f2bb");
    expect(capturedElements[0].strokeColor).toBe("#2f9e44");

    // Test alias 'edit_elements' through executeCanvasTool
    const aliasResult: any = executeCanvasTool(mockAPI, "edit_elements", {
      updates: [{ id: "box_1", x: 250, y: 300 }],
    });

    expect(aliasResult.success).toBe(true);
    expect(capturedElements[0].x).toBe(250);
    expect(capturedElements[0].y).toBe(300);
  });
});

describe("Zenuxs AI - Auto-Layout & Arrow Alignment", () => {
  it("auto-expands box dimensions based on multi-line text", async () => {
    const { normalizeSkeletonElement } = await import(
      "../services/zenuxsAI/canvasTools"
    );

    const longText = Array(20).fill("field_name: varchar(255)").join("\n");
    const raw = {
      type: "rectangle",
      text: longText,
      width: 100, // LLM tried giving small box
      height: 80,
    };

    const normalized = normalizeSkeletonElement(raw);
    // 20 lines * 22px + 45px = ~485px
    expect(normalized.height).toBeGreaterThanOrEqual(450);
    expect(normalized.width).toBeGreaterThanOrEqual(180);
  });

  it("resolves overlapping boxes in the same column and aligns arrow endpoints to perimeters", async () => {
    const { resolveInternalCollisionsAndAlignArrows } = await import(
      "../services/zenuxsAI/canvasTools"
    );

    const skeletons = [
      {
        id: "source_parent",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 250,
        height: 400,
      },
      {
        id: "child_top",
        type: "rectangle",
        x: 500,
        y: 100,
        width: 200,
        height: 200,
      },
      {
        id: "child_bottom",
        type: "rectangle",
        x: 500,
        y: 180, // Colliding with child_top (which ends at y=300)!
        width: 200,
        height: 200,
      },
      {
        id: "arrow_to_top",
        type: "arrow",
        start: { id: "source_parent" },
        end: { id: "child_top" },
      },
      {
        id: "arrow_to_bottom",
        type: "arrow",
        start: { id: "source_parent" },
        end: { id: "child_bottom" },
      },
    ];

    resolveInternalCollisionsAndAlignArrows(skeletons);

    const childTop: any = skeletons.find((s) => s.id === "child_top");
    const childBottom: any = skeletons.find((s) => s.id === "child_bottom");
    const arrowBottom: any = skeletons.find((s) => s.id === "arrow_to_bottom");

    // Child bottom should have been pushed down past childTop (100 + 200 + 55 = 355)
    expect(childBottom.y).toBeGreaterThanOrEqual(
      childTop.y + childTop.height + 50,
    );

    // Arrow to bottom should exit from right edge of source (x=350) and arrive at left edge of child_bottom (x=500)
    expect(arrowBottom.x).toBe(350);
    expect(arrowBottom.points[1][0]).toBe(500 - 350); // delta X = 150
  });
});

describe("Zenuxs AI - Direct Export Utilities", () => {
  it("serializes canvas diagram to JSON and elements array to JSON", () => {
    const mockElements = [
      { id: "el1", type: "rectangle", x: 10, y: 10, isDeleted: false },
      { id: "el2", type: "text", text: "Hello", isDeleted: false },
      { id: "el3", type: "rectangle", isDeleted: true },
    ];
    const mockAPI: any = {
      getSceneElements: vi.fn(() => mockElements),
      getAppState: vi.fn(() => ({ theme: "light" })),
      getFiles: vi.fn(() => ({})),
    };

    const canvasJson = getCanvasJSONString(mockAPI);
    expect(typeof canvasJson).toBe("string");
    const parsed = JSON.parse(canvasJson);
    expect(parsed.type).toBe("excalidraw");
    expect(parsed.elements.length).toBeGreaterThanOrEqual(1);

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    exportCanvasAsJSON(mockAPI, "my-canvas.json");
    expect(clickSpy).toHaveBeenCalledTimes(1);

    exportCanvasElementsOnly(mockAPI, "my-elements.json");
    expect(clickSpy).toHaveBeenCalledTimes(2);
    clickSpy.mockRestore();
  });

  it("exports chat history to JSON and formatted Markdown", () => {
    const mockConversation: ChatConversation = {
      id: "conv_test",
      title: "Architecture Planning",
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
      messages: [
        {
          id: "msg_1",
          role: "user",
          content: "Draw a system architecture diagram",
          timestamp: 1700000001000,
        },
        {
          id: "msg_2",
          role: "assistant",
          content: "Here is your system architecture diagram.",
          toolExecutions: [
            {
              id: "tool_1",
              name: "create_elements",
              args: {},
              status: "success",
            },
          ],
          timestamp: 1700000004000,
        },
      ],
    };

    const md = getChatMarkdownString(mockConversation);
    expect(md).toContain("# Architecture Planning");
    expect(md).toContain("Draw a system architecture diagram");
    expect(md).toContain("`create_elements` (success)");
    expect(md).toContain("Here is your system architecture diagram.");

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    exportChatAsJSON(mockConversation);
    expect(clickSpy).toHaveBeenCalled();

    exportChatAsMarkdown(mockConversation);
    expect(clickSpy).toHaveBeenCalledTimes(2);
    clickSpy.mockRestore();
  });

  it("copies text to clipboard with fallback support", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    const success = await copyTextToClipboard("Test content to copy");
    expect(success).toBe(true);
    expect(writeTextSpy).toHaveBeenCalledWith("Test content to copy");
  });
});
