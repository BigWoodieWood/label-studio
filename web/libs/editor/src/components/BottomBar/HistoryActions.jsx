import { observer } from "mobx-react";
import { IconRedo, IconRemove, IconUndo } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { Button } from "../../common/Button/Button";
import "./HistoryActions.scss";

export const EditingHistory = observer(({ entity }) => {
  const { history } = entity;

  return (
    <div className="dm-history-buttons">
      <Tooltip title="Undo">
        <Button
          className="dm-history-buttons__action"
          type="text"
          aria-label="Undo"
          disabled={!history?.canUndo}
          onClick={() => entity.undo()}
          icon={<IconUndo />}
        />
      </Tooltip>
      <Tooltip title="Redo">
        <Button
          className="dm-history-buttons__action"
          type="text"
          aria-label="Redo"
          disabled={!history?.canRedo}
          onClick={() => entity.redo()}
          icon={<IconRedo />}
        />
      </Tooltip>
      <Tooltip title="Reset">
        <Button
          className="dm-history-buttons__action"
          type="text"
          aria-label="Reset"
          disabled={!history?.canUndo}
          onClick={() => history?.reset()}
          icon={<IconRemove />}
        />
      </Tooltip>
    </div>
  );
});
