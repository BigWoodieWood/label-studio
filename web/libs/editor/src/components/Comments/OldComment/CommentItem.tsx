import { observer } from "mobx-react";
import { type FC, useState } from "react";
import { Tooltip, Userpic } from "@humansignal/ui";
import { IconCheck, IconEllipsis } from "@humansignal/icons";
import { Space } from "../../../common/Space/Space";
import { Dropdown } from "../../../common/Dropdown/Dropdown";
import { Menu } from "../../../common/Menu/Menu";
import { humanDateDiff, userDisplayName } from "../../../utils/utilities";
import { CommentFormBase } from "../CommentFormBase";

import "./CommentItem.scss";
import { Button } from "../../../common/Button/Button";

interface Comment {
  comment: {
    isEditMode: boolean;
    isConfirmDelete: boolean;
    createdAt: string;
    updatedAt: string;
    isPersisted: boolean;
    isDeleted: boolean;
    createdBy: any;
    text: string;
    isResolved: boolean;
    updateComment: (comment: string) => void;
    deleteComment: () => void;
    setConfirmMode: (confirmMode: boolean) => void;
    setEditMode: (isGoingIntoEditMode: boolean) => void;
    toggleResolve: () => void;
    canResolveAny: boolean;
  };
  listComments: ({ suppressClearComments }: { suppressClearComments: boolean }) => void;
}

export const CommentItem: FC<any> = observer(
  ({
    comment: {
      updatedAt,
      isEditMode,
      isConfirmDelete,
      createdAt,
      isPersisted,
      isDeleted,
      createdBy,
      text: initialComment,
      isResolved: resolved,
      updateComment,
      deleteComment,
      setConfirmMode,
      setEditMode,
      toggleResolve,
      canResolveAny,
    },
    listComments,
  }: Comment) => {
    const currentUser = window.APP_SETTINGS?.user;
    const isCreator = currentUser?.id === createdBy.id;
    const [currentComment, setCurrentComment] = useState(initialComment);

    if (isDeleted) return null;

    const TimeTracker = () => {
      const editedTimeAchondritic = new Date(updatedAt);
      const createdTimeAchondritic = new Date(createdAt);

      editedTimeAchondritic.setMilliseconds(0);
      createdTimeAchondritic.setMilliseconds(0);

      const isEdited = editedTimeAchondritic > createdTimeAchondritic;
      const time = isEdited ? updatedAt : createdAt;

      if (isPersisted && time)
        return (
          <div className="dm-comment-item__date">
            <Tooltip alignment="top-right" title={new Date(time).toLocaleString()}>
              <>{`${isEdited ? "updated" : ""} ${humanDateDiff(time)}`}</>
            </Tooltip>
          </div>
        );
      return null;
    };

    return (
      <div className={`dm-comment-item ${resolved ? "dm-comment-item_resolved" : ""}`}>
        <Space spread size="medium" truncated>
          <Space size="small" truncated>
            <Userpic user={createdBy} className="dm-comment-item__userpic" showUsername username={createdBy} />
            <span className="dm-comment-item__name">{userDisplayName(createdBy)}</span>
          </Space>

          <Space size="small">
            <IconCheck className="dm-comment-item__resolved" />
            <div className={`dm-comment-item__saving ${isPersisted ? "dm-comment-item__saving_hide" : ""}`}>
              <div className="dm-comment-item__dot" />
            </div>
            <TimeTracker />
          </Space>
        </Space>

        <div className="dm-comment-item__content">
          <div className="dm-comment-item__text">
            {isEditMode ? (
              <CommentFormBase
                value={currentComment}
                onSubmit={async (value) => {
                  await updateComment(value);
                  setCurrentComment(value);
                  await listComments({ suppressClearComments: true });
                }}
              />
            ) : isConfirmDelete ? (
              <div className="dm-comment-item__confirmForm">
                <div className="dm-comment-item__question">Are you sure?</div>
                <div className="dm-comment-item__controls">
                  <Button onClick={() => deleteComment()} size="compact" look="danger" autoFocus>
                    Yes
                  </Button>
                  <Button onClick={() => setConfirmMode(false)} size="compact">
                    No
                  </Button>
                </div>
              </div>
            ) : (
              <>{currentComment}</>
            )}
          </div>

          <div
            className="dm-comment-item__actions"
            onClick={(e: any) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {isPersisted && (isCreator || canResolveAny) && (
              <Dropdown.Trigger
                content={
                  <Menu size="auto">
                    <Menu.Item onClick={toggleResolve}>{resolved ? "Unresolve" : "Resolve"}</Menu.Item>
                    {isCreator && (
                      <>
                        <Menu.Item
                          onClick={() => {
                            const isGoingIntoEditMode = !isEditMode;

                            setEditMode(isGoingIntoEditMode);
                            if (!isGoingIntoEditMode) {
                              setCurrentComment(initialComment);
                            }
                          }}
                        >
                          {isEditMode ? "Cancel edit" : "Edit"}
                        </Menu.Item>
                        {!isConfirmDelete && (
                          <Menu.Item
                            onClick={() => {
                              setConfirmMode(true);
                            }}
                          >
                            Delete
                          </Menu.Item>
                        )}
                      </>
                    )}
                  </Menu>
                }
              >
                <Button size="small" type="text" icon={<IconEllipsis />} />
              </Dropdown.Trigger>
            )}
          </div>
        </div>
      </div>
    );
  },
);
