// Utility to generate a sample task from a Label Studio XML config
export function generateSampleTaskFromConfig(config: string): {
  id: number;
  data: Record<string, any>;
  annotation?: any;
} {
  const parser = new DOMParser();
  let xml: Document;
  try {
    xml = parser.parseFromString(config, "text/xml");
  } catch (e) {
    return { id: 1, data: {} };
  }

  // Try to find a root-level comment with a JSON object
  let userData: Record<string, any> | undefined = undefined;
  let userAnnotation: any = undefined;
  const root = xml.documentElement;
  if (root) {
    for (let i = 0; i < root.childNodes.length; i++) {
      const node = root.childNodes[i];
      if (node.nodeType === Node.COMMENT_NODE) {
        try {
          const json = JSON.parse(node.nodeValue || "");
          if (typeof json === "object" && json !== null) {
            if (typeof json.data === "object" && json.data !== null) {
              userData = json.data;
            }
            if (typeof json.annotation === "object" && json.annotation !== null) {
              userAnnotation = json.annotation;
            }
            if (!userData && !userAnnotation) {
              userData = json;
            }
            if (userData || userAnnotation) {
              break;
            }
          }
        } catch (e) {
          // Ignore invalid JSON in comments
        }
      }
    }
  }

  // Find all elements with a value attribute that starts with $
  const data: Record<string, any> = userData ? { ...userData } : {};
  const valueNodes = Array.from(xml.querySelectorAll("[value]"));

  valueNodes.forEach((node) => {
    const valueAttr = node.getAttribute("value");
    if (!valueAttr || !valueAttr.startsWith("$") || valueAttr.length < 2) return;
    const key = valueAttr.slice(1);
    if (data[key] !== undefined) return; // already set

    // Guess sample value based on tag name or valueList
    const tag = node.tagName.toLowerCase();
    if (tag === "image" || tag === "hyperimage") {
      if (node.hasAttribute("valueList")) {
        data[key] = [
          "https://htx-pub.s3.amazonaws.com/demo/images/image1.jpg",
          "https://htx-pub.s3.amazonaws.com/demo/images/image2.jpg",
        ];
      } else {
        data[key] = "https://htx-pub.s3.amazonaws.com/demo/images/image1.jpg";
      }
    } else if (tag === "audio") {
      data[key] = "https://htx-pub.s3.amazonaws.com/demo/audio/sample1.wav";
    } else if (tag === "video") {
      data[key] = "https://htx-pub.s3.amazonaws.com/demo/video/sample1.mp4";
    } else if (tag === "text" || tag === "hypertext") {
      data[key] = "Sample text for labeling.";
    } else if (tag === "paragraphs") {
      data[key] = [{ text: "First paragraph." }, { text: "Second paragraph." }];
    } else if (tag === "timeseries") {
      data[key] = [
        { time: 0, value: 1 },
        { time: 1, value: 2 },
      ];
    } else if (tag === "choices" || tag.endsWith("labels")) {
      data[key] = ["Option 1", "Option 2"];
    } else if (tag === "taxonomy") {
      data[key] = [
        {
          value: "Category 1",
          children: [{ value: "Subcategory 1.1" }, { value: "Subcategory 1.2" }],
        },
        { value: "Category 2" },
      ];
    } else if (tag === "table") {
      data[key] = [
        { col1: "Row 1, Col 1", col2: "Row 1, Col 2" },
        { col1: "Row 2, Col 1", col2: "Row 2, Col 2" },
      ];
    } else if (tag === "list") {
      data[key] = ["Item 1", "Item 2", "Item 3"];
    } else if (tag === "html") {
      data[key] = "<b>Sample HTML content</b>";
    } else if (tag === "rating") {
      data[key] = 4;
    } else if (tag === "number") {
      data[key] = 42;
    } else if (tag === "date" || tag === "datetime") {
      data[key] = new Date().toISOString();
    } else if (tag === "textarea") {
      data[key] = "Sample multiline text.";
    } else if (tag === "pairwise") {
      data[key] = [
        { id: 1, text: "Option A" },
        { id: 2, text: "Option B" },
      ];
    } else if (tag === "ranker") {
      data[key] = [
        { id: 1, text: "Ranked 1" },
        { id: 2, text: "Ranked 2" },
      ];
    } else if (tag === "repeater") {
      data[key] = [{ text: "Repeat 1" }, { text: "Repeat 2" }];
    } else {
      data[key] = `Sample value for ${key}`;
    }
  });

  // Also handle dynamic label lists (e.g., <Labels value="$brands">)
  const dynamicLabelNodes = Array.from(
    xml.querySelectorAll(
      "labels, brushlabels, polygonlabels, keypointlabels, ellipselabels, rectanglelabels, paragraphlabels, hypertextlabels, timeserieslabels",
    ),
  );
  dynamicLabelNodes.forEach((node) => {
    const valueAttr = node.getAttribute("value");
    if (!valueAttr || !valueAttr.startsWith("$") || valueAttr.length < 2) return;
    const key = valueAttr.slice(1);
    if (data[key] === undefined) {
      data[key] = [{ value: "Dynamic Label 1" }, { value: "Dynamic Label 2" }];
    }
  });

  // Return annotation if provided, else undefined
  return { id: 1, data, annotation: userAnnotation };
}
