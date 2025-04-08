import { forwardRef } from "react";
import { observer } from "mobx-react";
import { IconBan, IconSparks, IconStar } from "@humansignal/icons";
import { Userpic } from "@humansignal/ui";
import { Space } from "../../common/Space/Space";
import "./AnnotationTabs.scss";

export const EntityTab = observer(
  forwardRef(
    ({ entity, selected, style, onClick, bordered = true, prediction = false, displayGroundTruth = false }, ref) => {
      const isUnsaved = (entity.userGenerate && !entity.sentUserGenerate) || entity.draftSelected;
      const infoIsHidden = entity.store.hasInterface("annotations:hide-info");

      const tabClasses = ["dm-entity-tab"];
      if (selected) tabClasses.push("dm-entity-tab_selected");
      if (bordered) tabClasses.push("dm-entity-tab_bordered");

      return (
        <div
          className={tabClasses.join(" ")}
          ref={ref}
          style={style}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick?.(entity, prediction);
          }}
        >
          <Space size="small">
            <Userpic
              className={`dm-entity-tab__userpic ${prediction ? "dm-entity-tab__userpic_prediction" : ""}`}
              showUsername
              username={prediction ? entity.createdBy : null}
              user={infoIsHidden ? {} : (entity.user ?? { email: entity.createdBy })}
            >
              {prediction && <IconSparks style={{ width: 16, height: 16 }} />}
            </Userpic>

            {!infoIsHidden && (
              <div className="dm-entity-tab__identifier">
                ID {entity.pk ?? entity.id} {isUnsaved && "*"}
              </div>
            )}

            {displayGroundTruth && entity.ground_truth && <IconStar className="dm-entity-tab__ground-truth" />}

            {entity.skipped && <IconBan className="dm-entity-tab__skipped" />}
          </Space>
        </div>
      );
    },
  ),
);
