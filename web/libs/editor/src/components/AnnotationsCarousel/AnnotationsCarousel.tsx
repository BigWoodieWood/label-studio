import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";

import { IconChevron } from "@humansignal/ui";
import { Button } from "../../common/Button/Button";
import { clamp, sortAnnotations } from "../../utils/utilities";
import { AnnotationButton } from "./AnnotationButton";

import "./AnnotationsCarousel.scss";

interface AnnotationsCarouselInterface {
  store: any;
  annotationStore: any;
  commentStore?: any;
}

export const AnnotationsCarousel = observer(({ store, annotationStore }: AnnotationsCarouselInterface) => {
  const [entities, setEntities] = useState<any[]>([]);
  const enableAnnotations = store.hasInterface("annotations:tabs");
  const enablePredictions = store.hasInterface("predictions:tabs");
  const enableCreateAnnotation = store.hasInterface("annotations:add-new");
  const groundTruthEnabled = store.hasInterface("ground-truth");
  const enableAnnotationDelete = store.hasInterface("annotations:delete");
  const carouselRef = useRef<HTMLElement>();
  const containerRef = useRef<HTMLElement>();
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isLeftDisabled, setIsLeftDisabled] = useState(false);
  const [isRightDisabled, setIsRightDisabled] = useState(false);

  const updatePosition = useCallback(
    (e: MouseEvent, goLeft = true) => {
      if (containerRef.current && carouselRef.current) {
        const step = containerRef.current.clientWidth;
        const carouselWidth = carouselRef.current.clientWidth;
        const newPos = clamp(goLeft ? currentPosition - step : currentPosition + step, 0, carouselWidth - step);

        setCurrentPosition(newPos);
      }
    },
    [containerRef, carouselRef, currentPosition],
  );

  useEffect(() => {
    setIsLeftDisabled(currentPosition <= 0);
    setIsRightDisabled(
      currentPosition >= (carouselRef.current?.clientWidth ?? 0) - (containerRef.current?.clientWidth ?? 0),
    );
  }, [
    entities.length,
    containerRef.current,
    carouselRef.current,
    currentPosition,
    window.innerWidth,
    window.innerHeight,
  ]);

  useEffect(() => {
    const newEntities = [];

    if (enablePredictions) newEntities.push(...annotationStore.predictions);

    if (enableAnnotations) newEntities.push(...annotationStore.annotations);
    setEntities(newEntities);
  }, [annotationStore, JSON.stringify(annotationStore.predictions), JSON.stringify(annotationStore.annotations)]);

  return enableAnnotations || enablePredictions || enableCreateAnnotation ? (
    <div
      className="dm-annotations-carousel"
      style={{ "--carousel-left": `${currentPosition}px` } as React.CSSProperties}
    >
      <div ref={containerRef as React.RefObject<HTMLDivElement>} className="dm-annotations-carousel__container">
        <div ref={carouselRef as React.RefObject<HTMLDivElement>} className="dm-annotations-carousel__carosel">
          {sortAnnotations(entities).map((entity) => (
            <AnnotationButton
              key={entity?.id}
              entity={entity}
              capabilities={{
                enablePredictions,
                enableCreateAnnotation,
                groundTruthEnabled,
                enableAnnotations,
                enableAnnotationDelete,
              }}
              annotationStore={annotationStore}
            />
          ))}
        </div>
      </div>
      {(!isLeftDisabled || !isRightDisabled) && (
        <div className="dm-annotations-carousel__carousel-controls">
          <Button
            className={`dm-annotations-carousel__nav ${isLeftDisabled ? "dm-annotations-carousel__nav_disabled" : ""} dm-annotations-carousel__nav_left`}
            disabled={isLeftDisabled}
            aria-label="Carousel left"
            onClick={(e: any) => !isLeftDisabled && updatePosition(e, true)}
          >
            <IconChevron className="dm-annotations-carousel__arrow dm-annotations-carousel__arrow_left" />
          </Button>
          <Button
            className={`dm-annotations-carousel__nav ${isRightDisabled ? "dm-annotations-carousel__nav_disabled" : ""} dm-annotations-carousel__nav_right`}
            disabled={isRightDisabled}
            aria-label="Carousel right"
            onClick={(e: any) => !isRightDisabled && updatePosition(e, false)}
          >
            <IconChevron className="dm-annotations-carousel__arrow dm-annotations-carousel__arrow_right" />
          </Button>
        </div>
      )}
    </div>
  ) : null;
});
