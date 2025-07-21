const assert = require("assert");

Feature("Paragraphs Enhanced Annotation (FF_LSDV_E_279)");

const AUDIO = "/public/files/barradeen-emotional.mp3";

const DATA = {
  audio: AUDIO,
  dialogue: [
    {
      start: 3.1,
      end: 5.6,
      author: "Mia Wallace",
      text: "Dont you hate that?",
    },
    {
      start: 4.2,
      duration: 3.1,
      author: "Vincent Vega:",
      text: "Hate what?",
    },
    {
      author: "Mia Wallace:",
      text: "Uncomfortable silences. Why do we feel its necessary to yak about nonsense in order to be comfortable?",
    },
    {
      start: 90,
      author: "Vincent Vega:",
      text: "I dont know. Thats a good question.",
    },
    {
      author: "Mia Wallace:",
      text: "Thats when you know you found somebody really special. When you can just shut the door closed a minute, and comfortably share silence.",
    },
  ],
};

const CONFIG = `
<View>
  <style>
    [data-radix-popper-content-wrapper] {
      z-index: 9999 !important;
    }
  </style>
  <ParagraphLabels name="ner" toName="text">
    <Label value="Important Stuff"></Label>
    <Label value="Random talk"></Label>
    <Label value="Other"></Label>
  </ParagraphLabels>
  <Paragraphs audioUrl="$audio" name="text" value="$dialogue" layout="dialogue" savetextresult="yes" />
</View>`;

const FEATURE_FLAGS = {
  ff_front_dev_2669_paragraph_author_filter_210622_short: true,
  fflag_fix_front_dev_2918_labeling_filtered_paragraphs_250822_short: true,
};

Scenario(
  "Unselect all labels when clicking a new phrase (FF_LSDV_E_279)",
  async ({ I, LabelStudio, AtParagraphs, AtLabels }) => {
    const params = {
      data: DATA,
      config: CONFIG,
    };

    I.amOnPage("/");

    LabelStudio.setFeatureFlags({
      ...FEATURE_FLAGS,
      fflag_feat_front_lsdv_e_279_enhanced_paragraph_annotation_short: true,
    });
    LabelStudio.init(params);

    I.say("Select a label");
    AtLabels.clickLabel("Important Stuff");
    AtLabels.seeSelectedLabel("Important Stuff");

    I.say("Click on a phrase - should unselect all labels");
    I.click(locate("[class^='phrase--']").withText("Hate what?"));
    AtLabels.dontSeeSelectedLabel();
  },
);

Scenario(
  "Auto-annotate full phrase when label is clicked after phrase (FF_LSDV_E_279)",
  async ({ I, LabelStudio, AtParagraphs, AtLabels, AtOutliner }) => {
    const params = {
      data: DATA,
      config: CONFIG,
    };

    I.amOnPage("/");

    LabelStudio.setFeatureFlags({
      ...FEATURE_FLAGS,
      fflag_feat_front_lsdv_e_279_enhanced_paragraph_annotation_short: true,
    });
    LabelStudio.init(params);
    AtOutliner.seeRegions(0);

    I.say("Click on a phrase first");
    I.click(locate("[class^='phrase--']").withText("Hate what?"));

    I.say("Then select a label - should auto-annotate the full phrase");
    AtLabels.clickLabel("Important Stuff");
    AtOutliner.seeRegions(1);

    const result = await LabelStudio.serialize();
    assert.ok(result[0].value.text.includes("Hate what?"), "Region should cover the full phrase");
  },
);

Scenario(
  "No duplicate annotation for the same phrase and label (FF_LSDV_E_279)",
  async ({ I, LabelStudio, AtParagraphs, AtLabels, AtOutliner }) => {
    const params = {
      data: DATA,
      config: CONFIG,
    };

    I.amOnPage("/");

    LabelStudio.setFeatureFlags({
      ...FEATURE_FLAGS,
      fflag_feat_front_lsdv_e_279_enhanced_paragraph_annotation_short: true,
    });
    LabelStudio.init(params);
    AtOutliner.seeRegions(0);

    I.say("Create initial annotation");
    I.click(locate("[class^='phrase--']").withText("Hate what?"));
    AtLabels.clickLabel("Important Stuff");
    AtOutliner.seeRegions(1);

    I.say("Try to create the same annotation again - should not create duplicate");
    I.click(locate("[class^='phrase--']").withText("Hate what?"));
    AtLabels.clickLabel("Important Stuff");
    AtOutliner.seeRegions(1);
  },
);

// Scenario(
//   "Manual selection always annotates only the selected text (FF_LSDV_E_279)",
//   async ({ I, LabelStudio, AtParagraphs, AtLabels, AtOutliner }) => {
//     // TODO: This test has timing issues - needs investigation
//   },
// );

Scenario(
  "Feature flag disabled preserves old behavior (FF_LSDV_E_279)",
  async ({ I, LabelStudio, AtParagraphs, AtLabels }) => {
    const params = {
      data: DATA,
      config: CONFIG,
    };

    I.amOnPage("/");

    LabelStudio.setFeatureFlags({
      ...FEATURE_FLAGS,
      fflag_feat_front_lsdv_e_279_enhanced_paragraph_annotation_short: false,
    });
    LabelStudio.init(params);

    I.say("Select a label");
    AtLabels.clickLabel("Important Stuff");
    AtLabels.seeSelectedLabel("Important Stuff");

    I.say("Click on a phrase - label should remain selected (old behavior)");
    I.click(locate("[class^='phrase--']").withText("Hate what?"));
    AtLabels.seeSelectedLabel("Important Stuff");
  },
);

// Scenario(
//   "Audio seeks to correct time when clicking a phrase (FF_LSDV_E_279)",
//   async ({ I, LabelStudio, AtParagraphs }) => {
//     // TODO: This test has audio timing issues - needs investigation
//   },
// );
