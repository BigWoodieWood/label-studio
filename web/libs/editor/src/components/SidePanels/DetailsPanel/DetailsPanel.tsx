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
    <div className="lsf-details-tab">
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
          <div className="lsf-comments-panel">
            <div className="lsf-comments-panel__section-tab">
              <div className="lsf-comments-panel__section-content">
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
        <div className="lsf-relations">
          <div className="lsf-relations__section-tab">
            <div className="lsf-relations__view-control">
              <div className="lsf-relations__section-head">Relations ({relationStore.size})</div>
              <RelationsControls relationStore={relationStore} />
            </div>
            <div className="lsf-relations__section-content">
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
        <div className="lsf-history">
          <div className="lsf-history__section-tab">
            <div className="lsf-history__section-head">
              Annotation History
              <span>#{currentEntity.pk ?? currentEntity.id}</span>
            </div>
            <div className="lsf-history__section-content">
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
        <div className="lsf-info">
          <div className="lsf-info__section-tab">
            <div className="lsf-info__section-head">Selection Details</div>
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
        <div className="lsf-details__section">
          <div className="lsf-details__section-head">
            Annotation History
            <span>#{currentEntity.pk ?? currentEntity.id}</span>
          </div>
          <div className="lsf-details__section-content">
            <AnnotationHistory inline enabled={showAnnotationHistory} />
          </div>
        </div>
        <div className="lsf-details__section">
          <div className="lsf-details__view-control">
            <div className="lsf-details__section-head">Relations ({relationStore.size})</div>
            <RelationsControls relationStore={relationStore} />
          </div>
          <div className="lsf-details__section-content">
            <RelationsComponent relationStore={relationStore} />
          </div>
        </div>
        {store.hasInterface("annotations:comments") && store.commentStore.isCommentable && (
          <div className="lsf-details__section">
            <div className="lsf-details__section-head">Comments</div>
            <div className="lsf-details__section-content">
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
