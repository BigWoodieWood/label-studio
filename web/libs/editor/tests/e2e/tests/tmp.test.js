const assert = require("assert");

Feature("Temporary test for codeceptjs metrics");

const table = new DataTable(["idx"]);

const maxIdx = 59;
for (let i = 0; i <= maxIdx; i++) {
  table.add([i]);
}
Data(table).only.Scenario("test", ({ I, current }) => {
  I.amOnPage("/");
  if (current.idx === maxIdx) {
    assert.fail("test");
  }
});
