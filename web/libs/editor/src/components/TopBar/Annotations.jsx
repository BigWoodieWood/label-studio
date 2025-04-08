import { observer } from "mobx-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Space } from "../../common/Space/Space";
import { IconPlusCircle, IconComment, IconCommentRed, IconSparks } from "@humansignal/icons";
import { Userpic } from "@humansignal/ui";
import { isDefined, userDisplayName } from "../../utils/utilities";
import { GroundTruth } from "../CurrentEntity/GroundTruth";
import "./Annotations.scss";
import { TimeAgo } from "../../common/TimeAgo/TimeAgo";
import { reaction } from "mobx";

export const Annotations = observer(({ store, annotationStore, commentStore }) => {
  const dropdownRef = useRef();
  const [opened, setOpened] = useState(false);
  const enableAnnotations = store.hasInterface("annotations:tabs");
  const enablePredictions = store.hasInterface("predictions:tabs");
  const enableCreateAnnotation = store.hasInterface("annotations:add-new");
  const groundTruthEnabled = store.hasInterface("ground-truth");

  const entities = [];

  if (enablePredictions) entities.push(...annotationStore.predictions);

  if (enableAnnotations) entities.push(...annotationStore.annotations);

  const onAnnotationSelect = useCallback(
    (entity, isPrediction) => {
      if (!entity.selected) {
        if (isPrediction) {
          annotationStore.selectPrediction(entity.id);
        } else {
          annotationStore.selectAnnotation(entity.id);
        }
      }
    },
    [annotationStore],
  );

  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target;
      const dropdown = dropdownRef.current;

      if (target !== dropdown && !dropdown?.contains(target)) {
        setOpened(false);
      }
    };

    document.addEventListener("click", handleClick);

    const runOnPropertyChange = (value) => {
      let _unresolvedComments = 0;
      let _comments = 0;

      value.forEach((obj) => {
        _comments++;

        if (!obj) _unresolvedComments++;
      });

      commentStore.annotation.setUnresolvedCommentCount(_unresolvedComments);
      commentStore.annotation.setCommentCount(_comments);
    };

    const reactionDisposer = reaction(
      () => [...commentStore.comments.map((item) => item.isResolved)],
      runOnPropertyChange,
    );

    return () => {
      document.removeEventListener("click", handleClick);
      reactionDisposer();
    };
  }, []);

  const renderCommentIcon = (ent) => {
    if (ent.unresolved_comment_count > 0) {
      return <IconCommentRed />;
    }
    if (ent.comment_count > 0) {
      return <IconComment />;
    }

    return null;
  };

  const renderAnnotation = (ent, i) => {
    return (
      <Annotation
        key={`${ent.pk ?? ent.id}${ent.type}`}
        entity={ent}
        aria-label={`${ent.type} ${i + 1}`}
        selected={ent === annotationStore.selected}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpened(false);
          onAnnotationSelect?.(ent, ent.type === "prediction");
        }}
        extra={
          <div className="dm-annotations-list__icons">
            <div className="dm-annotations-list__icon-column">{renderCommentIcon(ent)}</div>
            <div className="dm-annotations-list__icon-column">
              {groundTruthEnabled && <GroundTruth entity={ent} disabled />}
            </div>
          </div>
        }
      />
    );
  };

  const renderAnnotationList = (entities) => {
    const _drafts = [];
    const _annotations = [];

    entities.forEach((obj, i) => {
      if (obj.pk) {
        _annotations.push(renderAnnotation(obj, i));
      } else {
        _drafts.push(renderAnnotation(obj, i));
      }
    });

    return (
      <>
        <div className="dm-annotations-list__draft">{_drafts}</div>
        <div className="dm-annotations-list__annotation">{_annotations}</div>
      </>
    );
  };

  return enableAnnotations || enablePredictions || enableCreateAnnotation ? (
    <div className="dm-topbar__section dm-topbar__section_flat">
      <div className="dm-annotations-list" ref={dropdownRef}>
        <div className="dm-annotations-list__selected">
          <Annotation
            aria-label="Annotations List Toggle"
            entity={annotationStore.selected}
            onClick={(e) => {
              e.stopPropagation();
              setOpened(!opened);
            }}
            extra={
              entities.length > 0 ? (
                <Space size="none" style={{ marginRight: -8, marginLeft: 8 }}>
                  <div className="dm-annotations-list__counter">
                    {entities.indexOf(annotationStore.selected) + 1}/{entities.length}
                  </div>
                  <div
                    className={`dm-annotations-list__toggle ${opened ? "dm-annotations-list__toggle_opened" : ""}`}
                  />
                </Space>
              ) : null
            }
          />
        </div>

        {opened && (
          <div className="dm-annotations-list__list">
            {store.hasInterface("annotations:add-new") && (
              <CreateAnnotation annotationStore={annotationStore} onClick={() => setOpened(false)} />
            )}

            {renderAnnotationList(entities)}
          </div>
        )}
      </div>
    </div>
  ) : null;
});

const CreateAnnotation = observer(({ annotationStore, onClick }) => {
  const onCreateAnnotation = useCallback(() => {
    const c = annotationStore.createAnnotation();

    annotationStore.selectAnnotation(c.id);
    onClick();
  }, [annotationStore, onClick]);

  return (
    <div className="dm-annotations-list__create" aria-label="Create Annotation" onClick={onCreateAnnotation}>
      <Space size="small">
        <Userpic className="dm-annotations-list__userpic dm-annotations-list__userpic_prediction">
          <IconPlusCircle />
        </Userpic>
        Create Annotation
      </Space>
    </div>
  );
});

const Annotation = observer(({ entity, selected, onClick, extra, ...props }) => {
  const isPrediction = entity.type === "prediction";
  const username = userDisplayName(
    entity.user ?? {
      firstName: entity.createdBy || "Admin",
    },
  );

  return (
    <div
      {...props}
      className={`dm-annotations-list__entity ${selected ? "dm-annotations-list__entity_selected" : ""}`}
      onClick={onClick}
    >
      <Space spread>
        <Space size="small">
          <Userpic
            className={`dm-annotations-list__userpic ${isPrediction ? "dm-annotations-list__userpic_prediction" : ""}`}
            showUsername
            username={isPrediction ? entity.createdBy : null}
            user={entity.user ?? { username }}
          >
            {isPrediction && <IconSparks color="#944BFF" style={{ width: 18, height: 18 }} />}
          </Userpic>
          <Space direction="vertical" size="none">
            <div className="dm-annotations-list__user">
              <span className="dm-annotations-list__name">{username}</span>
              <span className="dm-annotations-list__entity-id">#{entity.pk ?? entity.id}</span>
            </div>

            {isDefined(entity.acceptedState) ? (
              <div className={`dm-annotations-list__review dm-annotations-list__review_state_${entity.acceptedState}`}>
                {entity.acceptedState}
              </div>
            ) : (
              <div className="dm-annotations-list__created">
                created, <TimeAgo className="dm-annotations-list__date" date={entity.createdDate} />
              </div>
            )}
          </Space>
        </Space>
        {extra}
      </Space>
    </div>
  );
});
