import { useMemo } from "react";
import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { Button } from "../../common/Button/Button";
import { FF_DEV_3873, FF_DEV_4174, FF_LEAP_1173, FF_TASK_COUNT_FIX, isFF } from "../../utils/feature-flags";
import { guidGenerator } from "../../utils/unique";
import { isDefined } from "../../utils/utilities";
import "./CurrentTask.scss";
import { reaction } from "mobx";

export const CurrentTask = observer(({ store }) => {
  const currentIndex = useMemo(() => {
    return store.taskHistory.findIndex((x) => x.taskId === store.task.id) + 1;
  }, [store.taskHistory]);

  const [initialCommentLength, setInitialCommentLength] = useState(0);
  const [visibleComments, setVisibleComments] = useState(0);

  useEffect(() => {
    store.commentStore.setAddedCommentThisSession(false);

    const reactionDisposer = reaction(
      () => store.commentStore.comments.map((item) => item.isDeleted),
      (result) => {
        setVisibleComments(result.filter((item) => !item).length);
      },
    );

    return () => {
      reactionDisposer?.();
    };
  }, []);

  useEffect(() => {
    if (store.commentStore.addedCommentThisSession) {
      setInitialCommentLength(visibleComments);
    }
  }, [store.commentStore.addedCommentThisSession]);

  const historyEnabled = store.hasInterface("topbar:prevnext");
  const showCounter = store.hasInterface("topbar:task-counter");

  // @todo some interface?
  let canPostpone =
    !isDefined(store.annotationStore.selected.pk) &&
    (!isFF(FF_LEAP_1173) || store.hasInterface("skip")) &&
    !store.canGoNextTask &&
    !store.hasInterface("review") &&
    store.hasInterface("postpone");

  if (store.hasInterface("annotations:comments") && isFF(FF_DEV_4174)) {
    canPostpone = canPostpone && store.commentStore.addedCommentThisSession && visibleComments >= initialCommentLength;
  }

  return (
    <div className="dm-topbar__section">
      <div
        className={`dm-current-task ${historyEnabled ? "dm-current-task_with-history" : ""}`}
        style={{
          padding: isFF(FF_DEV_3873) && 0,
          width: isFF(FF_DEV_3873) && "auto",
        }}
      >
        <div className="dm-current-task__task-id" style={{ fontSize: isFF(FF_DEV_3873) ? 12 : 14 }}>
          {store.task.id ?? guidGenerator()}
          {historyEnabled &&
            showCounter &&
            (isFF(FF_TASK_COUNT_FIX) ? (
              <div className="dm-current-task__task-count">
                {store.queuePosition} of {store.queueTotal}
              </div>
            ) : (
              <div className="dm-current-task__task-count">
                {currentIndex} of {store.taskHistory.length}
              </div>
            ))}
        </div>
        {historyEnabled && (
          <div
            className={`dm-current-task__history-controls ${isFF(FF_DEV_3873) ? "dm-current-task__history-controls_newui" : ""}`}
          >
            <Button
              className={`dm-current-task__prevnext dm-current-task__prevnext_prev ${!store.canGoPrevTask ? "dm-current-task__prevnext_disabled" : ""} ${isFF(FF_DEV_3873) ? "dm-current-task__prevnext_newui" : ""}`}
              type="link"
              disabled={!historyEnabled || !store.canGoPrevTask}
              onClick={store.prevTask}
              style={{ background: !isFF(FF_DEV_3873) && "none", backgroundColor: isFF(FF_DEV_3873) && "none" }}
            />
            <Button
              className={`dm-current-task__prevnext dm-current-task__prevnext_next 
                ${!store.canGoNextTask && !canPostpone ? "dm-current-task__prevnext_disabled" : ""} 
                ${!store.canGoNextTask && canPostpone ? "dm-current-task__prevnext_postpone" : ""} 
                ${isFF(FF_DEV_3873) ? "dm-current-task__prevnext_newui" : ""}`}
              data-testid="next-task"
              type="link"
              disabled={!store.canGoNextTask && !canPostpone}
              onClick={store.canGoNextTask ? store.nextTask : store.postponeTask}
              style={{ background: !isFF(FF_DEV_3873) && "none", backgroundColor: isFF(FF_DEV_3873) && "none" }}
            />
          </div>
        )}
      </div>
    </div>
  );
});
