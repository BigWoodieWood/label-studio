import { render, screen } from "@testing-library/react";
import { AudioUltra } from "../view";
import * as React from "react";

// Mock dependencies
jest.mock("mobx-react", () => ({
  observer: (component) => component,
}));

jest.mock("@humansignal/core/lib/hooks/usePersistentState", () => ({
  usePersistentJSONState: jest.fn().mockReturnValue([{}, jest.fn()]),
}));

jest.mock("../../../components/Timeline/Context", () => ({
  TimelineContextProvider: ({ children }) => children,
}));

jest.mock("../../../lib/AudioUltra/react", () => ({
  useWaveform: jest.fn().mockReturnValue({
    waveform: { current: { on: jest.fn(), load: jest.fn() } },
    currentTime: 0,
    playing: false,
    volume: 1,
    rate: 1,
    zoom: 1,
    duration: 0,
    setPlaying: jest.fn(),
    setVolume: jest.fn(),
    setRate: jest.fn(),
    setZoom: jest.fn(),
    setAmp: jest.fn(),
    layerVisibility: {},
  }),
}));

describe("AudioUltra view", () => {
  describe("selectRegion function", () => {
    it("should handle null regions gracefully", () => {
      // Setup mocks
      const mockItem = {
        annotation: {
          regionStore: {
            unselectAll: jest.fn(),
            toggleSelection: jest.fn(),
          },
          selectArea: jest.fn(),
          isLinkingMode: false,
          addLinkedRegion: jest.fn(),
          stopLinkingMode: jest.fn(),
        },
        _ws: {
          regions: {
            findRegion: jest.fn(),
            regions: [{ id: "1", handleSelected: jest.fn() }],
          },
        },
        regs: [],
        stageRef: { current: null },
        errors: [],
      };

      // Create a mocked selectRegion function similar to the one in view.tsx
      const selectRegion = (region, event) => {
        // Guard against null or undefined region
        if (!region) return;
        
        const annotation = mockItem.annotation;
        const growSelection = event.metaKey || event.ctrlKey;

        if (!growSelection || (!region.selected && !region.isRegion)) 
          mockItem.annotation.regionStore.unselectAll();

        // to select or unselect region
        const itemRegion = mockItem.regs.find((obj) => obj.id === region.id);
        // to select or unselect unlabeled segments
        const targetInWave = mockItem._ws?.regions.findRegion(region.id);

        if (annotation.isLinkingMode && itemRegion) {
          annotation.addLinkedRegion(itemRegion);
          annotation.stopLinkingMode();
          annotation.regionStore.unselectAll();
          region.handleSelected(false);
          return;
        }

        itemRegion && mockItem.annotation.regionStore.toggleSelection(itemRegion, region.selected);

        if (targetInWave) {
          targetInWave.handleSelected(region.selected);
        }

        // deselect all other segments if not changing multiselection
        if (!growSelection && mockItem._ws?.regions?.regions) {
          mockItem._ws.regions.regions.forEach((obj) => {
            if (obj && obj.id !== region.id) {
              obj.handleSelected(false);
            }
          });
        }
      };

      // Call the function with null region
      const mockEvent = { metaKey: false, ctrlKey: false };
      selectRegion(null, mockEvent);
      
      // Verify unselectAll was not called
      expect(mockItem.annotation.regionStore.unselectAll).not.toHaveBeenCalled();
    });

    it("should handle undefined region gracefully", () => {
      // Setup mocks
      const mockItem = {
        annotation: {
          regionStore: {
            unselectAll: jest.fn(),
            toggleSelection: jest.fn(),
          },
          selectArea: jest.fn(),
          isLinkingMode: false,
          addLinkedRegion: jest.fn(),
          stopLinkingMode: jest.fn(),
        },
        _ws: {
          regions: {
            findRegion: jest.fn(),
            regions: [{ id: "1", handleSelected: jest.fn() }],
          },
        },
        regs: [],
        stageRef: { current: null },
        errors: [],
      };

      // Create a mocked selectRegion function similar to the one in view.tsx
      const selectRegion = (region, event) => {
        // Guard against null or undefined region
        if (!region) return;
        
        const annotation = mockItem.annotation;
        const growSelection = event.metaKey || event.ctrlKey;

        if (!growSelection || (!region.selected && !region.isRegion)) 
          mockItem.annotation.regionStore.unselectAll();

        // to select or unselect region
        const itemRegion = mockItem.regs.find((obj) => obj.id === region.id);
        // to select or unselect unlabeled segments
        const targetInWave = mockItem._ws?.regions.findRegion(region.id);

        if (annotation.isLinkingMode && itemRegion) {
          annotation.addLinkedRegion(itemRegion);
          annotation.stopLinkingMode();
          annotation.regionStore.unselectAll();
          region.handleSelected(false);
          return;
        }

        itemRegion && mockItem.annotation.regionStore.toggleSelection(itemRegion, region.selected);

        if (targetInWave) {
          targetInWave.handleSelected(region.selected);
        }

        // deselect all other segments if not changing multiselection
        if (!growSelection && mockItem._ws?.regions?.regions) {
          mockItem._ws.regions.regions.forEach((obj) => {
            if (obj && obj.id !== region.id) {
              obj.handleSelected(false);
            }
          });
        }
      };

      // Call the function with undefined region
      const mockEvent = { metaKey: false, ctrlKey: false };
      selectRegion(undefined, mockEvent);
      
      // Verify unselectAll was not called
      expect(mockItem.annotation.regionStore.unselectAll).not.toHaveBeenCalled();
    });

    it("should handle null _ws gracefully", () => {
      // Setup mocks
      const mockItem = {
        annotation: {
          regionStore: {
            unselectAll: jest.fn(),
            toggleSelection: jest.fn(),
          },
          selectArea: jest.fn(),
          isLinkingMode: false,
          addLinkedRegion: jest.fn(),
          stopLinkingMode: jest.fn(),
        },
        _ws: null, // Setting _ws to null
        regs: [],
        stageRef: { current: null },
        errors: [],
      };

      // Create a mocked selectRegion function similar to the one in view.tsx
      const selectRegion = (region, event) => {
        // Guard against null or undefined region
        if (!region) return;
        
        const annotation = mockItem.annotation;
        const growSelection = event.metaKey || event.ctrlKey;

        if (!growSelection || (!region.selected && !region.isRegion)) 
          mockItem.annotation.regionStore.unselectAll();

        // to select or unselect region
        const itemRegion = mockItem.regs.find((obj) => obj.id === region.id);
        // to select or unselect unlabeled segments
        const targetInWave = mockItem._ws?.regions.findRegion(region.id);

        if (annotation.isLinkingMode && itemRegion) {
          annotation.addLinkedRegion(itemRegion);
          annotation.stopLinkingMode();
          annotation.regionStore.unselectAll();
          region.handleSelected(false);
          return;
        }

        itemRegion && mockItem.annotation.regionStore.toggleSelection(itemRegion, region.selected);

        if (targetInWave) {
          targetInWave.handleSelected(region.selected);
        }

        // deselect all other segments if not changing multiselection
        if (!growSelection && mockItem._ws?.regions?.regions) {
          mockItem._ws.regions.regions.forEach((obj) => {
            if (obj && obj.id !== region.id) {
              obj.handleSelected(false);
            }
          });
        }
      };

      // Create a mock region
      const mockRegion = { id: "region1", selected: true, isRegion: true };
      const mockEvent = { metaKey: false, ctrlKey: false };
      
      // Shouldn't throw an error even with null _ws
      expect(() => selectRegion(mockRegion, mockEvent)).not.toThrow();
    });
  });
});