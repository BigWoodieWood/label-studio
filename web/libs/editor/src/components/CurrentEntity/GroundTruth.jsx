import { observer } from "mobx-react";
import { Button } from "../../common/Button/Button";
import { IconStar, IconStarOutline } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { FF_DEV_3873, isFF } from "../../utils/feature-flags";
import "./GroundTruth.scss";

export const GroundTruth = observer(({ entity, disabled = false, size = "md" }) => {
  const title = entity.ground_truth ? "Unset this result as a ground truth" : "Set this result as a ground truth";

  return (
    !entity.skipped &&
    !entity.userGenerate &&
    entity.type !== "prediction" && (
      <div className={`dm-ground-truth dm-ground-truth_disabled_${disabled} dm-ground-truth_size_${size}`}>
        <Tooltip alignment="top-left" title={title}>
          <Button
            className="dm-ground-truth__toggle"
            size="small"
            type="link"
            onClick={(ev) => {
              ev.preventDefault();
              entity.setGroundTruth(!entity.ground_truth);
            }}
          >
            {isFF(FF_DEV_3873) && !entity.ground_truth ? (
              <IconStarOutline
                className={`dm-ground-truth__indicator ${entity.ground_truth ? "dm-ground-truth__indicator_active" : ""} ${isFF(FF_DEV_3873) ? "dm-ground-truth__indicator_dark" : ""}`}
              />
            ) : (
              <IconStar
                className={`dm-ground-truth__indicator ${entity.ground_truth ? "dm-ground-truth__indicator_active" : ""} ${isFF(FF_DEV_3873) ? "dm-ground-truth__indicator_dark" : ""}`}
              />
            )}
          </Button>
        </Tooltip>
      </div>
    )
  );
});
