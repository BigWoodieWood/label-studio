// @ts-ignore
import CM from "codemirror";

export function completeAfter(cm: CM.Editor, pred: () => boolean) {
  if (!pred || pred()) {
    setTimeout(() => {
      if (!cm.state.completionActive) cm.showHint({ completeSingle: false });
    }, 100);
  }
  return CM.Pass;
}

export function completeIfInTag(cm: CM.Editor) {
  return completeAfter(cm, () => {
    const token = cm.getTokenAt(cm.getCursor());

    if (token.type === "string" && (!/['"]$/.test(token.string) || token.string.length === 1)) return false;

    const inner = CM.innerMode(cm.getMode(), token.state).state;

    return inner.tagName;
  });
}
