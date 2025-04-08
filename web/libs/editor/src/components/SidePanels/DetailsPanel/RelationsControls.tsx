import { type FC, useCallback } from "react";
import { observer } from "mobx-react";
import { Button } from "../../../common/Button/Button";
import "./RelationsControls.scss";
import { IconOutlinerEyeClosed, IconOutlinerEyeOpened, IconSortUp, IconSortDown } from "@humansignal/icons";

const RelationsControlsComponent: FC<any> = ({ relationStore }) => {
  return (
    <div className="dm-relation-controls">
      <ToggleRelationsVisibilityButton relationStore={relationStore} />
      <ToggleRelationsOrderButton relationStore={relationStore} />
    </div>
  );
};

interface ToggleRelationsVisibilityButtonProps {
  relationStore: any;
}

const ToggleRelationsVisibilityButton = observer<FC<ToggleRelationsVisibilityButtonProps>>(({ relationStore }) => {
  const toggleRelationsVisibility = useCallback(
    (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      relationStore.toggleAllVisibility();
    },
    [relationStore],
  );

  const isDisabled = !relationStore?.relations?.length;
  const isAllHidden = !(!isDisabled && relationStore.isAllHidden);

  return (
    <Button
      type="text"
      disabled={isDisabled}
      onClick={toggleRelationsVisibility}
      className={isAllHidden ? "dm-relation-controls_hidden" : ""}
      aria-label={isAllHidden ? "Show all" : "Hide all"}
      icon={
        isAllHidden ? (
          <IconOutlinerEyeClosed width={16} height={16} />
        ) : (
          <IconOutlinerEyeOpened width={16} height={16} />
        )
      }
      tooltip={isAllHidden ? "Show all" : "Hide all"}
      tooltipTheme="dark"
    />
  );
});

interface ToggleRelationsOrderButtonProps {
  relationStore: any;
}

const ToggleRelationsOrderButton = observer<FC<ToggleRelationsOrderButtonProps>>(({ relationStore }) => {
  const toggleRelationsOrder = useCallback(
    (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      relationStore.toggleOrder();
    },
    [relationStore],
  );

  const isDisabled = !relationStore?.relations?.length;
  const isAsc = relationStore.order === "asc";

  return (
    <Button
      type="text"
      onClick={toggleRelationsOrder}
      disabled={isDisabled}
      className={`dm-relation-controls_order_${relationStore.order}`}
      aria-label={isAsc ? "Order by oldest" : "Order by newest"}
      icon={isAsc ? <IconSortUp /> : <IconSortDown />}
      tooltip={isAsc ? "Order by oldest" : "Order by newest"}
      tooltipTheme="dark"
    />
  );
});

export const RelationsControls = observer(RelationsControlsComponent);
