class DateTimeHelper {
  private get _baseRootSelector() {
    return ".htx-datetime";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get dateInput() {
    return this.root.find('[type="date"]');
  }

  get timeInput() {
    return this.root.find('[type="time"]');
  }

  get selectTrigger() {
    return this.root.find('[type="button"]');
  }

  get selectOptions() {
    return cy.get('[data-testid*="select-option"]');
  }

  /*
    This element is hidden
  */
  get selectInput() {
    return this.root.find("select");
  }

  private _dateRegExp = /^\d{4}-\d{2}-\d{2}$/;
  private _timeRegExp = /^\d{2}:\d{2}$/;
  private _yearRegExp = /^\d{4}$/;
  /**
   *
   * @param datetime accepts formats `YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm`, `YYYY-MM-DD HH:mm`, `YYYY-MM-DD, HH:mm`
   */
  type(datetime: string) {
    const parts = datetime
      .split(/[^\d\-:]/)
      .filter((value) => value.match(this._dateRegExp) || value.match(this._timeRegExp));

    cy.wrap(parts).should("have.lengthOf.at.least", 1);

    for (const value of parts) {
      if (value.match(this._dateRegExp)) {
        this.dateInput.type(value);
      }
      if (value.match(this._timeRegExp)) {
        this.timeInput.type(value);
      }
    }
  }
  /**
   *
   * @param datetime accepts formats `YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm`, `YYYY-MM-DD HH:mm`, `YYYY-MM-DD, HH:mm`
   */
  hasValue(datetime: string) {
    const parts = datetime
      .split(/[^\d\-:]/)
      .filter(
        (value) => value.match(this._dateRegExp) || value.match(this._timeRegExp) || value.match(this._yearRegExp),
      );

    cy.wrap(parts).should("have.lengthOf.at.least", 1);

    for (const value of parts) {
      if (value.match(this._dateRegExp)) {
        this.dateInput.should("have.value", value);
      }
      if (value.match(this._timeRegExp)) {
        this.timeInput.should("have.value", value);
      }
      if (value.match(this._yearRegExp)) {
        this.selectInput.should("have.value", value);
      }
    }
  }

  clickSelectTrigger() {
    this.selectTrigger.click();
  }

  selectOption(text: string, isOpened: false) {
    !isOpened && this.clickSelectTrigger();
    this.selectOptions.contains(text).click();
  }

  hasSelectOption(text: string) {
    this.selectOptions.contains(text).should("exist");
  }

  hasNoSelectOption(text: string) {
    this.selectOptions.contains(text).should("not.exist");
  }
}

const DateTime = new DateTimeHelper("&:eq(0)");
const useDateTime = (rootSelector: string) => {
  return new DateTimeHelper(rootSelector);
};

export { DateTime, useDateTime };
