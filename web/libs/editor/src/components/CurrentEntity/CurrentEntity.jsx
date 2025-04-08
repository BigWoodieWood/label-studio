import { inject, observer } from "mobx-react";
import { Space } from "../../common/Space/Space";
import { AnnotationHistory } from "./AnnotationHistory.tsx";
import { useRegionsCopyPaste } from "../../hooks/useRegionsCopyPaste";
import "./CurrentEntity.scss";

const injector = inject("store");

export const CurrentEntity = injector(
  observer(({ entity, showHistory = true }) => {
    useRegionsCopyPaste(entity);

    return entity ? (
      <div className="dm-annotation" onClick={(e) => e.stopPropagation()}>
        {showHistory && (
          <Space spread className="dm-annotation__title">
            Annotation History
            <div className="dm-annotation__id">#{entity.pk ?? entity.id}</div>
          </Space>
        )}
        <AnnotationHistory enabled={showHistory} />
      </div>
    ) : null;
  }),
);
