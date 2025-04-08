import { useMemo } from "react";
import { observer } from "mobx-react";
import { Button } from "../../common/Button/Button";
import { guidGenerator } from "../../utils/unique";
import { isDefined } from "../../utils/utilities";
import { FF_LEAP_1173, FF_TASK_COUNT_FIX, isFF } from "../../utils/feature-flags";
import "./CurrentTask.scss";

export const CurrentTask = observer(({ store }) => {
  const currentIndex = useMemo(() => {
    return store.taskHistory.findIndex((x) => x.taskId === store.task.id) + 1;
  }, [store.taskHistory]);

  const historyEnabled = store.hasInterface("topbar:prevnext");

  // @todo some interface?
  const canPostpone =
    !isDefined(store.annotationStore.selected.pk) &&
    !store.canGoNextTask &&
    (!isFF(FF_LEAP_1173) || store.hasInterface("skip")) &&
    !store.hasInterface("review") &&
    store.hasInterface("postpone");

  return (
    <div className="lsf-bottombar__section">
      <div className={`lsf-current-task ${historyEnabled ? "lsf-current-task_with-history" : ""}`}>
        <div className="lsf-current-task__task-id">
          {store.task.id ?? guidGenerator()}
          {historyEnabled &&
            (isFF(FF_TASK_COUNT_FIX) ? (
              <div className="lsf-current-task__task-count">
                {store.queuePosition} of {store.queueTotal}
              </div>
            ) : (
              <div className="lsf-current-task__task-count">
                {currentIndex} of {store.taskHistory.length}
              </div>
            ))}
        </div>
        {historyEnabled && (
          <div className="lsf-current-task__history-controls">
            <Button
              className={`lsf-current-task__prevnext ${!store.canGoPrevTask ? "lsf-current-task__prevnext_disabled" : ""} lsf-current-task__prevnext_prev`}
              type="link"
              disabled={!historyEnabled || !store.canGoPrevTask}
              onClick={store.prevTask}
              style={{ background: "none", backgroundColor: "none" }}
            />
            <Button
              className={`lsf-current-task__prevnext
                ${!store.canGoNextTask && !canPostpone ? "lsf-current-task__prevnext_disabled" : ""}
                ${!store.canGoNextTask && canPostpone ? "lsf-current-task__prevnext_postpone" : ""}
                lsf-current-task__prevnext_next`}
              data-testid="next-task"
              type="link"
              disabled={!store.canGoNextTask && !canPostpone}
              onClick={store.canGoNextTask ? store.nextTask : store.postponeTask}
              style={{ background: "none", backgroundColor: "none" }}
            />
          </div>
        )}
      </div>
    </div>
  );
});
