export const ToolBar = {
  _controlsSelector: ".lsf-controls",

  get sectionOne() {
    return cy.get(".lsf-topbar").find(".lsf-topbar__group").eq(0);
  },

  get sectionTwo() {
    return cy.get(".lsf-bottombar");
  },

  get controls() {
    return this.sectionTwo.find(this._controlsSelector);
  },

  get controlButtons() {
    return this.controls.find("button");
  },

  get viewAllBtn() {
    return this.sectionOne.find('[aria-label="Compare all annotations"]');
  },

  get submitBtn() {
    return this.sectionTwo.find('[aria-label="submit"]');
  },

  get annotationDropdownTrigger() {
    return this.sectionOne.find(".lsf-annotation-button__trigger");
  },

  get dropdownMenu() {
    return cy.get(".lsf-dropdown");
  },

  clickCopyAnnotationBtn() {
    this.annotationDropdownTrigger.click();
    this.dropdownMenu.find('[class*="option--"]').contains("Duplicate Annotation").click();
    return void 0;
  },
};
