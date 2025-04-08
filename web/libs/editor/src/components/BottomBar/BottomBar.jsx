import { observer } from "mobx-react";
import { Actions } from "./Actions";
import { Controls } from "./Controls";
import "./BottomBar.scss";
import { FF_DEV_3873, isFF } from "../../utils/feature-flags";

export const BottomBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;

  return store && !isViewAll ? (
    <div className="lsf-bottombar" style={{ borderTop: isFF(FF_DEV_3873) && "1px solid rgba(0,0,0,0.1)" }}>
      <div className="lsf-bottombar__group">
        <Actions store={store} />
      </div>
      <div className="lsf-bottombar__group">
        {store.hasInterface("controls") && (store.hasInterface("review") || !isPrediction) && (
          <div className="lsf-bottombar__section lsf-bottombar__section_flat">
            <Controls annotation={entity} />
          </div>
        )}
      </div>
    </div>
  ) : null;
});
