import { render, screen } from "@testing-library/react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { Phrases } from "../Phrases";
import { getRoot } from "mobx-state-tree";

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
  it("renders phrases", () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    getRoot.mockReturnValue({ settings: { showLineNumbers: false } });

    const item = {
      namekey: "name",
      textKey: "text",
      layoutClasses: {
        phrase: "phrase-class",
        name: "name-class",
        text: "text-class",
      },
      audio: "audio-file.mp3",
      _value: [
        { start: 0, name: "phrase1", text: "This is phrase 1" },
        { start: 1, name: "phrase2", text: "This is phrase 2" },
      ],
      isVisibleForAuthorFilter: jest.fn(() => true),
      layoutStyles: () => ({ phrase: { color: "red" } }),
    };

    const playingId = 0;
    const activeRef = { current: null };
    const setIsInViewport = jest.fn();

    render(<Phrases item={item} playingId={playingId} activeRef={activeRef} setIsInViewport={setIsInViewport} />);

    const phraseElements = screen.getAllByTestId(/^phrase:/);
    const phraseTextContext = phraseElements.map((element) => element.textContent);

    expect(phraseElements).toHaveLength(2);
    expect(phraseTextContext[0]).toContain("phrase1");
    expect(phraseTextContext[1]).toContain("phrase2");
  });
});
