import {
  DateTime,
  Labels,
  LabelStudio,
  Modals,
  Sidebar,
  ToolBar,
  useDateTime,
} from "@humansignal/frontend-test/helpers/LSF";
import { Hotkeys } from "@humansignal/frontend-test/helpers/LSF/Hotkeys";
import { RichText } from "@humansignal/frontend-test/helpers/LSF/RichText";

const config = `<View>
  <style>
  [data-radix-popper-content-wrapper] {
    z-index: 9999 !important;
  }
  </style>
  <Header>Select text to see related smaller DateTime controls for every region</Header>
  <Labels name="label" toName="text">
    <Label value="birth" background="green"/>
    <Label value="death" background="red"/>
    <Label value="event" background="orange"/>
  </Labels>
  <Text name="text" value="$text"/>
  <DateTime name="created" toName="text" required="true" only="date" format="%d.%m.%Y" min="1988-01-13" max="1999-12-31"/>
  <View visibleWhen="region-selected">
    <Header>Date in this fragment, required, stored as ISO date</Header>
    <DateTime name="date" toName="text" perRegion="true" only="date" required="true" format="%Y-%m-%d"/>
    <Header>Year this happened, but stored also as ISO date</Header>
    <DateTime name="year" toName="text" perRegion="true" only="year" format="%Y-%m-%d" min="2020" max="2022"/>
  </View>
</View>
`;

const data = {
  text: 'Albert Einstein (/ˈaɪnstaɪn/ EYEN-styne;[6] German: [ˈalbɛʁt ˈʔaɪnʃtaɪn] (listen); 14 March 1879 – 18 April 1955) was a German-born theoretical physicist,[7] widely acknowledged to be one of the greatest and most influential physicists of all time. Einstein is best known for developing the theory of relativity, but he also made important contributions to the development of the theory of quantum mechanics. Relativity and quantum mechanics are together the two pillars of modern physics.[3][8] His mass–energy equivalence formula E = mc2, which arises from relativity theory, has been dubbed "the world\'s most famous equation".[9] His work is also known for its influence on the philosophy of science.[10][11] He received the 1921 Nobel Prize in Physics "for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect",[12] a pivotal step in the development of quantum theory. His intellectual achievements and originality resulted in "Einstein" becoming synonymous with "genius".[13]',
};

const createdDate = {
  incorrectMin: "1988-01-12",
  correctMin: "1988-01-13",
  incorrectMax: "2000-01-01",
  correctMax: "1999-12-31",
  result: "31.12.1999",
};

const regions = [
  { label: "birth", rangeStart: 83, rangeEnd: 96, text: "14 March 1879", dateValue: "1879-03-14", year: "2022" },
  { label: "death", rangeStart: 99, rangeEnd: 112, text: "18 April 1955", dateValue: "1955-04-18", year: "2021" },
  {
    label: "event",
    rangeStart: 728,
    rangeEnd: 755,
    text: "1921 Nobel Prize in Physics",
    dateValue: "1921-10-10",
    year: "2020",
  },
];

// biome-ignore lint/suspicious/noFocusedTests: <explanation>
describe.only("Date Time", () => {
  // biome-ignore lint/suspicious/noFocusedTests: <explanation>
  it.only("should hold state between annotations and saves result", () => {
    LabelStudio.params().config(config).data(data).withResult([]).init();
    LabelStudio.waitForObjectsReady();

    ////// GLOBAL
    cy.log("Check validation of required global date control");
    ToolBar.submitBtn.click();
    Modals.hasWarning('DateTime "created" is required');
    Modals.okButton.click();
    Modals.hasNoWarnings();

    const checks = {
      incorrect: [
        [createdDate.incorrectMin, "min date is 1988-01-13"],
        [createdDate.incorrectMax, "max date is 1999-12-31"],
      ],
      correct: [[createdDate.correctMin], [createdDate.correctMax]],
    };

    for (const [incorrect, error] of checks.incorrect) {
      DateTime.type(incorrect);
      ToolBar.submitBtn.click();
      Modals.hasWarning(error);
      Modals.okButton.click();
      Modals.hasNoWarnings();
      DateTime.dateInput.should("have.css", "border-color", "rgb(255, 0, 0)");
    }

    for (const [correct] of checks.correct) {
      DateTime.type(correct);
      ToolBar.submitBtn.click();
      Modals.hasNoWarnings();
    }

    DateTime.type(createdDate.correctMax);

    const PerRegionDateTime = useDateTime("&:eq(1)");
    const PerRegionYearSelector = useDateTime("&:eq(2)");
    ////// PER-REGION
    cy.log("Create regions but leave dates empty");

    for (const region of regions) {
      Labels.select(region.label);
      RichText.selectText(region.text);
      Hotkeys.unselectAllRegions();
    }

    cy.log("Try to submit and observe validation errors about per-regions");
    ToolBar.submitBtn.click();
    Modals.hasWarning('DateTime "date" is required');
    Modals.okButton.click();
    Modals.hasNoWarnings();

    // invalid region is selected on validation to reveal per-region control with error
    Sidebar.hasSelectedRegion(0);
    PerRegionDateTime.type(regions[0].dateValue);
    ToolBar.submitBtn.click();

    // next region with empty required date is selected and error is shown
    Modals.hasWarning('DateTime "date" is required');
    Modals.okButton.click();
    Modals.hasNoWarnings();
    Sidebar.hasSelectedRegion(1);
    cy.log("Fill all per-region date fields and check it's all good");
    regions.forEach((region) => {
      Sidebar.toggleRegionSelection(`:contains(${region.text})`);
      PerRegionDateTime.type(region.dateValue);
    });

    Sidebar.toggleRegionSelection(`:contains(${regions[0].text})`);
    // less than min
    PerRegionYearSelector.clickSelectTrigger();
    // less than min
    PerRegionYearSelector.hasNoSelectOption("1999");
    // less than max
    PerRegionYearSelector.hasNoSelectOption("2023");
    // exactly the same as max, should be correct
    PerRegionYearSelector.hasSelectOption("2022");

    PerRegionYearSelector.selectOption("2022", true);
    PerRegionYearSelector.hasValue("2022");
    Hotkeys.unselectAllRegions();

    regions.forEach((region) => {
      Sidebar.toggleRegionSelection(`:contains(${region.text})`);
      PerRegionYearSelector.selectOption(region.year);
    });

    ToolBar.submitBtn.click();
    Modals.hasNoWarnings();

    regions.forEach((region) => {
      Sidebar.toggleRegionSelection(`:contains(${region.text})`);
      // important to see that per-regions change their values
      PerRegionDateTime.hasValue(region.dateValue);
      PerRegionYearSelector.hasValue(region.year);
    });

    LabelStudio.serialize().then((results) => {
      results
        .filter((result) => result.value.start)
        .forEach((result) => {
          const input = regions.find((reg) => reg.text === result.value.text);
          const expected = { end: input.rangeEnd, start: input.rangeStart, text: input.text };

          switch (result.from_name) {
            case "label":
              expected.labels = [input.label];
              break;
            case "date":
              expected.datetime = input.dateValue;
              break;
            // year is formatted in config to be an ISO date
            case "year":
              expected.datetime = `${input.year}-01-01`;
              break;
          }

          expect(result.value).deep.equal(expected);
        });
      expect(results[0].value.datetime).deep.equal(createdDate.result);
    });
  });
});
