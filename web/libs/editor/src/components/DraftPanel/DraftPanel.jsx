import { observer } from "mobx-react";
import { Tooltip } from "@humansignal/ui";
import Utils from "../../utils";

import "./DraftPanel.scss";

export const DraftPanel = observer(({ item }) => {
  if (!item.draftSaved && !item.versions.draft) return null;
  const saved = item.draft && item.draftSaved ? ` saved ${Utils.UDate.prettyDate(item.draftSaved)}` : "";

  if (!item.selected) {
    if (!item.draft) return null;
    return <div className="dm-draft-panel">draft{saved}</div>;
  }
  if (!item.versions.result || !item.versions.result.length) {
    return <div className="dm-draft-panel">{saved ? `draft${saved}` : "not submitted draft"}</div>;
  }
  return (
    <div className="dm-draft-panel">
      <Tooltip
        alignment="top-left"
        title={item.draftSelected ? "switch to original result" : "switch to current draft"}
      >
        <button type="button" onClick={() => item.toggleDraft()} className="dm-draft-panel__toggle">
          {item.draftSelected ? "draft" : "original"}
        </button>
      </Tooltip>
      {saved}
    </div>
  );
});
