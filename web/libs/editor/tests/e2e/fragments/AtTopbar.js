const { I } = inject();

module.exports = {
  _topbarLocator: locate({ css: ".lsf-bottombar" }),
  _topbarAnnotationsToggle: locate({ css: ".lsf-annotations-list__selected" }),
  _annotationsList: locate({ css: ".lsf-annotations-list__list" }),
  _annotationsListItemSelector: ".lsf-annotations-list__entity",
  seeAnnotationAt(index = 0) {
    this.openAnnotaions();

    I.seeElement(this._annotationsList.find(this._annotationsListItemSelector).at(index));

    this.closeAnnotations();
  },
  openAnnotaions() {
    I.dontSee(this._annotationsList);
    I.click(this._topbarAnnotationsToggle);
    I.seeElement(this._annotationsList);
  },
  closeAnnotations() {
    I.seeElement(this._annotationsList);
    I.click(this._topbarAnnotationsToggle);
    I.dontSee(this._annotationsList);
  },
  selectAnnotationAt(index = 0) {
    I.click(this._annotationsList.find(this._annotationsListItemSelector).at(index));
  },
  see(text) {
    I.see(text, this._topbarLocator);
  },
  dontSee(text) {
    I.dontSee(text, this._topbarLocator);
  },
  seeElement(locator) {
    I.seeElement(this.locate(locator));
  },
  clickText(text) {
    I.click(this._topbarLocator.withText(`${text}`));
  },
  clickAria(label) {
    I.click(`[aria-label="${label}"]`, this._topbarLocator);
  },
  clickDeleteAnnotation() {
    I.click(".lsf-annotation-button__trigger");
    I.wait(1);
    I.click(locate("div").withText("Delete Annotation"));
    I.wait(1);
    I.click(locate(".lsf-button").withText("Delete"));
  },
  click(locator) {
    I.click(this.locate(locator));
  },
  locate(locator) {
    return this._topbarLocator.find(locator);
  },
};
