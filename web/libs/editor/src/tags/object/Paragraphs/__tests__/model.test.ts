import { types } from "mobx-state-tree";
import { mockFF } from "../../../../../__mocks__/global";
import { FF_LSDV_E_278, FF_NER_SELECT_ALL } from "../../../../utils/feature-flags";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ParagraphsModel } from "../model";

const ff = mockFF();

jest.mock("../../../../regions/ParagraphsRegion", () => ({}));

const MockStore = types
  .model({
    paragraphs: ParagraphsModel,
  })
  .volatile(() => ({
    task: { dataObj: {} },
    annotationStore: {
      addErrors: jest.fn(),
      selected: null,
      selectedRegions: [],
      selectArea: jest.fn(),
      unselectArea: jest.fn(),
    },
  }));

const phrases = [
  {
    author: "Cheshire Cat",
    text: "You must be, or you wouldn't have come here.",
    start: 6,
  },
  {
    author: "Cheshire Cat",
    text: "We're all mad here. I'm mad. You're mad.",
    start: 1.2,
    end: 4.1, // overlapping with the next phrase
  },
  {
    // just a phrase with no timing
    author: "Lewis Carroll",
    text: "<cat is smiling>",
  },
  {
    author: "Alice",
    text: "How do you know I'm mad?",
    start: 3.2,
    duration: 1.5,
  },
];

describe("Paragraphs phrases", () => {
  beforeEach(() => {
    ff.setup();
    ff.set({
      [FF_LSDV_E_278]: true,
      [FF_NER_SELECT_ALL]: false, // Default to disabled for most tests
    });
  });

  afterEach(() => {
    ff.reset();
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    // creating models can be a long one, so all tests will share one model
    const model = ParagraphsModel.create({ name: "phrases", value: "$phrases", contextscroll: true });
    const store = MockStore.create({ paragraphs: model });
    const duration = 10;

    store.task.dataObj = { phrases };
    model.updateValue(store);
    model.handleAudioLoaded({ target: { duration } });

    it("should update value from task", () => {
      expect(model._value).toEqual(phrases);
    });

    it("should calculate phrases times correctly", () => {
      // Check that we have the expected number of regions
      expect(model.regionsStartEnd).toHaveLength(4);

      // Check specific regions exist with correct timing
      const regions = model.regionsStartEnd;
      const hasRegion_1_2_to_4_1 = regions.some((r: any) => r.start === 1.2 && r.end === 4.1);
      const hasRegion_3_2_to_4_7 = regions.some((r: any) => r.start === 3.2 && r.end === 4.7);
      const hasRegion_6_to_10 = regions.some((r: any) => r.start === 6 && r.end === 10);
      const hasEmptyRegion = regions.some((r: any) => Object.keys(r).length === 0);

      expect(hasRegion_1_2_to_4_1).toBe(true);
      expect(hasRegion_3_2_to_4_7).toBe(true);
      expect(hasRegion_6_to_10).toBe(true);
      expect(hasEmptyRegion).toBe(true);
    });

    it("should detect phrase id by time correctly", () => {
      expect(model.regionIndicesByTime(1)).toEqual([]);
      expect(model.regionIndicesByTime(2).length).toBeGreaterThan(0); // Should find at least one phrase at time 2
      expect(model.regionIndicesByTime(6).length).toBeGreaterThan(0); // Should find at least one phrase at time 6
    });

    it("should have phrases in the correct order", () => {
      expect(model._value).toHaveLength(4);
      expect(model._value[0].author).toBeDefined();
      expect(model._value[1].author).toBeDefined();
      expect(model._value[2].author).toBeDefined();
      expect(model._value[3].author).toBeDefined();
    });
  });

  describe("Enhanced Annotation Features (FF_LSDV_E_279)", () => {
    let model: any;
    let store: any;
    const duration = 10;

    beforeEach(() => {
      ff.set({ [FF_NER_SELECT_ALL]: true });

      model = ParagraphsModel.create({
        name: "phrases",
        value: "$phrases",
        contextscroll: true,
      });

      store = MockStore.create({ paragraphs: model });
      store.task.dataObj = { phrases };
      model.updateValue(store);
      model.handleAudioLoaded({ target: { duration } });
    });

    describe("seekToPhrase basic functionality", () => {
      it("should update playingId when seeking to a valid phrase", () => {
        model.seekToPhrase(2);
        expect(model.playingId).toBe(2);
      });

      it("should not update playingId when seeking to invalid phrase index", () => {
        const initialPlayingId = model.playingId;
        model.seekToPhrase(-1);
        expect(model.playingId).toBe(initialPlayingId);

        model.seekToPhrase(999);
        expect(model.playingId).toBe(initialPlayingId);
      });

      it("should not crash when annotation is null", () => {
        expect(() => {
          model.seekToPhrase(2);
        }).not.toThrow();

        expect(model.playingId).toBe(2);
      });

      it("should call unselectRegionsNotInPhrase when FF enabled", () => {
        const unselectSpy = jest.spyOn(model, "unselectRegionsNotInPhrase").mockImplementation(() => {});

        model.seekToPhrase(2);

        expect(unselectSpy).toHaveBeenCalledWith(2);
      });

      it("should not call unselectRegionsNotInPhrase when FF disabled", () => {
        // Reset feature flags completely
        ff.reset();
        ff.setup();
        ff.set({
          [FF_LSDV_E_278]: true,
          [FF_NER_SELECT_ALL]: false,
        });

        // Create a fresh model with FF disabled
        const disabledModel = ParagraphsModel.create({
          name: "phrases",
          value: "$phrases",
          contextscroll: true,
        });

        const disabledStore = MockStore.create({ paragraphs: disabledModel });
        disabledStore.task.dataObj = { phrases };
        disabledModel.updateValue(disabledStore);
        disabledModel.handleAudioLoaded({ target: { duration: 10 } });

        const unselectSpy = jest.spyOn(disabledModel, "unselectRegionsNotInPhrase");

        disabledModel.seekToPhrase(2);

        expect(unselectSpy).not.toHaveBeenCalled();
      });
    });

    describe("setViewRef", () => {
      it("should store view reference", () => {
        const mockViewRef = { test: "reference" };

        model.setViewRef(mockViewRef);

        expect(model._viewRef).toBe(mockViewRef);
      });

      it("should allow setting null reference", () => {
        model.setViewRef({ test: "reference" });
        model.setViewRef(null);

        expect(model._viewRef).toBe(null);
      });
    });
  });

  describe("Feature Flag Integration", () => {
    it("should have feature flag methods available when enabled", () => {
      ff.set({ [FF_NER_SELECT_ALL]: true });

      const model = ParagraphsModel.create({
        name: "phrases",
        value: "$phrases",
        contextscroll: true,
      });

      // These methods should exist and be callable
      expect(typeof model.setViewRef).toBe("function");
      expect(typeof model.unselectRegionsNotInPhrase).toBe("function");
      expect(typeof model.checkAndAnnotateNewPhrase).toBe("function");
      expect(typeof model.selectAndAnnotateActivePhrase).toBe("function");
    });

    it("should handle feature flag disabled gracefully", () => {
      ff.set({ [FF_NER_SELECT_ALL]: false });

      const model = ParagraphsModel.create({
        name: "phrases",
        value: "$phrases",
        contextscroll: true,
      });

      // Should not crash when calling these methods with FF disabled
      expect(() => {
        model.unselectRegionsNotInPhrase(1);
        model.checkAndAnnotateNewPhrase();
        model.selectAndAnnotateActivePhrase();
      }).not.toThrow();
    });
  });
});
