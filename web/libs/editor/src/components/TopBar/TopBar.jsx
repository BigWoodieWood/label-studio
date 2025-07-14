import { observer } from "mobx-react";

import { IconViewAll, IconPlus } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
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
    <Block name="topbar">
      <Elem name="group">
        <CurrentTask store={store} />
        {store.hasInterface("annotations:view-all") && (
          <Button
            className={"topbar__button"}
            type={isViewAll ? undefined : "string"}
            aria-label="Compare all annotations"
            onClick={annotationStore.toggleViewingAllAnnotations}
            variant={isViewAll ? "primary" : "neutral"}
            look={isViewAll ? "filled" : "string"}
            tooltip="Compare all annotations"
            size="small"
          >
            <IconViewAll />
          </Button>
        )}
        {store.hasInterface("annotations:add-new") && (
          <Button
            className={"topbar__button"}
            type={isViewAll ? undefined : "text"}
            aria-label="Create an annotation"
            variant="neutral"
            size="small"
            look="string"
            tooltip="Create a new annotation"
            onClick={(event) => {
              event.preventDefault();
              const created = store.annotationStore.createAnnotation();

              store.annotationStore.selectAnnotation(created.id);
            }}
          >
            <IconPlus />
          </Button>
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
