import { inject, observer } from "mobx-react";
import type { FC } from "react";
import { Comments as CommentsComponent } from "../../Comments/Comments";
import { AnnotationHistory } from "../../CurrentEntity/AnnotationHistory";
import { PanelBase, type PanelProps } from "../PanelBase";
import "./DetailsPanel.scss";
import { RegionDetailsMain, RegionDetailsMeta } from "./RegionDetails";
import { RegionItem } from "./RegionItem";
import { Relations as RelationsComponent } from "./Relations";
// eslint-disable-next-line
// @ts-ignore
import { RelationsControls } from "./RelationsControls";

interface DetailsPanelProps extends PanelProps {
  regions: any;
  selection: any;
}

const DetailsPanelComponent: FC<DetailsPanelProps> = ({ currentEntity, regions, ...props }) => {
  const selectedRegions = regions.selection;

  return (
    <PanelBase {...props} currentEntity={currentEntity} name="details" title="Details">
      <Content selection={selectedRegions} currentEntity={currentEntity} />
    </PanelBase>
  );
};

const DetailsComponent: FC<DetailsPanelProps> = ({ currentEntity, regions }) => {
  const selectedRegions = regions.selection;

  return (
    <div className="dm-details-tab">
      <Content selection={selectedRegions} currentEntity={currentEntity} />
    </div>
  );
};

const Content: FC<any> = observer(({ selection, currentEntity }) => {
  return <>{selection.size ? <RegionsPanel regions={selection} /> : <GeneralPanel currentEntity={currentEntity} />}</>;
});

const CommentsTab: FC<any> = inject("store")(
  observer(({ store }) => {
    return (
      <>
        {store.hasInterface("annotations:comments") && store.commentStore.isCommentable && (
          <div className="dm-comments-panel">
            <div className="dm-comments-panel__section-tab">
              <div className="dm-comments-panel__section-content">
                <CommentsComponent
                  annotationStore={store.annotationStore}
                  commentStore={store.commentStore}
                  cacheKey={`task.${store.task.id}`}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }),
);

const RelationsTab: FC<any> = inject("store")(
  observer(({ currentEntity }) => {
    const { relationStore } = currentEntity;

    return (
      <>
        <div className="dm-relations">
          <div className="dm-relations__section-tab">
            <div className="dm-relations__view-control">
              <div className="dm-relations__section-head">Relations ({relationStore.size})</div>
              <RelationsControls relationStore={relationStore} />
            </div>
            <div className="dm-relations__section-content">
              <RelationsComponent relationStore={relationStore} />
            </div>
          </div>
        </div>
      </>
    );
  }),
);

const HistoryTab: FC<any> = inject("store")(
  observer(({ store, currentEntity }) => {
    const showAnnotationHistory = store.hasInterface("annotations:history");

    return (
      <>
        <div className="dm-history">
          <div className="dm-history__section-tab">
            <div className="dm-history__section-head">
              Annotation History
              <span>#{currentEntity.pk ?? currentEntity.id}</span>
            </div>
            <div className="dm-history__section-content">
              <AnnotationHistory inline enabled={showAnnotationHistory} />
            </div>
          </div>
        </div>
      </>
    );
  }),
);

const InfoTab: FC<any> = inject("store")(
  observer(({ selection }) => {
    return (
      <>
        <div className="dm-info">
          <div className="dm-info__section-tab">
            <div className="dm-info__section-head">Selection Details</div>
            <RegionsPanel regions={selection} />
          </div>
        </div>
      </>
    );
  }),
);

const GeneralPanel: FC<any> = inject("store")(
  observer(({ store, currentEntity }) => {
    const { relationStore } = currentEntity;
    const showAnnotationHistory = store.hasInterface("annotations:history");
    return (
      <>
        <div className="dm-details__section">
          <div className="dm-details__section-head">
            Annotation History
            <span>#{currentEntity.pk ?? currentEntity.id}</span>
          </div>
          <div className="dm-details__section-content">
            <AnnotationHistory inline enabled={showAnnotationHistory} />
          </div>
        </div>
        <div className="dm-details__section">
          <div className="dm-details__view-control">
            <div className="dm-details__section-head">Relations ({relationStore.size})</div>
            <RelationsControls relationStore={relationStore} />
          </div>
          <div className="dm-details__section-content">
            <RelationsComponent relationStore={relationStore} />
          </div>
        </div>
        {store.hasInterface("annotations:comments") && store.commentStore.isCommentable && (
          <div className="dm-details__section">
            <div className="dm-details__section-head">Comments</div>
            <div className="dm-details__section-content">
              <CommentsComponent
                annotationStore={store.annotationStore}
                commentStore={store.commentStore}
                cacheKey={`task.${store.task.id}`}
              />
            </div>
          </div>
        )}
      </>
    );
  }),
);

GeneralPanel.displayName = "GeneralPanel";

const RegionsPanel: FC<{ regions: any }> = observer(({ regions }) => {
  return (
    <div>
      {regions.list.map((reg: any) => {
        return <SelectedRegion key={reg.id} region={reg} />;
      })}
    </div>
  );
});

const SelectedRegion: FC<{ region: any }> = observer(({ region }) => {
  return <RegionItem region={region} mainDetails={RegionDetailsMain} metaDetails={RegionDetailsMeta} />;
});

export const Comments = CommentsTab;
export const History = HistoryTab;
export const Relations = RelationsTab;
export const Info = InfoTab;
export const Details = observer(DetailsComponent);
export const DetailsPanel = observer(DetailsPanelComponent);
