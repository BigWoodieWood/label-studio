import { observer } from "mobx-react";

export type RegionLabelProps = {
  item: any;
};
export const RegionLabel = observer(({ item }: RegionLabelProps) => {
  const { type } = item ?? {};
  if (!type) {
    return "No Label";
  }
  if (type.includes("label")) {
    return item.value;
  }
  if (type.includes("region") || type.includes("range")) {
    const labelsInResults = item.labelings.map((result: any) => result.selectedLabels || []);

    const labels: any[] = [].concat(...labelsInResults);

    return (
      <div className="lsf-labels-list">
        {labels.map((label, index) => {
          const color = label.background || "#000000";

          return [
            index ? ", " : null,
            <span key={label.id} style={{ color }}>
              {label.value || "No label"}
            </span>,
          ];
        })}
      </div>
    );
  }
  if (type.includes("tool")) {
    return item.value;
  }
});
