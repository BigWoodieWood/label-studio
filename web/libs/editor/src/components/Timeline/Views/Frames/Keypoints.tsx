import chroma from "chroma-js";
import { type FC, memo, type MouseEvent, useCallback, useContext, useMemo } from "react";
import { clamp } from "../../../../utils/utilities";
import { TimelineContext } from "../../Context";
import type { TimelineRegion } from "../../Types";
import "./Keypoints.scss";
import { type Lifespan, visualizeLifespans } from "./Utils";

export interface KeypointsProps {
  idx?: number;
  region: TimelineRegion;
  startOffset: number;
  renderable: boolean;
  onSelectRegion?: (e: MouseEvent<HTMLDivElement>, id: string, select?: boolean) => void;
}

export const Keypoints: FC<KeypointsProps> = ({ idx, region, startOffset, renderable, onSelectRegion }) => {
  const { step, seekOffset, visibleWidth, length } = useContext(TimelineContext);
  const { label, color, visible, sequence, selected, timeline } = region;

  const extraSteps = useMemo(() => {
    return Math.round(visibleWidth / 2);
  }, [visibleWidth]);

  const minVisibleKeypointPosition = useMemo(() => {
    return clamp(seekOffset - extraSteps, 0, length);
  }, [seekOffset, extraSteps, length]);

  const maxVisibleKeypointPosition = useMemo(() => {
    return clamp(seekOffset + visibleWidth + extraSteps, 0, length);
  }, [seekOffset, visibleWidth, extraSteps, length]);

  const firstPoint = sequence[0];
  const start = firstPoint ? firstPoint.frame - 1 : 0;
  const offset = firstPoint ? start * step : startOffset;

  const styles = useMemo(
    () => ({
      "--offset": `${startOffset}px`,
      "--color": color,
      "--point-color": chroma(color).alpha(1).css(),
      "--lifespan-color": chroma(color)
        .alpha(visible ? 0.4 : 1)
        .css(),
    }),
    [startOffset, color, visible],
  );

  const lifespans = useMemo(() => {
    if (!renderable) return [];

    return visualizeLifespans(sequence, step).map((span) => {
      span.points = span.points.filter(({ frame }) => {
        return frame >= minVisibleKeypointPosition && frame <= maxVisibleKeypointPosition;
      });

      return span;
    });
  }, [sequence, start, step, renderable, minVisibleKeypointPosition, maxVisibleKeypointPosition]);

  const onSelectRegionHandler = useCallback(
    (e: MouseEvent<HTMLDivElement>, select?: boolean) => {
      e.stopPropagation();
      onSelectRegion?.(e, region.id, select);
    },
    [region.id, onSelectRegion],
  );

  // will work only for TimelineRegions; sequence for them is 2 or even 1 point (1 for instants)
  const range = timeline ? sequence.map((s) => s.frame) : [];

  const keypointClasses = [
    "lsf-keypoints",
    selected ? "lsf-keypoints_selected" : "",
    timeline ? "lsf-keypoints_timeline" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={keypointClasses} style={styles} data-id={region.id} data-start={range[0]} data-end={range[1]}>
      <div className="lsf-keypoints__label" onClick={onSelectRegionHandler}>
        <div className="lsf-keypoints__name">{label}</div>
        <div className="lsf-keypoints__data">
          <div className="lsf-keypoints__data-item lsf-keypoints__data-item_faded">{idx}</div>
        </div>
      </div>
      <div className="lsf-keypoints__keypoints" onClick={(e: any) => onSelectRegionHandler(e, true)}>
        <LifespansList lifespans={lifespans} step={step} visible={visible} offset={offset} />
      </div>
    </div>
  );
};

interface LifespansListProps {
  lifespans: Lifespan[];
  step: number;
  offset: number;
  visible: boolean;
}

const LifespansList: FC<LifespansListProps> = ({ lifespans, step, offset, visible }) => {
  return (
    <>
      {lifespans.map((lifespan, i) => {
        const isLast = i + 1 === lifespans.length;
        const { points, ...data } = lifespan;

        return (
          <LifespanItem
            key={`${i}-${points.length}-${isLast}-${visible}`}
            mainOffset={offset}
            step={step}
            isLast={isLast}
            visible={visible}
            points={points.map(({ frame }) => frame)}
            {...data}
          />
        );
      })}
    </>
  );
};

interface LifespanItemProps {
  mainOffset: number;
  width: string | number;
  step: number;
  start: number;
  offset: number;
  enabled: boolean;
  visible: boolean;
  isLast: boolean;
  points: number[];
}

const LifespanItem: FC<LifespanItemProps> = memo(
  ({ mainOffset, width, start, step, offset, enabled, visible, isLast, points }) => {
    const left = mainOffset + offset + step / 2;
    const right = isLast && enabled ? 0 : "auto";
    const finalWidth = isLast && enabled ? "auto" : width;
    const style = useMemo(() => {
      return { left, width: finalWidth, right };
    }, [left, right, finalWidth]);

    const lifespanClasses = [
      "lsf-keypoints__lifespan",
      !visible ? "lsf-keypoints__lifespan_hidden" : "",
      !width ? "lsf-keypoints__lifespan_instant" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={lifespanClasses} style={style}>
        {points.map((frame, i) => {
          const left = (frame - start) * step;
          const pointClasses = ["lsf-keypoints__point", !!left ? "lsf-keypoints__point_last" : ""]
            .filter(Boolean)
            .join(" ");

          return <div key={i} className={pointClasses} style={{ left }} />;
        })}
      </div>
    );
  },
);
