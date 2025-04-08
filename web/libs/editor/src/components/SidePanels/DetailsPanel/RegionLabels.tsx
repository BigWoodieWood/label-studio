import type { FC } from "react";
import { observer } from "mobx-react";

export const RegionLabels: FC<{ region: LSFRegion }> = observer(({ region }) => {
  const labelsInResults = region.labelings.map((result: any) => result.selectedLabels || []);
  const labels: any[] = [].concat(...labelsInResults);

  if (!labels.length) return <div className="dm-labels-list">No label</div>;

  return (
    <div className="dm-labels-list">
      {labels.map((label, index) => {
        const color = label.background || "#000000";

        return [
          index ? ", " : null,
          <span key={label.id} style={{ color }}>
            {label.value}
          </span>,
        ];
      })}
    </div>
  );
});
