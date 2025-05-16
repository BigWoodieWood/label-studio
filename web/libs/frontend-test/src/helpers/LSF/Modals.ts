export const Modals = {
  get warning() {
    return cy.get(".ant-modal.ant-modal-confirm-warning");
  },
  get okButton() {
    return this.warning.contains("OK");
  },
  hasWarning(text) {
    this.warning.should("be.visible");
    this.warning.contains("Warning").should("be.visible");
    this.warning.contains(text).should("be.visible");
    this.okButton.should("be.visible");
  },
  hasNoWarnings() {
    this.warning.should("not.exist");
  },
};
