import { useRef, useState } from "react";
import { IconOutlinerDrag } from "@humansignal/ui";
import { useDrag } from "../../../hooks/useDrag";
import { DEFAULT_PANEL_HEIGHT } from "../constants";
import "./Tabs.scss";
import { type BaseProps, Side, type TabProps } from "./types";
import { determineDroppableArea, determineLeftOrRight } from "./utils";

const classAddedTabs: (Element | undefined)[] = [];

enum DragOverHeightClasses {
  tabLeft = "lsf-drag_over_tab_left",
  tabRight = "lsf-drag_over_tab_right",
  emptyTabSpace = "lsf-drag_over_empty_tab_space",
}

const removeHoverClasses = () => {
  classAddedTabs.forEach((tab) => {
    tab?.classList.remove(DragOverHeightClasses.tabLeft);
    tab?.classList.remove(DragOverHeightClasses.tabRight);
    tab?.classList.remove(DragOverHeightClasses.emptyTabSpace);
  });
};

const addHoverClasses = (side?: Side, dropTarget?: Element) => {
  classAddedTabs.push(dropTarget);
  let draggingClass;

  if (side === Side.left) draggingClass = DragOverHeightClasses.tabLeft;
  if (side === Side.right) draggingClass = DragOverHeightClasses.tabRight;
  if (side === undefined) draggingClass = DragOverHeightClasses.emptyTabSpace;

  draggingClass && dropTarget?.classList.add(draggingClass);
};

const Tab = ({
  name,
  rootRef,
  tabTitle: tabText,
  tabIndex,
  panelKey,
  viewLength,
  children,
  active,
  panelWidth,
  locked,
  breakPointActiveTab,
  setBreakPointActiveTab,
  transferTab,
  createNewPanel,
  setActiveTab,
  checkSnap,
}: TabProps) => {
  const tabRef = useRef<HTMLDivElement>();
  const ghostTabRef = useRef<HTMLDivElement>();
  const dragging = useRef(false);
  const location = useRef({ panelKey, tabIndex });
  const [shouldShowGhostTab, setShouldShowGhostTab] = useState(false);

  location.current = { panelKey, tabIndex };

  useDrag(
    {
      elementRef: tabRef,
      onMouseDown(event) {
        if (locked) {
          setBreakPointActiveTab && setBreakPointActiveTab(location.current.tabIndex);
          return;
        }
        if (event.buttons === 2) return;
        const { panelKey, tabIndex } = { ...location.current };

        setActiveTab(panelKey, tabIndex);
        rootRef.current?.append(ghostTabRef.current!);
        ghostTabRef.current!.style.pointerEvents = "all";

        const tab = tabRef.current!;
        const page = rootRef.current!.getBoundingClientRect();
        const bbox = tab.getBoundingClientRect();
        const [x, y] = [event.pageX, event.pageY];
        const [oX, oY] = [bbox.left - page.left, bbox.top - page.top];

        return { x, y, oX, oY, panelKey, tabIndex };
      },
      onMouseMove(event, data) {
        if (!data) return;
        document.body.style.cursor = "grabbing";
        window.getSelection()?.removeAllRanges();

        dragging.current = true;
        const { x, y, oX, oY } = data;
        const newY = event.pageY - (y - oY);
        const newX = event.pageX - (x - oX);

        if (ghostTabRef.current) {
          setShouldShowGhostTab(true);
          ghostTabRef.current!.style.display = "block";
          ghostTabRef.current!.style.top = `${newY}px`;
          ghostTabRef.current!.style.left = `${newX}px`;
        }
        const dropTargets = document.elementsFromPoint(event.clientX, event.clientY);
        const dropTarget = dropTargets.find((target, index) => target.id.includes("droppable") && index > 0);
        let side: Side | undefined = determineLeftOrRight(event, dropTarget);
        const tabHeight = ghostTabRef.current?.getBoundingClientRect().height;

        tabHeight && checkSnap(newX, panelWidth, newY, tabHeight);

        removeHoverClasses();
        if ((dropTarget as HTMLElement)?.id === `${panelKey}_${tabIndex}_droppable`) return;
        if ((dropTarget as HTMLElement)?.id.includes("droppable-space")) side = undefined;
        addHoverClasses(side, dropTarget);
      },
      onMouseUp(event, data) {
        removeHoverClasses();
        classAddedTabs.length = 0;
        tabRef.current?.append(ghostTabRef.current!);
        if (ghostTabRef.current?.style) {
          ghostTabRef.current.style.display = "none";
          setShouldShowGhostTab(false);
        }
        document.body.style.cursor = "auto";

        if (!data || !dragging.current) return;
        dragging.current = false;
        const { x, y, oX, oY, panelKey, tabIndex } = data;
        const headerHeight = 32;
        const [nX, nY] = [event.pageX - (x - oX), event.pageY - (y - oY)];
        const left = nX < 0 ? 0 : nX;
        const implementedHeight = nY - headerHeight;
        const top = implementedHeight < 0 ? 0 : implementedHeight;
        const droppedOver = document.elementFromPoint(event.clientX, event.clientY);
        const isDropArea = determineDroppableArea(droppedOver as HTMLElement);

        if (!isDropArea) createNewPanel(name, panelKey, tabIndex, left, top);
        else {
          const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
          const dropTargetId = dropTarget?.id;

          if (!dropTargetId || !dropTargetId?.includes("droppable")) return;
          const droppedOnIndices = dropTargetId.split("_");
          const receivingPanel = droppedOnIndices[0];
          const receivingTab = Number.parseInt(droppedOnIndices[1]);
          const dropSide = determineLeftOrRight(event, dropTarget as HTMLElement);

          if (
            (tabIndex === receivingTab && panelKey === receivingPanel) ||
            (viewLength === 1 && panelKey === receivingPanel)
          )
            return;

          dropSide && transferTab(tabIndex, panelKey, receivingPanel, receivingTab, dropSide);
        }
      },
    },
    [],
  );

  const Label = () => {
    const tabClasses = ["dm-panel-tabs__tab"];
    if (locked ? tabIndex === breakPointActiveTab : active) {
      tabClasses.push("dm-panel-tabs__tab_active");
    }

    return (
      <div id={`${panelKey}_${tabIndex}_droppable`} className={tabClasses.join(" ")}>
        {!locked && <IconOutlinerDrag className="dm-panel-tabs__icon" />}
        {tabText}
      </div>
    );
  };

  return (
    <div className="dm-panel-tabs">
      <div className="dm-panel-tabs__draggable-tab" id={`${tabText}-draggable`} ref={tabRef}>
        <Label />
      </div>
      <div
        ref={ghostTabRef}
        className="dm-panel-tabs__ghost-tab"
        style={{
          width: `${panelWidth}px`,
          height: "fit-content",
          maxHeight: `${DEFAULT_PANEL_HEIGHT}px`,
          overflow: "hidden",
        }}
      >
        <Label />
        {shouldShowGhostTab && <div className="dm-panel-tabs__contents">{children}</div>}
      </div>
    </div>
  );
};

export const Tabs = (props: BaseProps) => {
  const ActiveComponent = props.locked
    ? props.panelViews[props.breakPointActiveTab].component
    : props.panelViews?.find((view) => view.active)?.component;

  return (
    <>
      <div className="dm-tabs">
        <div className="dm-tabs__tabs-row">
          {props.panelViews.map((view, index) => {
            const { component: Component } = view;

            return (
              <div
                className={`dm-tabs__tab-container ${view.active ? "dm-tabs__tab-container_active" : ""}`}
                key={`${view.title}-${index}-tab`}
              >
                <Tab
                  name={view.name}
                  rootRef={props.root}
                  key={`${view.title}-tab`}
                  panelKey={props.name}
                  tabIndex={index}
                  active={view.active}
                  tabTitle={view.title}
                  panelWidth={props.width}
                  viewLength={props.panelViews.length}
                  locked={props.locked}
                  transferTab={props.transferTab}
                  createNewPanel={props.createNewPanel}
                  setActiveTab={props.setActiveTab}
                  checkSnap={props.checkSnap}
                  breakPointActiveTab={props.breakPointActiveTab}
                  setBreakPointActiveTab={props.setBreakPointActiveTab}
                >
                  <div className="dm-tabs__content">
                    <Component key={`${view.title}-${index}-ghost`} {...props} name={"outliner"} />
                  </div>
                </Tab>
              </div>
            );
          })}
          <div id={`${props.name}_${props.panelViews.length}-droppable-space`} className="dm-tabs__drop-space-after" />
        </div>
        <div className="dm-tabs__contents">{ActiveComponent && <ActiveComponent {...props} />}</div>
      </div>
    </>
  );
};
