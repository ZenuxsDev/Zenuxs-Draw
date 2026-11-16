import {
  convertToExcalidrawElements,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
} from "@excalidraw/element/types";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export const ZENUXS_AI_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_canvas_elements",
      description:
        "Reads all elements currently on the canvas (shapes, text, arrows, sticky notes, etc.), including their IDs, coordinates (x, y), dimensions (width, height), labels/text, colors, and arrow connections. Can optionally filter to selected elements.",
      parameters: {
        type: "object",
        properties: {
          selected_only: {
            type: "boolean",
            description:
              "If true, only returns elements currently selected by the user.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_elements",
      description:
        "Creates new elements on the canvas (rectangles, ellipses, diamonds, text, arrows, lines, sticky notes). To group sections or create boundary containers, use a 'rectangle' with strokeStyle: 'dashed' and a label. Arrows can bind to shapes by specifying start and end with the shape IDs (e.g. start: { id: 'node_1' }, end: { id: 'node_2' }).",
      parameters: {
        type: "object",
        properties: {
          elements: {
            type: "array",
            description: "List of element skeletons to create.",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "rectangle",
                    "ellipse",
                    "diamond",
                    "text",
                    "arrow",
                    "line",
                    "stickynote",
                  ],
                  description: "Shape type",
                },
                id: {
                  type: "string",
                  description:
                    "Unique ID for this element. Highly recommended when you want arrows to connect to this element.",
                },
                x: {
                  type: "number",
                  description: "X coordinate on the canvas",
                },
                y: {
                  type: "number",
                  description: "Y coordinate on the canvas",
                },
                width: {
                  type: "number",
                  description:
                    "Width of the element (e.g. 180 for rectangles, 200 for sticky notes)",
                },
                height: {
                  type: "number",
                  description:
                    "Height of the element (e.g. 80 for rectangles, 200 for sticky notes)",
                },
                text: {
                  type: "string",
                  description:
                    "Text content for text elements or label for shapes/sticky notes.",
                },
                label: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    fontSize: { type: "number" },
                    strokeColor: { type: "string" },
                  },
                  description:
                    "Label to render inside the container shape or along the arrow.",
                },
                strokeColor: {
                  type: "string",
                  description:
                    "Hex color code for border or stroke (e.g. #1e1e1e, #1971c2, #2b8a3e, #e03131, #6741d9).",
                },
                backgroundColor: {
                  type: "string",
                  description:
                    "Hex color code for background fill (e.g. #d0ebff, #d3f9d8, #ffe8cc, #eebefa, #f1f3f5, transparent).",
                },
                fillStyle: {
                  type: "string",
                  enum: ["hachure", "cross-hatch", "solid"],
                  description: "Fill pattern style",
                },
                strokeWidth: {
                  type: "number",
                  description: "Stroke line width (typically 1, 2, or 4)",
                },
                strokeStyle: {
                  type: "string",
                  enum: ["solid", "dashed", "dotted"],
                  description: "Border line style",
                },
                start: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description:
                        "ID of source shape to attach arrow start to",
                    },
                  },
                  description: "Source binding for arrow",
                },
                end: {
                  type: "object",
                  properties: {
                    id: {
                      type: "string",
                      description: "ID of target shape to attach arrow end to",
                    },
                  },
                  description: "Target binding for arrow",
                },
                startArrowhead: {
                  type: "string",
                  enum: ["arrow", "bar", "dot", "triangle"],
                },
                endArrowhead: {
                  type: "string",
                  enum: ["arrow", "bar", "dot", "triangle"],
                  description: "Arrowhead style at end (default 'arrow')",
                },
              },
              required: ["type", "x", "y"],
            },
          },
          scrollToContent: {
            type: "boolean",
            description:
              "Whether to zoom and pan the canvas to frame the newly created elements (default: true).",
          },
        },
        required: ["elements"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_elements",
      description:
        "Modifies existing elements on the canvas by their IDs (change text, colors, positions, sizes, or styling).",
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "The ID of the element to update",
                },
                x: { type: "number" },
                y: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
                strokeColor: { type: "string" },
                backgroundColor: { type: "string" },
                fillStyle: {
                  type: "string",
                  enum: ["hachure", "cross-hatch", "solid"],
                },
                strokeStyle: {
                  type: "string",
                  enum: ["solid", "dashed", "dotted"],
                },
                strokeWidth: { type: "number" },
                text: {
                  type: "string",
                  description: "New text or label content",
                },
              },
              required: ["id"],
            },
          },
        },
        required: ["updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_elements",
      description: "Deletes elements from the canvas by their IDs.",
      parameters: {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
            description: "IDs of elements to delete",
          },
        },
        required: ["ids"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_canvas",
      description: "Clears all elements from the canvas.",
      parameters: {
        type: "object",
        properties: {
          confirm: {
            type: "boolean",
            description: "Must be set to true to clear the canvas.",
          },
        },
        required: ["confirm"],
      },
    },
  },
];

// Helper to extract text from an element or its bound text element
export const getElementLabelOrText = (
  element: ExcalidrawElement,
  elementsMap: Map<string, ExcalidrawElement>,
): string | null => {
  if (element.type === "text") {
    return (element as ExcalidrawTextElement).text || "";
  }

  if (element.boundElements) {
    for (const bound of element.boundElements) {
      if (bound.type === "text") {
        const textEl = elementsMap.get(bound.id);
        if (textEl && textEl.type === "text" && !textEl.isDeleted) {
          return (textEl as ExcalidrawTextElement).text || "";
        }
      }
    }
  }

  return null;
};

export interface CanvasStyleProfile {
  dominantStrokeColor: string;
  dominantBackgroundColor: string;
  dominantFillStyle: "solid" | "hachure" | "cross-hatch" | "dots";
  dominantStrokeWidth: number;
  dominantStrokeStyle: "solid" | "dashed" | "dotted";
  dominantRoughness: number;
  dominantFontFamily?: number;
  palette: {
    strokeColors: string[];
    backgroundColors: string[];
  };
  isDarkTheme: boolean;
}

// Inspect active canvas elements and app state to detect user's design style
export const extractCanvasStyle = (
  elements: readonly ExcalidrawElement[],
  appState?: any,
): CanvasStyleProfile => {
  const isDark =
    appState?.theme === "dark" ||
    appState?.viewBackgroundColor === "#121212" ||
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const active = elements.filter((el) => !el.isDeleted);

  const strokeColorCount = new Map<string, number>();
  const backgroundColorCount = new Map<string, number>();
  const fillStyleCount = new Map<string, number>();
  const strokeWidthCount = new Map<number, number>();
  const strokeStyleCount = new Map<string, number>();
  const roughnessCount = new Map<number, number>();
  const fontFamilyCount = new Map<number, number>();

  for (const el of active) {
    if (el.strokeColor) {
      strokeColorCount.set(
        el.strokeColor,
        (strokeColorCount.get(el.strokeColor) || 0) + 1,
      );
    }
    if (el.backgroundColor && el.backgroundColor !== "transparent") {
      backgroundColorCount.set(
        el.backgroundColor,
        (backgroundColorCount.get(el.backgroundColor) || 0) + 1,
      );
    }
    if (el.fillStyle) {
      fillStyleCount.set(
        el.fillStyle,
        (fillStyleCount.get(el.fillStyle) || 0) + 1,
      );
    }
    if (el.strokeWidth) {
      strokeWidthCount.set(
        el.strokeWidth,
        (strokeWidthCount.get(el.strokeWidth) || 0) + 1,
      );
    }
    if (el.strokeStyle) {
      strokeStyleCount.set(
        el.strokeStyle,
        (strokeStyleCount.get(el.strokeStyle) || 0) + 1,
      );
    }
    if (typeof el.roughness === "number") {
      roughnessCount.set(
        el.roughness,
        (roughnessCount.get(el.roughness) || 0) + 1,
      );
    }
    if (el.type === "text" && (el as any).fontFamily) {
      fontFamilyCount.set(
        (el as any).fontFamily,
        (fontFamilyCount.get((el as any).fontFamily) || 0) + 1,
      );
    }
  }

  const getMostFrequent = <T>(map: Map<T, number>, fallback: T): T => {
    let best = fallback;
    let max = 0;
    for (const [key, count] of map.entries()) {
      if (count > max) {
        max = count;
        best = key;
      }
    }
    return best;
  };

  // Determine dominant stroke color
  let dominantStrokeColor = isDark ? "#e9ecef" : "#1e1e1e";
  if (appState?.currentItemStrokeColor) {
    dominantStrokeColor = appState.currentItemStrokeColor;
  }
  if (strokeColorCount.size > 0) {
    if (isDark && strokeColorCount.size > 1) {
      strokeColorCount.delete("#1e1e1e");
      strokeColorCount.delete("#000000");
    }
    dominantStrokeColor = getMostFrequent(
      strokeColorCount,
      dominantStrokeColor,
    );
  }
  if (
    isDark &&
    (dominantStrokeColor === "#1e1e1e" || dominantStrokeColor === "#000000")
  ) {
    dominantStrokeColor = "#e9ecef";
  }

  // Determine dominant background color
  let dominantBackgroundColor = "transparent";
  if (
    appState?.currentItemBackgroundColor &&
    appState.currentItemBackgroundColor !== "transparent"
  ) {
    dominantBackgroundColor = appState.currentItemBackgroundColor;
  }
  if (backgroundColorCount.size > 0) {
    dominantBackgroundColor = getMostFrequent(
      backgroundColorCount,
      dominantBackgroundColor,
    );
  }

  const dominantFillStyle = getMostFrequent<
    "solid" | "hachure" | "cross-hatch" | "dots"
  >(fillStyleCount as any, (appState?.currentItemFillStyle as any) || "solid");

  const dominantStrokeWidth = getMostFrequent<number>(
    strokeWidthCount,
    appState?.currentItemStrokeWidth || 1,
  );

  const dominantStrokeStyle = getMostFrequent<"solid" | "dashed" | "dotted">(
    strokeStyleCount as any,
    (appState?.currentItemStrokeStyle as any) || "solid",
  );

  const dominantRoughness = getMostFrequent<number>(
    roughnessCount,
    typeof appState?.currentItemRoughness === "number"
      ? appState.currentItemRoughness
      : 1,
  );

  const dominantFontFamily = getMostFrequent<number>(
    fontFamilyCount,
    appState?.currentItemFontFamily || 1,
  );

  return {
    dominantStrokeColor,
    dominantBackgroundColor,
    dominantFillStyle,
    dominantStrokeWidth,
    dominantStrokeStyle,
    dominantRoughness,
    dominantFontFamily,
    palette: {
      strokeColors: Array.from(strokeColorCount.keys()),
      backgroundColors: Array.from(backgroundColorCount.keys()),
    },
    isDarkTheme: isDark,
  };
};

// Tool: get_canvas_elements
export const executeGetCanvasElements = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  args: { selected_only?: boolean },
) => {
  const elements = excalidrawAPI.getSceneElements();
  const appState = excalidrawAPI.getAppState();
  const elementsMap = new Map<string, ExcalidrawElement>();

  for (const el of elements) {
    elementsMap.set(el.id, el);
  }

  const nonDeleted = elements.filter((el) => !el.isDeleted);
  const filtered = args.selected_only
    ? nonDeleted.filter((el) => appState.selectedElementIds[el.id])
    : nonDeleted;

  // Don't duplicate standalone bound text elements in the listing if their container is already listed
  const containerTextIds = new Set<string>();
  for (const el of filtered) {
    if (el.boundElements) {
      for (const b of el.boundElements) {
        if (b.type === "text") {
          containerTextIds.add(b.id);
        }
      }
    }
  }

  const summarizedElements = filtered
    .filter((el) => !containerTextIds.has(el.id))
    .map((el) => {
      const text = getElementLabelOrText(el, elementsMap);
      const item: Record<string, any> = {
        id: el.id,
        type: el.type,
        x: Math.round(el.x),
        y: Math.round(el.y),
        width: Math.round(el.width),
        height: Math.round(el.height),
      };

      if (text) {
        item.text = text;
      }
      if (el.strokeColor && el.strokeColor !== "#1e1e1e") {
        item.strokeColor = el.strokeColor;
      }
      if (el.backgroundColor && el.backgroundColor !== "transparent") {
        item.backgroundColor = el.backgroundColor;
      }
      if (el.type === "arrow") {
        const arrow = el as any;
        if (arrow.startBinding?.elementId) {
          item.startBinding = arrow.startBinding.elementId;
        }
        if (arrow.endBinding?.elementId) {
          item.endBinding = arrow.endBinding.elementId;
        }
      }

      return item;
    });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of filtered) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }

  const styleProfile = extractCanvasStyle(filtered, appState);

  return {
    total_elements: summarizedElements.length,
    selected_only: !!args.selected_only,
    canvas_bounds:
      summarizedElements.length > 0
        ? {
            minX: Math.round(minX),
            minY: Math.round(minY),
            maxX: Math.round(maxX),
            maxY: Math.round(maxY),
            width: Math.round(maxX - minX),
            height: Math.round(maxY - minY),
            centerX: Math.round((minX + maxX) / 2),
            centerY: Math.round((minY + maxY) / 2),
          }
        : null,
    canvas_style: {
      dominantStrokeColor: styleProfile.dominantStrokeColor,
      dominantBackgroundColor: styleProfile.dominantBackgroundColor,
      dominantFillStyle: styleProfile.dominantFillStyle,
      dominantStrokeWidth: styleProfile.dominantStrokeWidth,
      dominantRoughness: styleProfile.dominantRoughness,
      isDarkTheme: styleProfile.isDarkTheme,
      palette: styleProfile.palette,
    },
    open_space_recommendations:
      summarizedElements.length > 0
        ? {
            below_existing: {
              instruction:
                "Place new diagrams or structures down below the existing content",
              x: Math.round(minX),
              y: Math.round(maxY + 140),
            },
            right_of_existing: {
              instruction:
                "Place new elements to the right of existing content",
              x: Math.round(maxX + 140),
              y: Math.round(minY),
            },
          }
        : {
            start: {
              instruction: "Canvas is empty, start at default coordinates",
              x: 100,
              y: 100,
            },
          },
    elements: summarizedElements,
  };
};

// Helper: Normalize incoming element skeletons and inherit active canvas style
export const normalizeSkeletonElement = (
  raw: any,
  canvasStyle?: CanvasStyleProfile,
): any => {
  const el = { ...raw };

  // Normalize shape type aliases
  const rawType = String(el.type || "rectangle").toLowerCase();
  if (rawType === "box" || rawType === "square" || rawType === "container") {
    el.type = "rectangle";
  } else if (rawType === "circle") {
    el.type = "ellipse";
  } else if (rawType === "rhombus" || rawType === "decision") {
    el.type = "diamond";
  } else if (rawType === "note" || rawType === "sticky") {
    el.type = "stickynote";
  } else if (rawType === "connector") {
    el.type = "arrow";
  } else {
    el.type = rawType;
  }

  // Safe fallback for frame or magicframe:
  // Excalidraw convertToExcalidrawElements crashes on element.children.forEach if children is undefined.
  // Convert frame to a styled group container rectangle
  if (el.type === "frame" || el.type === "magicframe") {
    el.type = "rectangle";
    el.strokeStyle = el.strokeStyle || "dashed";
    el.strokeColor =
      el.strokeColor || (canvasStyle?.isDarkTheme ? "#868e96" : "#495057");
    el.backgroundColor = el.backgroundColor || "transparent";
    const frameLabel =
      el.name || el.title || (el.label?.text ? el.label.text : undefined);
    if (frameLabel && !el.label) {
      el.label = {
        text: String(frameLabel),
        textAlign: "left",
        verticalAlign: "top",
      };
    }
  }

  // Clean dangerous properties that could cause forEach / undefined crashes
  delete el.children;
  delete el.name;
  delete el.title;
  if (el.boundElements && !Array.isArray(el.boundElements)) {
    delete el.boundElements;
  }
  if (el.groupIds && !Array.isArray(el.groupIds)) {
    delete el.groupIds;
  }

  // Ensure valid ID
  if (!el.id) {
    el.id = `elem_${Math.random().toString(36).substring(2, 9)}`;
  } else {
    el.id = String(el.id);
  }

  // Ensure valid coordinates
  el.x = typeof el.x === "number" && !isNaN(el.x) ? Math.round(el.x) : 100;
  el.y = typeof el.y === "number" && !isNaN(el.y) ? Math.round(el.y) : 100;

  // Set default dimensions if not provided
  if (
    el.width === undefined ||
    typeof el.width !== "number" ||
    isNaN(el.width)
  ) {
    if (el.type === "rectangle") {
      el.width = 180;
    } else if (el.type === "ellipse") {
      el.width = 160;
    } else if (el.type === "diamond") {
      el.width = 160;
    } else if (el.type === "stickynote") {
      el.width = 200;
    } else if (el.type === "arrow" || el.type === "line") {
      el.width = 140;
    } else {
      el.width = 100;
    }
  }
  if (
    el.height === undefined ||
    typeof el.height !== "number" ||
    isNaN(el.height)
  ) {
    if (el.type === "rectangle") {
      el.height = 80;
    } else if (el.type === "ellipse") {
      el.height = 80;
    } else if (el.type === "diamond") {
      el.height = 100;
    } else if (el.type === "stickynote") {
      el.height = 200;
    } else if (el.type === "arrow" || el.type === "line") {
      el.height = 0;
    } else {
      el.height = 80;
    }
  }

  // Normalize text / label for container shapes and sticky notes
  if (el.text && !el.label && el.type !== "text") {
    el.label = { text: String(el.text) };
    delete el.text;
  } else if (el.label && typeof el.label === "string") {
    el.label = { text: el.label };
  } else if (el.type === "text") {
    el.text = el.text
      ? String(el.text)
      : el.label?.text
      ? String(el.label.text)
      : "Text";
  }

  // Handle arrows: ensure points array and endArrowhead defaults
  if (el.type === "arrow" || el.type === "line") {
    if (!Array.isArray(el.points) || el.points.length < 2) {
      el.points = [
        [0, 0],
        [el.width || 140, el.height || 0],
      ];
    }
    if (el.type === "arrow" && !el.endArrowhead) {
      el.endArrowhead = "arrow";
    }

    // Support start / startBinding
    if (typeof el.start === "string") {
      el.start = { id: el.start };
    } else if (el.startBinding) {
      const bId =
        typeof el.startBinding === "string"
          ? el.startBinding
          : el.startBinding.elementId;
      if (bId) {
        el.start = { id: String(bId) };
      }
    }
    if (el.start && typeof el.start === "object" && el.start.id) {
      el.start = { ...el.start, id: String(el.start.id) };
    } else {
      delete el.start;
    }

    // Support end / endBinding
    if (typeof el.end === "string") {
      el.end = { id: el.end };
    } else if (el.endBinding) {
      const bId =
        typeof el.endBinding === "string"
          ? el.endBinding
          : el.endBinding.elementId;
      if (bId) {
        el.end = { id: String(bId) };
      }
    }
    if (el.end && typeof el.end === "object" && el.end.id) {
      el.end = { ...el.end, id: String(el.end.id) };
    } else {
      delete el.end;
    }

    // Prevent self-binding arrows
    if (el.start?.id && el.end?.id && el.start.id === el.end.id) {
      delete el.end;
    }
  }

  // --- Visual Style Inheritance & Matching ---
  if (canvasStyle) {
    // Stroke Color:
    if (
      !el.strokeColor ||
      el.strokeColor === "#1e1e1e" ||
      el.strokeColor === "#000000"
    ) {
      if (canvasStyle.isDarkTheme) {
        el.strokeColor =
          canvasStyle.dominantStrokeColor !== "#1e1e1e" &&
          canvasStyle.dominantStrokeColor !== "#000000"
            ? canvasStyle.dominantStrokeColor
            : "#e9ecef";
      } else if (
        canvasStyle.dominantStrokeColor &&
        canvasStyle.dominantStrokeColor !== "#1e1e1e"
      ) {
        el.strokeColor = canvasStyle.dominantStrokeColor;
      } else if (!el.strokeColor) {
        el.strokeColor = "#1e1e1e";
      }
    }

    // Background color for shapes:
    if (
      el.type === "rectangle" ||
      el.type === "ellipse" ||
      el.type === "diamond"
    ) {
      if (
        (!el.backgroundColor || el.backgroundColor === "transparent") &&
        canvasStyle.dominantBackgroundColor &&
        canvasStyle.dominantBackgroundColor !== "transparent"
      ) {
        el.backgroundColor = canvasStyle.dominantBackgroundColor;
      }
    }

    // Fill style:
    if (
      el.backgroundColor &&
      el.backgroundColor !== "transparent" &&
      !el.fillStyle
    ) {
      el.fillStyle = canvasStyle.dominantFillStyle || "solid";
    }

    // Stroke width:
    if (el.strokeWidth === undefined && canvasStyle.dominantStrokeWidth) {
      el.strokeWidth = canvasStyle.dominantStrokeWidth;
    }

    // Roughness:
    if (
      el.roughness === undefined &&
      typeof canvasStyle.dominantRoughness === "number"
    ) {
      el.roughness = canvasStyle.dominantRoughness;
    }
  } else {
    if (!el.strokeColor) {
      el.strokeColor = "#1e1e1e";
    }
    if (
      el.backgroundColor &&
      el.backgroundColor !== "transparent" &&
      !el.fillStyle
    ) {
      el.fillStyle = "solid";
    }
  }

  return el;
};

// Tool: create_elements
export const executeCreateElements = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  args: any,
  userPrompt?: string,
) => {
  const rawElements = Array.isArray(args) ? args : args?.elements;
  if (!rawElements || !Array.isArray(rawElements) || rawElements.length === 0) {
    return { success: false, error: "No elements provided to create" };
  }

  const appState = excalidrawAPI.getAppState();
  const existingElements = excalidrawAPI
    .getSceneElements()
    .filter((el) => !el.isDeleted);
  const styleProfile = extractCanvasStyle(existingElements, appState);

  // Normalize skeletons and inherit style
  const normalizedSkeletons = rawElements.map((raw) =>
    normalizeSkeletonElement(raw, styleProfile),
  );

  // --- Spatial Placement & Overlap Prevention ---
  if (existingElements.length > 0 && normalizedSkeletons.length > 0) {
    let existMinX = Infinity;
    let existMinY = Infinity;
    let existMaxX = -Infinity;
    let existMaxY = -Infinity;
    for (const el of existingElements) {
      existMinX = Math.min(existMinX, el.x);
      existMinY = Math.min(existMinY, el.y);
      existMaxX = Math.max(existMaxX, el.x + (el.width || 0));
      existMaxY = Math.max(existMaxY, el.y + (el.height || 0));
    }

    let newMinX = Infinity;
    let newMinY = Infinity;
    let newMaxX = -Infinity;
    let newMaxY = -Infinity;
    for (const el of normalizedSkeletons) {
      newMinX = Math.min(newMinX, el.x);
      newMinY = Math.min(newMinY, el.y);
      newMaxX = Math.max(newMaxX, el.x + (el.width || 0));
      newMaxY = Math.max(newMaxY, el.y + (el.height || 0));
    }

    const promptText = (userPrompt || "").toLowerCase();
    const indicatesDown =
      /\b(down|below|under|beneath|bottom|after|next structure|new structure|another structure)\b/i.test(
        promptText,
      );
    const indicatesRight = /\b(right|beside|next to|side)\b/i.test(promptText);
    const indicatesReplace = /\b(replace|overwrite|update existing)\b/i.test(
      promptText,
    );

    const isOverlapping = !(
      newMaxX < existMinX - 20 ||
      newMinX > existMaxX + 20 ||
      newMaxY < existMinY - 20 ||
      newMinY > existMaxY + 20
    );

    // If user asked to place down/below, OR elements overlap and user didn't ask to replace:
    if (
      indicatesDown ||
      (isOverlapping && !indicatesReplace && !indicatesRight)
    ) {
      const targetMinY = existMaxY + 140;
      if (newMinY < targetMinY) {
        const deltaY = targetMinY - newMinY;
        const deltaX = Math.round(existMinX - newMinX);

        for (const el of normalizedSkeletons) {
          el.y = Math.round(el.y + deltaY);
          el.x = Math.round(el.x + deltaX);
        }
      }
    } else if (indicatesRight && (isOverlapping || newMinX < existMaxX + 80)) {
      const targetMinX = existMaxX + 140;
      const deltaX = targetMinX - newMinX;
      const deltaY = Math.round(existMinY - newMinY);

      for (const el of normalizedSkeletons) {
        el.x = Math.round(el.x + deltaX);
        el.y = Math.round(el.y + deltaY);
      }
    }
  }

  // Convert skeletons to valid Excalidraw elements with robust fallback
  let newConvertedElements: any[] = [];
  try {
    newConvertedElements = convertToExcalidrawElements(normalizedSkeletons, {
      regenerateIds: false,
    });
  } catch (err: any) {
    console.warn(
      "First convert attempt failed, retrying without complex arrow bindings:",
      err,
    );
    try {
      // Fallback 1: Strip arrow bindings
      const strippedSkeletons = normalizedSkeletons.map((s) => {
        if (s.type === "arrow" || s.type === "line") {
          const { start, end, ...rest } = s;
          return rest;
        }
        return s;
      });
      newConvertedElements = convertToExcalidrawElements(strippedSkeletons, {
        regenerateIds: false,
      });
    } catch (retryErr: any) {
      console.warn(
        "Retry 1 failed, trying element-by-element conversion:",
        retryErr,
      );
      // Fallback 2: Convert element-by-element so one bad skeleton doesn't break the entire batch
      newConvertedElements = [];
      for (const skel of normalizedSkeletons) {
        try {
          const res = convertToExcalidrawElements([skel], {
            regenerateIds: false,
          });
          newConvertedElements.push(...res);
        } catch (singleErr) {
          console.warn("Skipping unconvertible skeleton:", skel, singleErr);
        }
      }

      if (newConvertedElements.length === 0) {
        return {
          success: false,
          error: retryErr.message || "Failed to create elements",
        };
      }
    }
  }

  const allElements = excalidrawAPI.getSceneElements();
  const mergedElements = [...allElements, ...newConvertedElements];

  excalidrawAPI.updateScene({
    elements: mergedElements,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  const shouldScroll = args?.scrollToContent !== false;
  if (shouldScroll && newConvertedElements.length > 0) {
    setTimeout(() => {
      try {
        excalidrawAPI.setViewport({
          target: newConvertedElements,
          fit: "scale-down",
          animation: true,
        });
      } catch (err) {
        console.warn("Failed to setViewport:", err);
      }
    }, 100);
  }

  return {
    success: true,
    created_count: newConvertedElements.length,
    element_ids: newConvertedElements.map((e) => e.id),
  };
};

// Tool: update_elements (also handles edit_elements / modify_elements)
export const executeUpdateElements = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  args: any,
) => {
  const rawList = Array.isArray(args)
    ? args
    : Array.isArray(args?.updates)
    ? args.updates
    : Array.isArray(args?.elements)
    ? args.elements
    : args?.id
    ? [args]
    : [];

  if (!rawList || rawList.length === 0) {
    return { success: false, error: "No updates provided" };
  }

  const updatesMap = new Map<string, any>();
  for (const item of rawList) {
    if (item && item.id) {
      const u = { ...item };
      if (u.text === undefined && u.label !== undefined) {
        u.text = typeof u.label === "string" ? u.label : u.label?.text;
      }
      updatesMap.set(String(u.id), u);
    }
  }

  const sceneElements = excalidrawAPI.getSceneElements();
  const elementsMap = new Map<string, ExcalidrawElement>();
  for (const el of sceneElements) {
    elementsMap.set(el.id, el);
  }

  let updatedCount = 0;
  const nextElements = sceneElements.map((el) => {
    const update = updatesMap.get(el.id);
    if (!update) {
      return el;
    }

    updatedCount++;
    const modified: any = { ...el };

    for (const [key, value] of Object.entries(update)) {
      if (key !== "id" && key !== "text" && value !== undefined) {
        modified[key] = value;
      }
    }

    // Handle text update
    if (update.text !== undefined) {
      if (el.type === "text") {
        modified.text = update.text;
        modified.originalText = update.text;
      }
    }

    return modified as ExcalidrawElement;
  });

  // Also check if any container had its text updated and update its bound text element
  for (const update of rawList) {
    if (update.text !== undefined) {
      const containerEl = elementsMap.get(update.id);
      if (
        containerEl &&
        containerEl.type !== "text" &&
        containerEl.boundElements
      ) {
        for (const b of containerEl.boundElements) {
          if (b.type === "text") {
            const idx = nextElements.findIndex((item) => item.id === b.id);
            if (idx !== -1) {
              const textEl = nextElements[idx] as ExcalidrawTextElement;
              nextElements[idx] = {
                ...textEl,
                text: update.text,
                originalText: update.text,
              };
            }
          }
        }
      }
    }
  }

  excalidrawAPI.updateScene({
    elements: nextElements,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return {
    success: true,
    updated_count: updatedCount,
  };
};

// Tool: delete_elements
export const executeDeleteElements = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  args: { ids: string[] },
) => {
  if (!args.ids || !Array.isArray(args.ids) || args.ids.length === 0) {
    return { success: false, error: "No element IDs provided to delete" };
  }

  const deleteIds = new Set(args.ids);
  const sceneElements = excalidrawAPI.getSceneElements();

  // Also include any bound text elements belonging to deleted containers
  for (const el of sceneElements) {
    if (deleteIds.has(el.id) && el.boundElements) {
      for (const b of el.boundElements) {
        if (b.type === "text") {
          deleteIds.add(b.id);
        }
      }
    }
  }

  const nextElements = sceneElements.map((el) => {
    if (deleteIds.has(el.id)) {
      return { ...el, isDeleted: true };
    }
    return el;
  });

  excalidrawAPI.updateScene({
    elements: nextElements,
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });

  return {
    success: true,
    deleted_count: deleteIds.size,
  };
};

// Tool: clear_canvas
export const executeClearCanvas = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  args: { confirm?: boolean },
) => {
  if (args.confirm !== true) {
    return { success: false, error: "Confirmation required to clear canvas" };
  }

  excalidrawAPI.resetScene();

  return {
    success: true,
    message: "Canvas cleared successfully",
  };
};

// Master Tool Dispatcher
export const executeCanvasTool = (
  excalidrawAPI: ExcalidrawImperativeAPI,
  toolName: string,
  args: any,
  userPrompt?: string,
) => {
  switch (toolName) {
    case "get_canvas_elements":
      return executeGetCanvasElements(excalidrawAPI, args);
    case "create_elements":
      return executeCreateElements(excalidrawAPI, args, userPrompt);
    case "update_elements":
    case "edit_elements":
    case "modify_elements":
      return executeUpdateElements(excalidrawAPI, args);
    case "delete_elements":
      return executeDeleteElements(excalidrawAPI, args);
    case "clear_canvas":
      return executeClearCanvas(excalidrawAPI, args);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};
