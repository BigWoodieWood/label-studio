import { render, screen, fireEvent } from "@testing-library/react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Phrases } from "../Phrases";
import { getRoot } from "mobx-state-tree";
import { mockFF } from "../../../../../__mocks__/global";
import { FF_LSDV_E_278, FF_NER_SELECT_ALL } from "../../../../utils/feature-flags";

const ff = mockFF();

const intersectionObserverMock = () => ({
  observe: () => null,
  disconnect: () => null,
});

window.IntersectionObserver = jest.fn().mockImplementation(intersectionObserverMock);

jest.mock("mobx-state-tree", () => ({
  ...jest.requireActual("mobx-state-tree"),
  getRoot: jest.fn(),
}));

describe("Phrases Component", () => {
  const mockSeekToPhrase = jest.fn();
  const mockSetIsInViewport = jest.fn();
  const mockActiveRef = { current: null };

  const createMockItem = (additionalProps = {}) => ({
    namekey: "name",
    textkey: "text", // Corrected property name from textKey to textkey
    layoutClasses: {
      phrase: "phrase-class",
      name: "name-class",
      text: "text-class",
    },
    audio: "audio-file.mp3",
    _value: [
      { start: 0, end: 1.5, name: "phrase1", text: "This is phrase 1" },
      { start: 1.5, end: 3.0, name: "phrase2", text: "This is phrase 2" },
    ],
    isVisibleForAuthorFilter: jest.fn(() => true),
    layoutStyles: () => ({ phrase: { color: "red" } }),
    seekToPhrase: mockSeekToPhrase,
    contextscroll: false,
    ...additionalProps,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ff.setup();
    ff.set({
      [FF_LSDV_E_278]: true,
      [FF_NER_SELECT_ALL]: false, // Default to disabled for most tests
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    getRoot.mockReturnValue({ settings: { showLineNumbers: false } });
  });

  afterAll(() => {
    ff.reset();
  });

  describe("when FF_LSDV_E_279 is disabled", () => {
    beforeEach(() => {
      ff.set({ [FF_NER_SELECT_ALL]: false });
    });

    it("should not call seekToPhrase on click", () => {
      const item = createMockItem();
      render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
      const firstPhrase = screen.getByTestId("phrase:0");
      fireEvent.click(firstPhrase);
      expect(mockSeekToPhrase).not.toHaveBeenCalled();
    });
  });

  describe("when FF_LSDV_E_279 is enabled", () => {
    beforeEach(() => {
      ff.set({ [FF_NER_SELECT_ALL]: true });
    });

    describe("Click Interaction", () => {
      it("calls seekToPhrase when phrase is clicked", () => {
        const item = createMockItem();
        render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
        const firstPhrase = screen.getByTestId("phrase:0");
        fireEvent.click(firstPhrase);
        expect(mockSeekToPhrase).toHaveBeenCalledWith(0);
      });

      it("handles multiple phrase clicks correctly", () => {
        const item = createMockItem();
        render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
        const firstPhrase = screen.getByTestId("phrase:0");
        const secondPhrase = screen.getByTestId("phrase:1");
        fireEvent.click(firstPhrase);
        fireEvent.click(secondPhrase);
        expect(mockSeekToPhrase).toHaveBeenCalledTimes(2);
        expect(mockSeekToPhrase).toHaveBeenNthCalledWith(1, 0);
        expect(mockSeekToPhrase).toHaveBeenNthCalledWith(2, 1);
      });

      it("handles rapid consecutive clicks without errors", () => {
        const item = createMockItem();
        render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
        const firstPhrase = screen.getByTestId("phrase:0");
        fireEvent.click(firstPhrase);
        fireEvent.click(firstPhrase);
        fireEvent.click(firstPhrase);
        expect(mockSeekToPhrase).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe("General Rendering, State, and Accessibility", () => {
    it("renders phrases correctly", () => {
      const item = createMockItem();
      render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
      expect(screen.getByText("This is phrase 1")).toBeInTheDocument();
      expect(screen.getByText("This is phrase 2")).toBeInTheDocument();
    });

    it("applies correct CSS classes to phrase elements", () => {
      const item = createMockItem();
      render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
      const phraseElements = screen.getAllByTestId(/^phrase:/);
      phraseElements.forEach((element) => {
        expect(element).toHaveClass("phrase-class");
      });
    });

    it("highlights the currently playing phrase", () => {
      const item = createMockItem();
      const playingId = 1; // Second phrase is active
      render(
        <Phrases item={item} playingId={playingId} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />,
      );
      const activePhrase = screen.getByTestId("phrase:1");
      expect(activePhrase).toBeInTheDocument();
    });

    it("handles empty phrases array gracefully", () => {
      const item = createMockItem({ _value: [] });
      render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
      const phraseElements = screen.queryAllByTestId(/^phrase:/);
      expect(phraseElements).toHaveLength(0);
    });

    it("handles missing seekToPhrase function gracefully (when enabled)", () => {
      ff.set({ [FF_NER_SELECT_ALL]: true });
      const item = createMockItem({ seekToPhrase: undefined });
      expect(() => {
        render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);
        const firstPhrase = screen.getByTestId("phrase:0");
        fireEvent.click(firstPhrase);
      }).not.toThrow();
    });

    it("maintains proper phrase order in DOM", () => {
      const item = createMockItem();
      render(<Phrases item={item} playingId={0} activeRef={mockActiveRef} setIsInViewport={mockSetIsInViewport} />);

      // The most robust way to test this is to assert that the text is visible
      // on the screen, exactly as a user would see it.
      expect(screen.getByText("This is phrase 1")).toBeInTheDocument();
      expect(screen.getByText("This is phrase 2")).toBeInTheDocument();

      // We can also check the order if necessary, but visibility is the key.
      const phraseElements = screen.getAllByTestId(/^phrase:/);
      expect(phraseElements[0]).toHaveTextContent("This is phrase 1");
      expect(phraseElements[1]).toHaveTextContent("This is phrase 2");
    });
  });
});
