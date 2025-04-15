import Tree from "../../core/Tree";
import { isAlive } from "mobx-state-tree";
import { useLayoutEffect, memo } from "react";

export const Annotation = memo(
  ({ annotation, root }) => {
    useLayoutEffect(() => {
      return () => {
        if (annotation && isAlive(annotation)) {
          annotation.resetReady();
        }
      };
    }, [annotation.pk, annotation.id]);

    const startTime = performance.now();
    const result = root ? Tree.renderItem(root, annotation) : null;
    const endTime = performance.now();
    console.log(`Annotation root tree build time taken: ${endTime - startTime} milliseconds`);
    return result;
  },
  (prevProps, nextProps) => {
    return prevProps.annotation.pk === nextProps.annotation.pk && prevProps.annotation.id === nextProps.annotation.id;
  },
);
