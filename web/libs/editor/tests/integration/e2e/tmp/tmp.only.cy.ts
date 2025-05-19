describe('Temporary test for Cypress', () => {
  const maxIdx = 59;
  for (let i = 0; i <= maxIdx; i++) {
    it(`test: ${i}`, ()=>{
      cy.visit('http://localhost:3000/');
      if (i === maxIdx) {
        expect(true, "test").to.be.false;
      }
    });
  }
})
