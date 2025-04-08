import { List } from "antd";
import { observer } from "mobx-react";
import { Button } from "../../common/Button/Button";
import { Space } from "../../common/Space/Space";
import { IconInvisible, IconVisible } from "@humansignal/ui";
import { Label } from "../Label/Label";
import { asVars } from "../../utils/styles";
import "./LabelItem.scss";

export const LabelItem = observer(({ item, regions, regionStore }) => {
  const color = item.background;
  const vars = asVars({ color });

  const isHidden = Object.values(regions).reduce((acc, item) => acc && item.hidden, true);
  const count = Object.values(regions).length;

  return (
    <List.Item className="lsf-list-item" key={item.id} style={vars}>
      <Space spread>
        <div className="lsf-list-item__title">
          {!item.isNotLabel ? (
            <Label color={color} empty={item.isEmpty}>
              {item._value}
            </Label>
          ) : (
            <>Not labeled</>
          )}
          <div className="lsf-list-item__counter">{`${count} Region${count === 0 || count > 1 ? "s" : ""}`}</div>
        </div>
        <Button
          className={`lsf-list-item__visibility ${isHidden ? "lsf-list-item__visibility_hidden" : ""}`}
          type="text"
          icon={isHidden ? <IconInvisible /> : <IconVisible />}
          onClick={() => regionStore.setHiddenByLabel(!isHidden, item)}
        />
      </Space>
    </List.Item>
  );
});
