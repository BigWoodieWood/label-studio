import { createRef } from "react";
import { reaction } from "mobx";
import { getRoot, types } from "mobx-state-tree";
import ColorScheme from "pleasejs";

import { errorBuilder } from "../../../core/DataValidator/ConfigValidator";
import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import RegionsMixin from "../../../mixins/Regions";
import { SyncableMixin } from "../../../mixins/Syncable";
import { ParagraphsRegionModel } from "../../../regions/ParagraphsRegion";
import Utils from "../../../utils";
import { parseValue } from "../../../utils/data";
import { FF_DEV_2669, FF_DEV_2918, FF_LSDV_E_278, FF_NER_SELECT_ALL, isFF } from "../../../utils/feature-flags";
import messages from "../../../utils/messages";
import { clamp, isDefined, isValidObjectURL } from "../../../utils/utilities";
import ObjectBase from "../Base";
import styles from "./Paragraphs.module.scss";

/**
 * The `Paragraphs` tag displays paragraphs of text on the labeling interface. Use to label dialogue transcripts for NLP and NER projects.
 * The `Paragraphs` tag expects task data formatted as an array of objects like the following:
 * [{ $nameKey: "Author name", $textKey: "Text" }, ... ]
 *
 * Use with the following data types: text.
 * @example
 * <!--Labeling configuration to label paragraph regions of text containing dialogue-->
 * <View>
 *   <Paragraphs name="dialogue-1" value="$dialogue" layout="dialogue" />
 *   <ParagraphLabels name="importance" toName="dialogue-1">
 *     <Label value="Important content"></Label>
 *     <Label value="Random talk"></Label>
 *   </ParagraphLabels>
 * </View>
 * @example
 * <!-- Paragraphs with audio -->
 * <View>
 *   <Paragraphs audioUrl="$audio" value="$para" name="paragraphs"
 *               layout="dialogue" textKey="text" nameKey="author"
 *               showPlayer="true"
 *               />
 *
 *   <Choices name="choices" toName="paragraphs" choice="multiple">
 *       <Choice value="Good quality"/>
 *       <Choice value="Fast speech"/>
 *   </Choices>
 * </View>
 *
 * <!-- {"data": {
 *   "para": [
 *     {"text": "test 1", "author": "A", "start": 0.0, "end": 1.0},
 *     {"text": "test 2", "author": "B", "start": 1.0, "end": 2.0},
 *     {"text": "test 3", "author": "A", "start": 2.0, "end": 3.0}
 *   ],
 *   "audio": "/static/samples/game.wav"
 * }}
 * -->
 * @name Paragraphs
 * @regions ParagraphsRegion
 * @meta_title Paragraph Tags for Paragraphs
 * @meta_description Customize Label Studio with the Paragraphs tag to annotate paragraphs for NLP and NER machine learning and data science projects.
 * @param {string} name                   - Name of the element
 * @param {string} value                  - Data field containing the paragraph content
 * @param {json|url} [valueType=json]     - Whether the data is stored directly in uploaded JSON data or needs to be loaded from a URL
 * @param {string} [audioUrl]             - Audio to sync phrases with
 * @param {string} [sync]                 - Object name to sync with
 * @param {boolean} [showPlayer=false]    - Whether to show audio player above the paragraphs. Ignored if sync object is audio
 * @param {no|yes} [saveTextResult=yes]   - Whether to store labeled text along with the results. By default, doesn't store text for `valueType=url`
 * @param {none|dialogue} [layout=none]   - Whether to use a dialogue-style layout or not
 * @param {string} [nameKey=author]       - The key field to use for name
 * @param {string} [textKey=text]         - The key field to use for the text
 * @param {boolean} [contextScroll=false] - Turn on contextual scroll mode
 */
const TagAttrs = types.model("ParagraphsModel", {
  value: types.maybeNull(types.string),
  valuetype: types.optional(types.enumeration(["json", "url"]), () => (window.LS_SECURE_MODE ? "url" : "json")),
  audiourl: types.maybeNull(types.string),
  showplayer: false,

  highlightcolor: types.maybeNull(types.string),
  showlabels: types.optional(types.boolean, false),

  layout: types.optional(types.enumeration(["none", "dialogue"]), "none"),

  // @todo add `valueType=url` to Paragraphs and make autodetection of `savetextresult`
  savetextresult: types.optional(types.enumeration(["none", "no", "yes"]), () =>
    window.LS_SECURE_MODE ? "no" : "yes",
  ),

  namekey: types.optional(types.string, "author"),
  textkey: types.optional(types.string, "text"),
  contextscroll: types.optional(types.boolean, false),
});

const Model = types
  .model("ParagraphsModel", {
    type: "paragraphs",
    _update: types.optional(types.number, 1),
  })
  .views((self) => ({
    get hasStates() {
      const states = self.states();

      return states && states.length > 0;
    },

    get store() {
      return getRoot(self);
    },

    get audio() {
      if (!self.audiourl) return null;
      if (self.audiourl[0] === "$") {
        const store = getRoot(self);
        const val = self.audiourl.substr(1);

        return store.task.dataObj[val];
      }
      return self.audiourl;
    },

    layoutStyles(data) {
      if (self.layout === "dialogue") {
        const seed = data[self.namekey];
        const color = ColorScheme.make_color({ seed })[0];

        if (isFF(FF_LSDV_E_278)) {
          return {
            phrase: {
              "--highlight-color": color,
              "--background-color": "#FFF",
            },
            name: { color },
            inactive: {
              phrase: {
                "--highlight-color": Utils.Colors.convertToRGBA(color, 0.4),
                "--background-color": "#FAFAFA",
              },
              name: { color: Utils.Colors.convertToRGBA(color, 0.9) },
            },
          };
        }
        return {
          phrase: { backgroundColor: Utils.Colors.convertToRGBA(color, 0.25) },
        };
      }

      return {};
    },

    get layoutClasses() {
      if (self.layout === "dialogue") {
        return {
          phrase: styles.phrase,
          name: styles.dialoguename,
          text: styles.dialoguetext,
        };
      }

      return {
        phrase: styles.phrase,
        name: styles.name,
        text: styles.text,
      };
    },

    states() {
      return self.annotation.toNames.get(self.name);
    },

    activeStates() {
      const states = self.states();

      return states && states.filter((s) => s.isSelected && s._type === "paragraphlabels");
    },

    isVisibleForAuthorFilter(data) {
      if (!isFF(FF_DEV_2669)) return true;

      return !self.filterByAuthor.length || self.filterByAuthor.includes(data[self.namekey]);
    },
  }));

const PlayableAndSyncable = types
  .model()
  .volatile(() => ({
    _value: null,
    filterByAuthor: [],
    searchAuthor: "",
    playingId: -1,
    playing: false, // just internal state for UI
    audioRef: createRef(),
    audioDuration: null,
    audioFrameHandler: null,
    _viewRef: null, // Reference to HtxParagraphs component
    _labelReactionDisposer: null, // MobX reaction disposer
    lastSelection: null, // Proactively store the user's last valid text selection
  }))
  .views((self) => ({
    /**
     * All regions indices that are active at the given time.
     * @param {number} time
     * @returns {Array<number>}
     */
    regionIndicesByTime(time) {
      const indices = [];

      self._value?.forEach(({ start, duration, end }, idx) => {
        if (start === undefined) return false;
        if (start > time) return false;
        if (duration === undefined && end === undefined) indices.push(idx);
        else if ((end ?? start + duration) > time) indices.push(idx);
      });

      return indices;
    },
    /**
     * Returns regions start and end times.
     * Memoized and with no external dependencies, so will be computed only once.
     * @returns {Array<{start: number, end: number}>}
     */
    get regionsStartEnd() {
      if (!self.audioDuration) return [];

      return self._value?.map((value) => {
        if (value.start === undefined) return {};

        const start = clamp(value.start ?? 0, 0, self.audioDuration);
        const _end = value.duration ? start + value.duration : (value.end ?? self.audioDuration);
        const end = clamp(_end, start, self.audioDuration);

        return { start, end };
      });
    },
    get regionsValues() {
      return Object.values(self.regionsStartEnd);
    },
  }))
  .actions((self) => ({
    /**
     * Wrapper to always send important data during sync
     * @param {string} event
     * @param {object} data
     */
    triggerSync(event, data) {
      const audio = self.audioRef.current;

      if (!audio) return;

      self.syncSend(
        {
          playing: !audio.paused,
          time: audio.currentTime,
          ...data,
        },
        event,
      );
    },

    registerSyncHandlers() {
      self.syncHandlers.set("pause", self.stopNow);
      self.syncHandlers.set("play", self.handleSyncPlay);
      self.syncHandlers.set("seek", self.handleSyncPlay);
      self.syncHandlers.set("speed", self.handleSyncSpeed);
    },

    handleSyncPlay({ time, playing }) {
      const audio = self.audioRef.current;

      if (!audio) return;

      // so we are changing time inside current region only
      audio.currentTime = time;
      if (audio.paused && playing) {
        self.play();
      } else {
        self.trackPlayingId();
      }
    },

    handleSyncSpeed({ speed }) {
      const audio = self.audioRef.current;

      if (audio) audio.playbackRate = speed;
    },

    syncMuted(muted) {
      const audio = self.audioRef.current;

      if (audio) audio.muted = muted;
    },
  }))
  .actions((self) => ({
    handleAudioLoaded(e) {
      const audio = e.target;

      self.audioDuration = audio.duration;
    },

    reset() {
      self.playingId = -1;

      if (self.audioFrameHandler) {
        cancelAnimationFrame(self.audioFrameHandler);
        self.audioFrameHandler = null;
      }
    },

    stopNow() {
      const audio = self.audioRef.current;

      if (!audio) return;
      if (audio.paused) return;

      audio.pause();
      self.playing = false;
      self.triggerSync("pause");
    },

    /**
     * Audio can be seeked to another time or speed can be changed,
     * so we need to check if we already reached the end of current region
     * and stop if needed.
     * Runs timer to check this every frame.
     */
    stopAtTheEnd() {
      const audio = self.audioRef.current;

      if (!audio) return;
      if (audio.paused) return;

      const { end } = self.regionsStartEnd[self.playingId] ?? {};

      if (audio.currentTime < end) {
        self.audioFrameHandler = requestAnimationFrame(self.stopAtTheEnd);
        return;
      }

      self.stopNow();
      self.reset();
    },

    trackPlayingId() {
      if (self.audioFrameHandler) cancelAnimationFrame(self.audioFrameHandler);

      const audio = self.audioRef.current;
      const currentTime = audio?.currentTime;
      const endTime = audio?.duration;

      if (!isDefined(currentTime) || !isDefined(endTime) || currentTime >= endTime) {
        self.reset();
        return;
      }

      const regions = self.regionsValues;

      self.playingId = regions.findIndex(({ start, end }) => {
        return currentTime >= start && currentTime < end;
      });

      if (!audio.paused) {
        self.audioFrameHandler = requestAnimationFrame(self.trackPlayingId);
      }
    },

    playAny() {
      const audio = self.audioRef?.current;

      if (!isDefined(audio)) return;

      const isPaused = audio.paused;

      if (isPaused) {
        audio.play();
        self.triggerSync("play");
      }

      self.playing = true;
      self.trackPlayingId();
    },

    play(idx) {
      if (!isDefined(idx)) {
        self.playAny();
        return;
      }

      const { start, end } = self.regionsStartEnd[idx] ?? {};
      const audio = self.audioRef?.current;

      if (!isDefined(audio) || !isDefined(start) || !isDefined(end)) return;

      const isPlaying = !audio.paused;
      const currentId = self.playingId;

      if (isPlaying && currentId === idx) {
        self.stopNow();
        return;
      }

      if (idx !== currentId) {
        audio.currentTime = start;
      }

      audio.play();
      self.playing = true;
      self.playingId = idx;
      self.triggerSync("play");
      self.trackPlayingId();
    },

    /**
     * Seek to a specific phrase by index and select it
     * @param {number} idx - The phrase index
     */
    seekToPhrase(idx) {
      if (!isDefined(idx) || !self._value || idx < 0 || idx >= self._value.length) return;

      const phrase = self._value[idx];
      if (!isDefined(phrase.start)) return;

      // If this phrase is already active, don't send seek messages (user might just be selecting text)
      if (self.playingId === idx) {
        return;
      }

      // Unselect regions that don't belong to the current phrase (enhanced annotation feature)
      self.unselectRegionsNotInPhrase(idx);
      // Unselect any currently selected labels to avoid confusion when clicking on a new phrase
      self.annotation?.unselectStates();

      // Set the playing ID to the clicked phrase
      self.playingId = idx;

      // Check if there are selected labels and automatically annotate the new phrase (enhanced annotation feature)
      if (isFF(FF_NER_SELECT_ALL)) {
        self.checkAndAnnotateNewPhrase();
      }

      // Send sync message if available
      if (self.syncSend) {
        self.syncSend({ time: phrase.start, playing: false }, "seek");
      } else {
        // Fallback: directly set audio time
        const audio = self.audioRef?.current;
        if (audio) {
          audio.currentTime = phrase.start;
        }
      }
    },

    /**
     * Unselect regions that don't belong to the specified phrase
     * @param {number} phraseIdx - The phrase index to keep selected
     */
    unselectRegionsNotInPhrase(phraseIdx) {
      if (!isFF(FF_NER_SELECT_ALL)) return;

      const selectedRegions = self.annotation?.selectedRegions || [];

      selectedRegions.forEach((region) => {
        // Check if this region belongs to this paragraphs object
        if (region.object === self) {
          const regionData = region.serialize?.()?.value;
          if (regionData && regionData.start !== undefined && regionData.end !== undefined) {
            // Check if the current phrase index falls within this region
            const phraseInRegion = phraseIdx >= regionData.start && phraseIdx <= regionData.end;

            if (!phraseInRegion) {
              // This region doesn't contain the current phrase, so unselect it
              console.log(
                `Unselecting region (${regionData.start}-${regionData.end}) - doesn't contain phrase ${phraseIdx}`,
              );
              self.annotation.unselectArea(region);
            }
          }
        }
      });
    },

    /**
     * Check if there are selected labels and automatically annotate the current phrase
     */
    checkAndAnnotateNewPhrase() {
      if (!isFF(FF_NER_SELECT_ALL)) return;

      console.log(`checkAndAnnotateNewPhrase: checking phrase ${self.playingId}`);

      // Get all label controls that target this paragraphs tag
      const labelControls =
        self.annotation?.toNames
          ?.get(self.name)
          ?.filter((control) => control.type === "paragraphlabels" || control.type === "labels") || [];

      console.log(`checkAndAnnotateNewPhrase: found ${labelControls.length} label controls`);

      // Check if any labels are currently selected
      const hasSelectedLabels = labelControls.some((control) => {
        const selectedCount = control.selectedLabels ? control.selectedLabels.length : 0;
        console.log(`checkAndAnnotateNewPhrase: control ${control.name} has ${selectedCount} selected labels`);
        return control.selectedLabels && control.selectedLabels.length > 0;
      });

      console.log(`checkAndAnnotateNewPhrase: hasSelectedLabels = ${hasSelectedLabels}`);

      if (hasSelectedLabels) {
        console.log(`Selected labels found when clicking phrase ${self.playingId}, attempting to annotate`);
        // Trigger annotation for the new phrase
        self.selectAndAnnotateActivePhrase();
      } else {
        console.log(`No selected labels found when clicking phrase ${self.playingId}, skipping annotation`);
      }
    },

    /**
     * Set a reference to the HtxParagraphs component for calling its methods
     */
    setViewRef(ref) {
      self._viewRef = ref;
    },

    /**
     * Trigger selection and annotation of the current active phrase
     */
    selectAndAnnotateActivePhrase() {
      // Enhanced annotation feature - only run if feature flag is enabled
      if (!isFF(FF_NER_SELECT_ALL)) return;

      // Prioritize the proactively saved user selection. This is the core of the fix.
      if (self.lastSelection) {
        self._viewRef.processAnnotationFromRange(self.lastSelection);
        // Clear the selection immediately after using it to prevent reuse.
        self.clearLastSelection();
        return;
      }

      // --- Fallback to original logic if no saved selection ---
      if (self.playingId >= 0 && self._viewRef) {
        // This part now primarily handles the "no user selection" case,
        // where we annotate the entire active phrase.
        const selection = window.getSelection();
        const hasUserSelection = selection && !selection.isCollapsed && selection.toString().trim().length > 0;

        if (hasUserSelection) {
          // This is a fallback, but the primary path should be the saved selection.
          self._viewRef.processAnnotation();
          return;
        }

        const existingRegions = self.regs || [];
        const hasExistingLabels = existingRegions.some((region) => {
          // For paragraphs regions, check if there's already any annotation that covers this phrase
          const regionData = region.serialize?.()?.value;
          if (regionData && regionData.start !== undefined && regionData.end !== undefined) {
            // Check if the current phrase index falls within any existing region
            return self.playingId >= regionData.start && self.playingId <= regionData.end;
          }
          return false;
        });

        // Also check if there are any results/annotations that might be associated with this phrase
        const annotationResults = self.annotation?.results || [];
        const hasExistingResults = annotationResults.some((result) => {
          // Check if this result is from a control that targets this paragraphs object
          if (result.to_name === self && result.value) {
            const resultValue = result.value;
            // Check if the result covers this phrase index
            if (resultValue.start !== undefined && resultValue.end !== undefined) {
              return self.playingId >= resultValue.start && self.playingId <= resultValue.end;
            }
          }
          return false;
        });

        // Only create automatic phrase annotation if there are NO existing labels/annotations for this phrase
        if (!hasExistingLabels && !hasExistingResults) {
          console.log(`Creating automatic annotation for phrase ${self.playingId}`);
          self._viewRef.selectAndAnnotatePhrase(self.playingId);
        } else {
          console.log(
            `Skipping automatic annotation for phrase ${self.playingId}: existing labels=${hasExistingLabels}, existing results=${hasExistingResults}`,
          );
        }
      }
    },

    afterCreate() {
      // Set up reaction to observe label selection changes (enhanced annotation feature)
      if (isFF(FF_NER_SELECT_ALL)) {
        self._labelReactionDisposer = reaction(
          () => {
            // Get all label controls that target this paragraphs tag
            const labelControls =
              self.annotation?.toNames
                ?.get(self.name)
                ?.filter((control) => control.type === "paragraphlabels" || control.type === "labels") || [];

            // Return array of selected labels from all label controls
            return labelControls.flatMap((control) => control.selectedLabels?.map((label) => label.id) || []);
          },
          (selectedLabelIds, prevSelectedLabelIds) => {
            // Only trigger if labels were added (not removed)
            if (selectedLabelIds.length > (prevSelectedLabelIds?.length || 0)) {
              // Only create annotation if there's no existing annotation on the current phrase
              self.selectAndAnnotateActivePhrase();
            }
          },
        );
      }
    },

    beforeDestroy() {
      // Clean up the reaction
      if (self._labelReactionDisposer) {
        self._labelReactionDisposer();
        self._labelReactionDisposer = null;
      }
    },
  }))
  .actions((self) => ({
    setAuthorSearch(value) {
      self.searchAuthor = value;
    },

    setAuthorFilter(value) {
      self.filterByAuthor = value;
    },

    setLastSelection(selection) {
      if (selection && selection.rangeCount > 0) {
        self.lastSelection = selection.getRangeAt(0);
      } else {
        self.lastSelection = null;
      }
    },

    clearLastSelection() {
      self.lastSelection = null;
    },
  }));

const ParagraphsLoadingModel = types.model().actions((self) => ({
  needsUpdate() {
    self._update = self._update + 1;
  },

  updateValue(store) {
    const value = parseValue(self.value, store.task.dataObj);

    if (self.valuetype === "url") {
      const url = value;

      if (!isValidObjectURL(url, true)) {
        const message = [];

        if (url) {
          message.push(`URL (${url}) is not valid.`);
          message.push('You should not put data directly into your task if you use valuetype="url".');
        } else {
          message.push(`URL is empty, check ${value} in data JSON.`);
        }
        if (window.LS_SECURE_MODE) message.unshift('In SECURE MODE valuetype set to "url" by default.');
        store.annotationStore.addErrors([errorBuilder.generalError(message.join("\n"))]);
        self.setRemoteValue("");
        return;
      }
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then(self.setRemoteValue)
        .catch((e) => {
          const message = messages.ERR_LOADING_HTTP({ attr: self.value, error: String(e), url });

          store.annotationStore.addErrors([errorBuilder.generalError(message)]);
          self.setRemoteValue("");
        });
    } else {
      self.setRemoteValue(value);
    }
  },

  setRemoteValue(val) {
    const errors = [];

    if (!Array.isArray(val)) {
      errors.push("Provided data is not an array");
    } else {
      if (!(self.namekey in val[0])) {
        errors.push(`"${self.namekey}" field not found in task data; check your <b>nameKey</b> parameter`);
      }
      if (!(self.textkey in val[0])) {
        errors.push(`"${self.textkey}" field not found in task data; check your <b>textKey</b> parameter`);
      }
    }
    if (errors.length) {
      const general = [
        `Task data (provided as <b>${self.value}</b>) has wrong format.<br/>`,
        "It should be an array of objects with fields,",
        'defined by <b>nameKey</b> ("author" by default)',
        'and <b>textKey</b> ("text" by default)',
      ].join(" ");

      self.store.annotationStore.addErrors([
        errorBuilder.generalError(`${general}<ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`),
      ]);
      return;
    }
    const contextScroll = isFF(FF_LSDV_E_278) && self.contextscroll;

    const value = contextScroll
      ? val.sort((a, b) => {
          if (!a.start) return 1;
          if (!b.start) return -1;
          const aEnd = a.end ? a.end : a.start + a.duration || 0;
          const bEnd = b.end ? b.end : b.start + b.duration || 0;

          if (a.start === b.start) return aEnd - bEnd;
          return a.start - b.start;
        })
      : val;

    self._value = value;
    self.needsUpdate();
  },

  createRegion(p) {
    const r = ParagraphsRegionModel.create({
      pid: p.id,
      ...p,
    });

    r._range = p._range;

    self.regions.push(r);
    self.annotation.addRegion(r);

    return r;
  },

  addRegions(ranges) {
    const areas = [];
    const states = self.getAvailableStates();

    if (states.length === 0) return;

    const control = states[0];
    const labels = { [control.valueType]: control.selectedValues() };

    for (const range of ranges) {
      const area = self.annotation.createResult(range, labels, control, self);

      area.setText(range.text);

      area.notifyDrawingFinished();

      area._range = range._range;
      areas.push(area);
    }
    return areas;
  },

  addRegion(range) {
    if (isFF(FF_DEV_2918)) {
      return self.addRegions([range])[0];
    }
    const states = self.getAvailableStates();

    if (states.length === 0) return;

    const control = states[0];
    const labels = { [control.valueType]: control.selectedValues() };
    const area = self.annotation.createResult(range, labels, control, self);

    area.setText(range.text);

    area.notifyDrawingFinished();

    area._range = range._range;
    return area;
  },
}));

const paragraphModelMixins = [
  RegionsMixin,
  TagAttrs,
  SyncableMixin,
  ObjectBase,
  AnnotationMixin,
  Model,
  PlayableAndSyncable,
  ParagraphsLoadingModel,
].filter(Boolean);

export const ParagraphsModel = types.compose("ParagraphsModel", ...paragraphModelMixins);
