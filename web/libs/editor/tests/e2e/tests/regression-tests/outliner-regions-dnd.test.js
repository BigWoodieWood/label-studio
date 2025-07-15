Feature("Outliner regions drag and drop").tag("@regress");

const CONFIG = `<View>
    <Labels name="label" toName="text">
        <Label value="Label" background="purple"/>
    </Labels>
    <Text name="text" value="$text" inline="true"/>
</View>`;

const TEXT = "qwertyuiopasdfghjklzxcvbnm";

function generateResults(n) {
  const results = [];

  for (let k = 0; k < n; k++) {
    results.push({
      id: `${k}`,
      from_name: "label",
      to_name: "text",
      type: "labels",
      origin: "manual",
      value: {
        start: k,
        end: k + 1,
        text: TEXT.split("")[k],
        labels: ["Label"],
      },
    });
  }
  return results;
}

