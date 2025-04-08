import { inject, observer } from "mobx-react";

import { IconCheck, IconCross } from "@humansignal/icons";
import { Toggle } from "@humansignal/ui";
import { Button } from "../../common/Button/Button";
import { Space } from "../../common/Space/Space";

import "./AutoAcceptToggle.scss";

// we need to inject all of them to trigger rerender on changes to suggestions
const injector = inject(({ store }) => {
  const annotation = store.annotationStore?.selected;
  const suggestions = annotation?.suggestions;

  return {
    store,
    annotation,
    suggestions,
  };
});

export const AutoAcceptToggle = injector(
  observer(({ store, annotation, suggestions }) => {
    if (!store.autoAnnotation) return null;

    const withSuggestions = annotation.hasSuggestionsSupport && !store.forceAutoAcceptSuggestions;
    const loading = store.awaitingSuggestions;

    return (
      <div className="dm-auto-accept">
        {withSuggestions && (
          <div className={`dm-auto-accept__wrapper ${loading ? "dm-auto-accept__wrapper_loading" : ""}`}>
            <Space spread>
              {suggestions.size > 0 ? (
                <Space size="small">
                  <div className="dm-auto-accept__info">
                    {suggestions.size} suggestion{suggestions.size > 0 && "s"}
                  </div>
                  <Button
                    className="dm-auto-accept__action dm-auto-accept__action_type_reject"
                    onClick={() => annotation.rejectAllSuggestions()}
                  >
                    <IconCross />
                  </Button>
                  <Button
                    className="dm-auto-accept__action dm-auto-accept__action_type_accept"
                    onClick={() => annotation.acceptAllSuggestions()}
                  >
                    <IconCheck />
                  </Button>
                </Space>
              ) : (
                <Toggle
                  checked={store.autoAcceptSuggestions}
                  onChange={(e) => store.setAutoAcceptSuggestions(e.target.checked)}
                  label="Auto-Accept Suggestions"
                />
              )}
            </Space>
          </div>
        )}
        {loading && <div className="dm-auto-accept__spinner" />}
      </div>
    );
  }),
);
