import { FF_BITMASK } from "@humansignal/core/lib/utils/feature-flags";

export default {
  enableHotkeys: {
    title: "Labeling hotkeys",
    description: "Enables quick selection of labels using hotkeys",
    onChangeEvent: "toggleHotkeys",
    defaultValue: true,
  },
  enableTooltips: {
    title: "Show hotkeys on tooltips",
    description: "Displays keybindings on tools and actions tooltips",
    onChangeEvent: "toggleTooltips",
    defaultValue: false,
  },
  enableLabelTooltips: {
    title: "Show hotkeys on labels",
    description: "Displays keybindings on labels",
    onChangeEvent: "toggleLabelTooltips",
    defaultValue: true,
  },
  showLabels: {
    title: "Show region labels",
    description: "Display region label names",
    onChangeEvent: "toggleShowLabels",
    defaultValue: false,
  },
  continuousLabeling: {
    title: "Keep label selected after creating a region",
    description: "Allows continuous region creation using the selected label",
    onChangeEvent: "toggleContinuousLabeling",
    defaultValue: false,
  },
  selectAfterCreate: {
    title: "Select region after creating it",
    description: "Automatically selects newly created regions",
    onChangeEvent: "toggleSelectAfterCreate",
    defaultValue: false,
  },
  showLineNumbers: {
    tags: "Text Tag",
    title: "Show line numbers",
    description: "Identify and reference specific lines of text in your document",
    onChangeEvent: "toggleShowLineNumbers",
    defaultValue: false,
  },
  preserveSelectedTool: {
    tags: "Image Tag",
    title: "Keep selected tool",
    description: "Persists the selected tool across tasks",
    onChangeEvent: "togglepreserveSelectedTool",
    defaultValue: true,
  },
  enableSmoothing: {
    tags: "Image Tag",
    title: "Pixel smoothing on zoom",
    description: "Smooth image pixels when zoomed in",
    onChangeEvent: "toggleSmoothing",
    defaultValue: true,
  },
  invertedZoom: {
    tags: "Image Tag",
    title: "Invert zoom direction",
    description: "Invert the direction of scroll-to-zoom",
    onChangeEvent: "toggleInvertedZoom",
    defaultValue: false,
    flag: FF_BITMASK,
  },
};
