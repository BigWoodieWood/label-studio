import React, { Component } from "react";
import { inject, observer } from "mobx-react";

import ObjectTag from "../../../components/Tags/Object";
import {
  FF_DEV_2669,
  FF_DEV_2918,
  FF_LSDV_4711,
  FF_LSDV_E_278,
  FF_NER_SELECT_ALL,
  isFF,
} from "../../../utils/feature-flags";
import { findNodeAt, matchesSelector, splitBoundaries } from "../../../utils/html";
import { isSelectionContainsSpan } from "../../../utils/selection-tools";
import { debounce } from "../../../utils/debounce";
import styles from "./Paragraphs.module.scss";
import { AuthorFilter } from "./AuthorFilter";
import { Phrases } from "./Phrases";
import { IconHelp } from "@humansignal/icons";
import { Toggle, Tooltip } from "@humansignal/ui";
import { cn } from "../../../utils/bem";

const audioDefaultProps = {};

if (isFF(FF_LSDV_4711)) audioDefaultProps.crossOrigin = "anonymous";

class HtxParagraphsView extends Component {
  _regionSpanSelector = ".htx-highlight";
  mainContentSelector = `.${cn("main-content").toClassName()}`;
  mainViewAnnotationSelector = `.${cn("main-view").elem("annotation").toClassName()}`;

  constructor(props) {
    super(props);
    this.myRef = React.createRef();
    this.activeRef = React.createRef();
    this.lastPlayingId = -1;
    this.scrollTimeout = [];
    this.isPlaying = false;
    this.state = {
      canScroll: true,
      inViewport: true,
    };

    // Create debounced version of annotation processing
    this.processAnnotationDebounced = debounce(this.processAnnotation.bind(this), 300);
  }

  getSelectionText(sel) {
    return sel.toString();
  }

  getPhraseElement(node) {
    const cls = this.props.item.layoutClasses;

    while (node && (!node.classList || !node.classList.contains(cls.text))) node = node.parentNode;
    return node;
  }

  get phraseElements() {
    return [...this.myRef.current.getElementsByClassName(this.props.item.layoutClasses.text)];
  }

  /**
   * Check for the selection in the phrase and return the offset and index.
   *
   * @param {HTMLElement} node
   * @param {number} offset
   * @param {boolean} [isStart=true]
   * @return {Array} [offset, node, index, originalIndex]
   */
  getOffsetInPhraseElement(container, offset, isStart = true) {
    const node = this.getPhraseElement(container);
    const range = document.createRange();

    range.setStart(node, 0);
    range.setEnd(container, offset);
    const fullOffset = range.toString().length;
    const phraseIndex = this.phraseElements.indexOf(node);
    let phraseNode = node;

    // if the selection is made from the very end of a given phrase, we need to
    // move the offset to the beginning of the next phrase
    if (isStart && fullOffset === phraseNode.textContent.length) {
      return [0, phraseNode, phraseIndex + 1, phraseIndex];
    }
    // if the selection is made to the very beginning of the next phrase, we need to
    // move the offset to the end of the previous phrase
    if (!isStart && fullOffset === 0) {
      phraseNode = this.phraseElements[phraseIndex - 1];
      return [phraseNode.textContent.length, phraseNode, phraseIndex - 1, phraseIndex];
    }

    return [fullOffset, phraseNode, phraseIndex, phraseIndex];
  }

  removeSurroundingNewlines(text) {
    return text.replace(/^\n+/, "").replace(/\n+$/, "");
  }

  captureDocumentSelection() {
    const item = this.props.item;
    const cls = item.layoutClasses;
    const names = [...this.myRef.current.getElementsByClassName(cls.name)];

    names.forEach((el) => {
      el.style.visibility = "hidden";
    });

    let i;

    const ranges = [];
    const selection = window.getSelection();

    if (selection.isCollapsed) {
      names.forEach((el) => {
        el.style.visibility = "unset";
      });
      return [];
    }

    for (i = 0; i < selection.rangeCount; i++) {
      const r = selection.getRangeAt(i);

      if (r.endContainer.nodeType !== Node.TEXT_NODE) {
        // offsets work differently for nodes and texts, so we have to find #text.
        // Try multiple approaches to find the phrase element for robust triple-click support
        let el = this.getPhraseElement(r.endContainer.lastChild);

        if (!el) {
          el = this.getPhraseElement(r.endContainer);
        }

        if (!el) {
          // Look for any element with cls.text class within the range
          const textElements = this.myRef.current.getElementsByClassName(this.props.item.layoutClasses.text);
          for (const textEl of textElements) {
            if (r.intersectsNode(textEl)) {
              el = textEl;
              break;
            }
          }
        }

        let textNode = el;

        if (el) {
          while (textNode && textNode.nodeType !== Node.TEXT_NODE) {
            textNode = textNode.firstChild;
          }
        }

        // most probably this div is out of Paragraphs
        // @todo maybe select till the end of Paragraphs?
        if (!textNode) {
          continue;
        }

        r.setEnd(textNode, textNode.textContent.length);
      }

      if (r.collapsed || /^\s*$/.test(r.toString())) {
        continue;
      }

      try {
        splitBoundaries(r);
        const [startOffset, , start, originalStart] = this.getOffsetInPhraseElement(r.startContainer, r.startOffset);
        const [endOffset, , end, _originalEnd] = this.getOffsetInPhraseElement(r.endContainer, r.endOffset, false);

        // if this shifts backwards, we need to take the lesser index.
        const originalEnd = Math.min(end, _originalEnd);

        if (isFF(FF_DEV_2918)) {
          const visibleIndexes = item._value.reduce((visibleIndexes, v, idx) => {
            const isContentVisible = item.isVisibleForAuthorFilter(v);

            if (isContentVisible && originalStart <= idx && originalEnd >= idx) {
              visibleIndexes.push(idx);
            }

            return visibleIndexes;
          }, []);

          if (visibleIndexes.length !== originalEnd - originalStart + 1) {
            const texts = this.phraseElements;
            let fromIdx = originalStart;

            for (let k = 0; k < visibleIndexes.length; k++) {
              const curIdx = visibleIndexes[k];
              const isLastVisibleIndex = k === visibleIndexes.length - 1;

              if (isLastVisibleIndex || visibleIndexes[k + 1] !== curIdx + 1) {
                let anchorOffset;
                let focusOffset;

                const _range = r.cloneRange();

                if (fromIdx === originalStart) {
                  fromIdx = start;
                  anchorOffset = startOffset;
                } else {
                  anchorOffset = 0;

                  const walker = texts[fromIdx].ownerDocument.createTreeWalker(texts[fromIdx], NodeFilter.SHOW_ALL);

                  while (walker.firstChild());

                  _range.setStart(walker.currentNode, anchorOffset);
                }
                if (curIdx === end) {
                  focusOffset = endOffset;
                } else {
                  const curRange = document.createRange();

                  curRange.selectNode(texts[curIdx]);
                  focusOffset = curRange.toString().length;

                  const walker = texts[curIdx].ownerDocument.createTreeWalker(texts[curIdx], NodeFilter.SHOW_ALL);

                  while (walker.lastChild());

                  _range.setEnd(walker.currentNode, walker.currentNode.length);
                }

                selection.removeAllRanges();
                selection.addRange(_range);

                const text = this.removeSurroundingNewlines(selection.toString());

                // Sometimes the selection is empty, which is the case for dragging from the end of a line above the
                // target line, while having collapsed lines between.
                if (text) {
                  ranges.push({
                    startOffset: anchorOffset,
                    start: String(fromIdx),
                    endOffset: focusOffset,
                    end: String(curIdx),
                    _range,
                    text,
                  });
                }

                if (visibleIndexes.length - 1 > k) {
                  fromIdx = visibleIndexes[k + 1];
                }
              }
            }
          } else {
            // user selection always has only one range, so we can use selection's text
            // which doesn't contain hidden elements (names in our case)
            ranges.push({
              startOffset,
              start: String(start),
              endOffset,
              end: String(end),
              _range: r,
              text: this.removeSurroundingNewlines(selection.toString()),
            });
          }
        } else {
          // user selection always has only one range, so we can use selection's text
          // which doesn't contain hidden elements (names in our case)
          ranges.push({
            startOffset,
            start: String(start),
            endOffset,
            end: String(end),
            _range: r,
            text: this.removeSurroundingNewlines(selection.toString()),
          });
        }
      } catch (err) {
        console.error("Can not get selection", err);
      }
    }

    names.forEach((el) => {
      el.style.visibility = "unset";
    });

    // BrowserRange#normalize() modifies the DOM structure and deselects the
    // underlying text as a result. So here we remove the selected ranges and
    // reapply the new ones.
    selection.removeAllRanges();

    return ranges;
  }

  _selectRegions = (additionalMode) => {
    const { item } = this.props;
    const root = this.myRef.current;
    const selection = window.getSelection();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const regions = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.nodeName === "SPAN" && node.matches(this._regionSpanSelector) && isSelectionContainsSpan(node)) {
        const region = this._determineRegion(node);

        regions.push(region);
      }
    }
    if (regions.length) {
      if (additionalMode) {
        item.annotation.extendSelectionWith(regions);
      } else {
        item.annotation.selectAreas(regions);
      }
      selection.removeAllRanges();
    }
  };

  _determineRegion(element) {
    if (matchesSelector(element, this._regionSpanSelector)) {
      const span = element.tagName === "SPAN" ? element : element.closest(this._regionSpanSelector);
      const { item } = this.props;

      return item.regs.find((region) => region.find(span));
    }
  }

  _disposeTimeout() {
    if (this.scrollTimeout.length > 0) {
      this.scrollTimeout.forEach((timeout) => clearTimeout(timeout));
      this.scrollTimeout = [];
    }
  }

  processAnnotation() {
    const selection = window.getSelection();
    if (selection.isCollapsed) return;

    // Enhanced triple-click handling for better text selection with existing regions
    if (isFF(FF_NER_SELECT_ALL)) {
      const expandedSelection = this.expandSelectionForTripleClick(selection);
      if (expandedSelection) {
        // Use the expanded selection instead of the original
        const selectedRanges = this.captureDocumentSelectionFromRange(expandedSelection);
        if (selectedRanges.length > 0) {
          this.createAnnotationFromRanges(selectedRanges); // Manual user selection - don't auto-select
          return;
        }
      }
    }

    const selectedRanges = this.captureDocumentSelection();

    if (selectedRanges.length === 0) {
      return;
    }

    this.createAnnotationFromRanges(selectedRanges); // Manual user selection - don't auto-select
  }

  /**
   * Detect if this looks like a triple-click and expand selection to full phrase
   * ignoring existing region boundaries
   */
  expandSelectionForTripleClick(selection) {
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    // Check if this looks like a triple-click (selection contains newline or spans multiple elements)
    const hasNewline = selectedText.includes("\n");
    const spanElements = range.commonAncestorContainer.querySelectorAll
      ? range.commonAncestorContainer.querySelectorAll(".htx-highlight")
      : [];

    if (hasNewline || spanElements.length > 0) {
      // Find the phrase element that contains the selection start
      const startPhraseElement = this.getPhraseElement(range.startContainer);
      if (startPhraseElement) {
        // Create a new range that spans the entire phrase content, ignoring existing highlights
        const expandedRange = document.createRange();

        // Find first and last text nodes in the phrase
        const walker = document.createTreeWalker(startPhraseElement, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            // Skip empty text nodes
            return node.textContent.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          },
        });

        const firstTextNode = walker.nextNode();
        if (firstTextNode) {
          let lastTextNode = firstTextNode;
          let currentNode;
          while ((currentNode = walker.nextNode())) {
            lastTextNode = currentNode;
          }

          expandedRange.setStart(firstTextNode, 0);
          expandedRange.setEnd(lastTextNode, lastTextNode.textContent.length);

          console.log(`Expanded triple-click selection: "${expandedRange.toString()}"`);
          return expandedRange;
        }
      }
    }

    return null;
  }

  /**
   * Capture document selection from a specific range
   */
  captureDocumentSelectionFromRange(range) {
    // Create a temporary selection with our expanded range
    const tempSelection = window.getSelection();
    tempSelection.removeAllRanges();
    tempSelection.addRange(range);

    // Use existing capture logic
    const result = this.captureDocumentSelection();

    return result;
  }

  /**
   * Create annotation from selected ranges. If the enhanced feature is enabled,
   * the newly created region will be automatically selected.
   * @param {Array} selectedRanges - The ranges to create annotations from
   */
  createAnnotationFromRanges(selectedRanges) {
    const item = this.props.item;
    item._currentSpan = null;
    let createdRegion = null;

    if (isFF(FF_DEV_2918)) {
      const htxRanges = item.addRegions(selectedRanges);
      if (htxRanges && htxRanges.length > 0) {
        createdRegion = htxRanges[0]; // Get the first created region
        for (const htxRange of htxRanges) {
          const spans = htxRange.createSpans();
          htxRange.addEventsToSpans(spans);
        }
      }
    } else {
      createdRegion = item.addRegion(selectedRanges[0]);
      if (createdRegion) {
        const spans = createdRegion.createSpans();
        createdRegion.addEventsToSpans(spans);
      }
    }

    // Always select the newly created region if the feature flag is on.
    // The createdRegion is based on the selectedRanges, which correctly
    // comes from the user's manual selection if it exists.
    if (isFF(FF_NER_SELECT_ALL) && createdRegion) {
      setTimeout(() => {
        item.annotation.selectArea(createdRegion);
      }, 50);
    }
  }

  onMouseUp(ev) {
    const selection = window.getSelection();

    // The "click away to deselect" is part of the enhanced feature set.
    // It should only be active when the feature flag is enabled.
    if (isFF(FF_NER_SELECT_ALL)) {
      // If the user clicks without creating a text selection, it's a clear
      // intent to deselect any currently selected regions.
      if (selection.isCollapsed) {
        const target = ev.target;

        // We only deselect if the click was on the container background,
        // not on an existing annotation, which handles its own clicks.
        if (!target.closest(this._regionSpanSelector)) {
          this.props.item.annotation.unselectAll();
        }
        // In either case, a simple click shouldn't proceed to annotation creation.
        return;
      }
    }

    const item = this.props.item;
    const states = item.activeStates();

    if (!states || states.length === 0 || ev.ctrlKey || ev.metaKey)
      return this._selectRegions(ev.ctrlKey || ev.metaKey);

    if (item.annotation.isReadOnly()) {
      return;
    }

    if (isFF(FF_NER_SELECT_ALL)) {
      // Enhanced behavior: use debounced processing for better UX
      this.processAnnotationDebounced();
    } else {
      // Original behavior: immediate processing
      const selectedRanges = this.captureDocumentSelection();

      if (selectedRanges.length === 0) {
        return;
      }

      item._currentSpan = null;

      if (isFF(FF_DEV_2918)) {
        const htxRanges = item.addRegions(selectedRanges);

        for (const htxRange of htxRanges) {
          const spans = htxRange.createSpans();
          htxRange.addEventsToSpans(spans);
        }
      } else {
        const htxRange = item.addRegion(selectedRanges[0]);

        if (htxRange) {
          const spans = htxRange.createSpans();
          htxRange.addEventsToSpans(spans);
        }
      }
    }
  }

  /**
   * Generates a textual representation of the current selection range.
   *
   * @param {number} start
   * @param {number} end
   * @param {number} startOffset
   * @param {number} endOffset
   * @returns {string}
   */
  _getResultText(start, end, startOffset, endOffset) {
    const phrases = this.phraseElements;

    if (start === end) return phrases[start].innerText.slice(startOffset, endOffset);

    return [
      phrases[start].innerText.slice(startOffset),
      phrases.slice(start + 1, end).map((phrase) => phrase.innerText),
      phrases[end].innerText.slice(0, endOffset),
    ]
      .flat()
      .join("");
  }

  _handleUpdate() {
    const root = this.myRef.current;
    const { item } = this.props;

    // wait until text is loaded
    if (!item._value) return;

    item.regs.forEach((r, i) => {
      // spans can be totally missed if this is app init or undo/redo
      // or they can be disconnected from DOM on annotations switching
      // so we have to recreate them from regions data
      if (r._spans?.[0]?.isConnected) return;

      try {
        const phrases = root.children;
        const range = document.createRange();
        const startNode = phrases[r.start].getElementsByClassName(item.layoutClasses.text)[0];
        const endNode = phrases[r.end].getElementsByClassName(item.layoutClasses.text)[0];

        let { startOffset, endOffset } = r;

        range.setStart(...findNodeAt(startNode, startOffset));
        range.setEnd(...findNodeAt(endNode, endOffset));

        if (r.text && range.toString().replace(/\s+/g, "") !== r.text.replace(/\s+/g, "")) {
          console.info("Restore broken position", i, range.toString(), "->", r.text, r);
          if (
            // span breaks the mock-up by its end, so the start of next one is wrong
            item.regs.slice(0, i).some((other) => r.start === other.end) &&
            // for now there are no fallback for huge wrong regions
            r.start === r.end
          ) {
            // find region's text in the node (disregarding spaces)
            const match = startNode.textContent.match(new RegExp(r.text.replace(/\s+/g, "\\s+")));

            if (!match) console.warn("Can't find the text", r);
            const { index = 0 } = match || {};

            if (r.endOffset - r.startOffset !== r.text.length)
              console.warn("Text length differs from region length; possible regions overlap");
            startOffset = index;
            endOffset = startOffset + r.text.length;

            range.setStart(...findNodeAt(startNode, startOffset));
            range.setEnd(...findNodeAt(endNode, endOffset));
            r.fixOffsets(startOffset, endOffset);
          }
        } else if (!r.text && range.toString()) {
          r.setText(this._getResultText(+r.start, +r.end, startOffset, endOffset));
        }

        splitBoundaries(range);

        r._range = range;
        const spans = r.createSpans();

        r.addEventsToSpans(spans);
      } catch (err) {
        console.log(err, r);
      }
    });

    Array.from(this.myRef.current.getElementsByTagName("a")).forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        return false;
      });
    });

    if (
      isFF(FF_LSDV_E_278) &&
      this.props.item.contextscroll &&
      item.playingId >= 0 &&
      this.lastPlayingId !== item.playingId &&
      this.state.canScroll
    ) {
      const _padding =
        Number.parseInt(window.getComputedStyle(this.myRef.current)?.getPropertyValue("padding-top")) || 0;
      const _playingItem = this.props.item._value[item.playingId];
      const _start = _playingItem.start;
      const _end = _playingItem.end;
      const _phaseHeight = this.activeRef.current?.offsetHeight || 0;
      const _duration = this.props.item._value[item.playingId].duration || _end - _start;
      const _wrapperHeight = root.offsetHeight;
      const _wrapperOffsetTop = this.activeRef.current?.offsetTop - _padding;
      const _splittedText = Math.ceil(this.activeRef.current?.offsetHeight / this.myRef.current?.offsetHeight) + 1; // +1 to make sure the last line is scrolled to the top

      this._disposeTimeout();

      if (_phaseHeight > _wrapperHeight) {
        for (let i = 0; i < _splittedText; i++) {
          this.scrollTimeout.push(
            setTimeout(
              () => {
                const _pos = _wrapperOffsetTop + _phaseHeight * (i * (1 / _splittedText));

                if (this.state.inViewPort && this.state.canScroll) {
                  root.scrollTo({
                    top: _pos,
                    behavior: "smooth",
                  });
                }
              },
              (_duration / _splittedText) * i * 1000,
            ),
          );
        }
      } else {
        if (this.state.inViewPort) {
          root.scrollTo({
            top: _wrapperOffsetTop,
            behavior: "smooth",
          });
        }
      }

      this.lastPlayingId = item.playingId;
    }
  }

  _handleScrollToPhrase() {
    const _padding = Number.parseInt(window.getComputedStyle(this.myRef.current)?.getPropertyValue("padding-top")) || 0;
    const _wrapperOffsetTop = this.activeRef.current?.offsetTop - _padding;

    this.myRef.current.scrollTo({
      top: _wrapperOffsetTop,
      behavior: "smooth",
    });
  }

  _handleScrollContainerHeight = () => {
    requestAnimationFrame(() => {
      const container = this.myRef.current;
      const mainContentView = document.querySelector(this.mainContentSelector);
      const mainRect = mainContentView.getBoundingClientRect();
      const visibleHeight = document.documentElement.clientHeight - mainRect.top;
      const annotationView = document.querySelector(this.mainViewAnnotationSelector);
      const totalVisibleSpace = Math.floor(
        visibleHeight < mainRect.height ? visibleHeight : mainContentView?.offsetHeight || 0,
      );
      const filledSpace = annotationView?.offsetHeight || mainContentView.firstChild?.offsetHeight || 0;
      const containerHeight = container?.offsetHeight || 0;
      const viewPadding =
        Number.parseInt(window.getComputedStyle(mainContentView)?.getPropertyValue("padding-bottom")) || 0;
      const height = totalVisibleSpace - (filledSpace - containerHeight) - viewPadding;
      const minHeight = 100;

      if (container) this.myRef.current.style.maxHeight = `${height < minHeight ? minHeight : height}px`;
    });
  };

  _resizeObserver = new ResizeObserver(this._handleScrollContainerHeight);

  handleSelection = () => {
    // This entire method should be gated by the feature flag.
    if (!isFF(FF_NER_SELECT_ALL)) return;

    const item = this.props.item;
    const selection = window.getSelection();

    // We only care about mouseup events inside this component.
    if (this.myRef.current?.contains(selection.anchorNode)) {
      // If there's a valid, non-empty text selection, we save it.
      // This is the proactive step to capture the user's intent.
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
        item.setLastSelection(selection);
      } else {
        // Otherwise, it's a simple click inside the phrases area which deselects text.
        // We must clear any previously saved selection.
        item.clearLastSelection();
      }
    }
  };

  componentDidUpdate() {
    this._handleUpdate();
  }

  componentDidMount() {
    if (isFF(FF_LSDV_E_278) && this.props.item.contextscroll)
      this._resizeObserver.observe(document.querySelector(this.mainContentSelector));
    this._handleUpdate();

    // The event listener is always active, but the handler itself is now gated.
    document.addEventListener("mouseup", this.handleSelection);

    // Set reference to this component in the model for calling methods
    if (isFF(FF_NER_SELECT_ALL)) {
      this.props.item.setViewRef(this);
    }
  }

  componentWillUnmount() {
    const target = document.querySelector(this.mainContentSelector);

    if (target) this._resizeObserver?.unobserve(target);
    this._resizeObserver?.disconnect();

    document.removeEventListener("mouseup", this.handleSelection);

    // Clean up reference
    if (isFF(FF_NER_SELECT_ALL)) {
      this.props.item.setViewRef(null);
    }
  }

  setIsInViewPort(isInViewPort) {
    this.setState({ inViewPort: isInViewPort });
  }

  renderWrapperHeader() {
    const { item } = this.props;

    return (
      <div className={styles.wrapper_header}>
        {isFF(FF_DEV_2669) && (
          <AuthorFilter
            item={item}
            onChange={() => {
              if (!this.activeRef.current) return;
              const _timeoutDelay =
                Number.parseFloat(window.getComputedStyle(this.activeRef.current).transitionDuration) * 1000;

              setTimeout(() => {
                this._handleScrollToPhrase();
              }, _timeoutDelay);
            }}
          />
        )}
        {item.contextscroll && (
          <div className={styles.wrapper_header__buttons}>
            <Toggle
              data-testid={"auto-scroll-toggle"}
              checked={this.state.canScroll}
              onChange={() => {
                if (!this.state.canScroll) this._handleScrollToPhrase();

                this.setState({
                  canScroll: !this.state.canScroll,
                });
              }}
              label={"Auto-scroll"}
            />
            <Tooltip alignment="top-left" title="Automatically sync transcript scrolling with audio playback">
              <IconHelp />
            </Tooltip>
          </div>
        )}
      </div>
    );
  }

  render() {
    const { item } = this.props;
    const withAudio = !!item.audio;
    const contextScroll = isFF(FF_LSDV_E_278) && this.props.item.contextscroll;

    if (!item.playing && isFF(FF_LSDV_E_278)) this._disposeTimeout(); // dispose scroll timeout when the audio is not playing

    // current way to not render when we wait for data
    if (isFF(FF_DEV_2669) && !item._value) return null;

    return (
      <ObjectTag item={item} className={cn("paragraphs").toClassName()}>
        {withAudio && (
          <audio
            {...audioDefaultProps}
            controls={item.showplayer && !item.syncedAudio}
            className={styles.audio}
            src={item.audio}
            ref={item.audioRef}
            onLoadedMetadata={item.handleAudioLoaded}
            onEnded={item.reset}
            onError={item.handleError}
            onCanPlay={item.handleCanPlay}
          />
        )}
        {isFF(FF_LSDV_E_278) ? this.renderWrapperHeader() : isFF(FF_DEV_2669) && <AuthorFilter item={item} />}
        <div
          ref={this.myRef}
          data-testid="phrases-wrapper"
          data-update={item._update}
          className={contextScroll ? styles.scroll_container : styles.container}
          onMouseUp={this.onMouseUp.bind(this)}
        >
          <Phrases
            setIsInViewport={this.setIsInViewPort.bind(this)}
            item={item}
            playingId={item.playingId}
            {...(isFF(FF_LSDV_E_278) ? { activeRef: this.activeRef } : {})}
          />
        </div>
      </ObjectTag>
    );
  }

  processAnnotationFromRange(range) {
    // When an annotation is triggered from a saved selection, this method is called.
    const selectedRanges = this.captureDocumentSelectionFromRange(range);
    if (selectedRanges.length > 0) {
      this.createAnnotationFromRanges(selectedRanges);
    }
  }

  /**
   * Programmatically select and annotate a phrase by index
   * @param {number} phraseIndex - The index of the phrase to select and annotate
   */
  selectAndAnnotatePhrase(phraseIndex) {
    const item = this.props.item;
    const phrases = item._value;

    if (!phrases || phraseIndex < 0 || phraseIndex >= phrases.length) return;

    const cls = item.layoutClasses;

    // Find the phrase element by index
    const phraseElements = this.myRef.current?.getElementsByClassName(cls.text);
    if (!phraseElements || phraseIndex >= phraseElements.length) return;

    const phraseElement = phraseElements[phraseIndex];
    if (!phraseElement) return;

    // Find the first text node in the phrase element
    const walker = document.createTreeWalker(phraseElement, NodeFilter.SHOW_TEXT, null, false);

    const firstTextNode = walker.nextNode();
    if (!firstTextNode) return;

    // Find the last text node
    let lastTextNode = firstTextNode;
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      lastTextNode = currentNode;
    }

    // Create a selection range that spans the entire phrase
    const range = document.createRange();
    range.setStart(firstTextNode, 0);
    range.setEnd(lastTextNode, lastTextNode.textContent.length);

    // Set the selection
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Process the annotation using existing logic and select the created region
    setTimeout(() => {
      const selectedRanges = this.captureDocumentSelection();
      if (selectedRanges.length === 0) return;

      item._currentSpan = null;
      let createdRegion = null;

      if (isFF(FF_DEV_2918)) {
        const htxRanges = item.addRegions(selectedRanges);
        if (htxRanges && htxRanges.length > 0) {
          createdRegion = htxRanges[0];
          for (const htxRange of htxRanges) {
            const spans = htxRange.createSpans();
            htxRange.addEventsToSpans(spans);
          }
        }
      } else {
        createdRegion = item.addRegion(selectedRanges[0]);
        if (createdRegion) {
          const spans = createdRegion.createSpans();
          createdRegion.addEventsToSpans(spans);
        }
      }

      // Select the newly created region so the user can make further modifications
      if (createdRegion) {
        setTimeout(() => {
          item.annotation.selectArea(createdRegion);
        }, 50);
      }
    }, 10);
  }
}

export const HtxParagraphs = inject("store")(observer(HtxParagraphsView));
