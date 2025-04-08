import type { MouseEventHandler } from "react";

import { IconCommentLinkTo, IconSend } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import "./CommentFormButtons.scss";

export const CommentFormButtons = ({
  region,
  linking,
  onLinkTo,
}: { region: any; linking: boolean; onLinkTo?: MouseEventHandler<HTMLElement> }) => (
  <div className="lsf-comment-form-buttons">
    <div className="lsf-comment-form-buttons__buttons">
      {onLinkTo && !region && (
        <Tooltip title="Link to...">
          <button
            className={`lsf-comment-form-buttons__action ${linking ? "lsf-comment-form-buttons__action_highlight" : ""}`}
            onClick={onLinkTo}
          >
            <IconCommentLinkTo />
          </button>
        </Tooltip>
      )}
      <button className="lsf-comment-form-buttons__action" type="submit">
        <IconSend />
      </button>
    </div>
  </div>
);
