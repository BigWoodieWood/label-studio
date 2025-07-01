import { observer } from "mobx-react";

import { Button } from "../../common/Button/Button";
import { IconViewAll, IconPlus } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";
import { ff } from "@humansignal/core";
import { Block, Elem } from "../../utils/bem";
import { isSelfServe } from "../../utils/billing";
import { FF_BULK_ANNOTATION, isFF } from "../../utils/feature-flags";
import { AnnotationsCarousel } from "../AnnotationsCarousel/AnnotationsCarousel";
import { CurrentTask } from "./CurrentTask";

import "./TopBar.scss";

export const TopBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;
  const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isSelfServe() && store.hasInterface("annotation:bulk");

  if (isBulkMode) return null;

  return store ? (
    <Block name="topbar" mod={{ newLabelingUI: true }}>
      <Elem name="group">
        <CurrentTask store={store} />
        {store.hasInterface("annotations:view-all") && (
          <Tooltip title="Compare all annotations">
            <Button
              className={"topbar__button"}
              icon={<IconViewAll width={20} height={20} />}
              type={isViewAll ? undefined : "text"}
              aria-label="Compare all annotations"
              onClick={annotationStore.toggleViewingAllAnnotations}
              primary={isViewAll}
              size="medium"
              style={{
                height: 28,
                width: 28,
                padding: 0,
                marginRight: "var(--spacing-tight, 8px)",
              }}
            />
          </Tooltip>
        )}
        {store.hasInterface("annotations:add-new") && (
          <Tooltip title="Create a new annotation" style={{ "--offset-x": "11px" }}>
            <Button
              icon={<IconPlus />}
              className={"topbar__button"}
              type={isViewAll ? undefined : "text"}
              aria-label="Create an annotation"
              onClick={(event) => {
                event.preventDefault();
                const created = store.annotationStore.createAnnotation();

                store.annotationStore.selectAnnotation(created.id);
              }}
              style={{
                height: 28,
                width: 28,
                padding: 0,
                marginRight: "var(--spacing-tight, 8px)",
              }}
            />
          </Tooltip>
        )}
        {(!isViewAll || ff.isActive(ff.FF_SUMMARY)) && (
          <AnnotationsCarousel
            store={store}
            annotationStore={store.annotationStore}
            commentStore={store.commentStore}
          />
        )}
      </Elem>
    </Block>
  ) : null;
});
