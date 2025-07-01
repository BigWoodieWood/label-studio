import { observer } from "mobx-react";
import type { FC } from "react";
import { IconLockLocked, IconLockUnlocked } from "@humansignal/icons";
import type { ButtonProps } from "../../../common/Button/Button";
import { RegionControlButton } from "./RegionControlButton";

export const LockButton: FC<{
  item: any;
  annotation: any;
  hovered: boolean;
  locked: boolean;
  hotkey?: string;
  look?: ButtonProps["look"];
  style?: ButtonProps["style"];
  onClick: () => void;
}> = observer(({ item, annotation, hovered, locked, hotkey, look, style, onClick }) => {
  if (!item) return null;
  const isLocked = locked || item.isReadOnly() || annotation.isReadOnly();
  const isRegionReadonly = item.isReadOnly() && !locked;

  const styles = {
    ...style,
    display: item.isReadOnly() || locked ? undefined : "none",
  };

  return (
    <RegionControlButton disabled={isRegionReadonly} onClick={onClick} hotkey={hotkey} look={look} style={styles}>
      {isLocked ? <IconLockLocked /> : <IconLockUnlocked />}
    </RegionControlButton>
  );
});
