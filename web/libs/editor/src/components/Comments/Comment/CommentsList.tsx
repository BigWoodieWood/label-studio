import { createContext, type FC, useCallback, useMemo } from "react";
import { observer } from "mobx-react";
import { IconMessageCircle } from "@humansignal/icons";

import { LINK_COMMENT_MODE } from "../../../stores/Annotation/LinkingModes";
import { Block, Elem } from "../../../utils/bem";
import { CommentItem } from "./CommentItem";

export type CommentContextType = {
  startLinkingMode: (comment: any) => void;
  globalLinking: boolean;
  currentComment: any;
};

export const CommentsContext = createContext<CommentContextType>({
  startLinkingMode: () => {},
  globalLinking: false,
  currentComment: null,
});

export const CommentsList: FC<{ commentStore: any }> = observer(({ commentStore }) => {
  const startLinkingMode = useCallback(
    (comment: any) => {
      commentStore.annotation.startLinkingMode(LINK_COMMENT_MODE, comment);
    },
    [commentStore],
  );
  const globalLinking = commentStore.annotation?.linkingMode === LINK_COMMENT_MODE;
  const currentComment = commentStore.annotation.currentLinkingMode?.comment;
  const contextValue = useMemo(
    () => ({ startLinkingMode, currentComment, globalLinking }),
    [startLinkingMode, currentComment, globalLinking],
  );
  return (
    <CommentsContext.Provider value={contextValue}>
      <CommentsListInner commentStore={commentStore} />
    </CommentsContext.Provider>
  );
});

export const CommentsListInner: FC<{ commentStore: any }> = observer(({ commentStore }) => {
  if (!commentStore.comments.length) {
    return (
      <Block name="comments-list comments-list_empty">
        <Block name="comments-empty-state">
          <Elem name="icon">
            <IconMessageCircle style={{ width: 32, height: 32, opacity: 0.5 }} />
          </Elem>
          <Elem name="title">No comments yet</Elem>
          <Elem name="description">
            Add comments to collaborate with others or to leave notes for yourself about specific regions.
          </Elem>
        </Block>
      </Block>
    );
  }

  return (
    <Block name="comments-list">
      {commentStore.comments.map((comment: any) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          listComments={commentStore.listComments}
          classificationsItems={commentStore.commentClassificationsItems}
        />
      ))}
    </Block>
  );
});
