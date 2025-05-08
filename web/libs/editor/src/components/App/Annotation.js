import Tree from "../../core/Tree";
import { isAlive, destroy } from "mobx-state-tree";
import { useLayoutEffect } from "react";

export function Annotation({ annotation, root }) {
  useLayoutEffect(() => {
    return () => {
      if (annotation && isAlive(annotation)) {
        // Reset annotation state
        annotation.resetReady();

        // Clean up any observers or reactions
        if (annotation.disposers) {
          annotation.disposers.forEach((disposer) => disposer());
        }

        // Clean up any child regions
        if (annotation.regions) {
          annotation.regions.forEach((region) => {
            if (isAlive(region)) {
              destroy(region);
            }
          });
        }

        // Clean up any relations
        if (annotation.relations) {
          annotation.relations.forEach((relation) => {
            if (isAlive(relation)) {
              destroy(relation);
            }
          });
        }
      }
    };
  }, [annotation?.pk, annotation?.id]);

  return root ? Tree.renderItem(root, annotation) : null;
}
