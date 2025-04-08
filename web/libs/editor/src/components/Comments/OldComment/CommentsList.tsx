import type { FC } from "react";
import { observer } from "mobx-react";
import { CommentItem } from "./CommentItem";

export const CommentsList: FC<{ commentStore: any }> = observer(({ commentStore }) => {
  return (
    <div className="dm-comments-list">
      {commentStore.comments.map((comment: any) => (
        <CommentItem key={comment.id} comment={comment} listComments={commentStore.listComments} />
      ))}
    </div>
  );
});
