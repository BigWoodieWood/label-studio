import type { Meta, StoryObj } from "@storybook/react";
import { ScatterView } from "./ScatterView";

// Define the expected props interface for ScatterView
interface ScatterViewProps {
  data: Array<{
    id: string;
    data?: {
      x?: number;
      y?: number;
      text?: string;
      image?: string;
      category?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
  view: {
    toggleSelected: (id: string) => void;
    selected: {
      isSelected: (id: string) => boolean;
    };
    [key: string]: any;
  };
  onChange?: (id: string) => void;
  loadMore?: () => Promise<void>;
}

/**
 * ScatterView is a component that displays tasks as points on a 2D scatter plot.
 * Each task must have x and y coordinates in its data object.
 */
const meta: Meta<typeof ScatterView> = {
  component: ScatterView,
  title: "DataManager/Views/ScatterView",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    data: { control: "object" },
    onChange: { action: "pointSelected" },
  },
} as Meta<ScatterViewProps>;

export default meta;
type Story = StoryObj<typeof ScatterView>;

// Mock data
const generateMockData = (count: number, categories = 4) => {
  const result = [];
  const categoryLabels = ["animal", "vehicle", "landscape", "interior"];
  
  for (let c = 0; c < categories; c++) {
    // Create a cluster for each category
    const centerX = Math.random() * 0.6 + 0.2; // between 0.2 and 0.8
    const centerY = Math.random() * 0.6 + 0.2; // between 0.2 and 0.8
    
    const pointsPerCategory = Math.floor(count / categories);
    
    for (let i = 0; i < pointsPerCategory; i++) {
      // Add some randomness within the cluster
      const x = centerX + (Math.random() - 0.5) * 0.2;
      const y = centerY + (Math.random() - 0.5) * 0.2;
      
      result.push({
        id: `${c}-${i}`,
        data: {
          text: `Sample task ${c}-${i}`,
          image: `https://picsum.photos/id/${(c * 10) + i}/200/300`,
          x: Math.max(0, Math.min(1, x)), // ensure between 0 and 1
          y: Math.max(0, Math.min(1, y)), // ensure between 0 and 1
          category: categoryLabels[c % categoryLabels.length],
        }
      });
    }
  }
  
  return result;
};

// Mock view object with minimal implementation needed
const mockView = {
  toggleSelected: (id: string) => console.log("Toggled selection for:", id),
  selected: {
    isSelected: (id: string) => false,
  },
};

/**
 * Default story showing a scatter plot with clustered data points
 */
export const Default: Story = {
  args: {
    data: generateMockData(40),
    view: mockView,
  },
};

/**
 * Shows how the plot appears with only a few data points
 */
export const FewPoints: Story = {
  args: {
    data: generateMockData(8, 2),
    view: mockView,
  },
};

/**
 * Shows how the plot handles a large number of data points
 */
export const ManyPoints: Story = {
  args: {
    data: generateMockData(200),
    view: mockView,
  },
};

/**
 * Shows how the plot appears with no data
 */
export const NoData: Story = {
  args: {
    data: [],
    view: mockView,
  },
};

/**
 * Shows how the plot appears when data is missing coordinates
 */
export const MissingCoordinates: Story = {
  args: {
    data: [
      { id: "1", data: { text: "Missing coordinates" } },
      { id: "2", data: { text: "Has x only", x: 0.5 } },
      { id: "3", data: { text: "Has y only", y: 0.5 } },
    ],
    view: mockView,
  },
};

/**
 * Shows how selection works
 */
export const WithSelection: Story = {
  args: {
    data: generateMockData(40),
    view: {
      ...mockView,
      selected: {
        isSelected: (id: string) => id.includes("-0"), // select all first items in each category
      },
    },
  },
  render: (args: ScatterViewProps) => {
    // Update the ScatterView to handle selection highlighting
    return (
      <div style={{ width: "100%", height: "600px" }}>
        <ScatterView {...args} />
      </div>
    );
  },
}; 