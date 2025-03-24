import type { FC } from "react";
import { observer } from "mobx-react";
import { IconMessageCircle } from "@humansignal/icons";
import { Block, Elem } from "../../../utils/bem";
import { CommentItem } from "./CommentItem";

export const CommentsList: FC<{ commentStore: any }> = observer(({ commentStore }) => {
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
        <CommentItem key={comment.id} comment={comment} listComments={commentStore.listComments} />
      ))}
    </Block>
  );
});
