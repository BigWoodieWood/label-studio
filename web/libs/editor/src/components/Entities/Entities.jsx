import { Dropdown } from "antd";
import { observer } from "mobx-react";

import "./Entities.scss";
import { RegionTree } from "./RegionTree";
import { LabelList } from "./LabelList";
import { SortMenu, SortMenuIcon } from "./SortMenu";
import { Oneof } from "../../common/Oneof/Oneof";
import { Space } from "../../common/Space/Space";
import { RadioGroup } from "../../common/RadioGroup/RadioGroup";
import "./Entities.scss";
import { Button } from "../../common/Button/Button";
import { confirm } from "../../common/Modal/Modal";
import { IconInvisible, IconTrash, IconVisible } from "@humansignal/icons";
import { Tooltip } from "@humansignal/ui";

export default observer(({ regionStore, annotation }) => {
  const { classifications, regions, view } = regionStore;
  const count = regions.length + (view === "regions" ? classifications.length : 0);
  const toggleVisibility = (e) => {
    e.preventDefault();
    e.stopPropagation();
    regionStore.toggleVisibility();
  };

  return (
    <div className="lsf-entities">
      <div className="lsf-entities__source">
        <Space spread>
          <RadioGroup
            size="small"
            value={view}
            style={{ width: 240 }}
            onChange={(e) => {
              regionStore.setView(e.target.value);
            }}
          >
            <RadioGroup.Button value="regions">
              Regions{count ? <span className="lsf-entities__counter">&nbsp;{count}</span> : null}
            </RadioGroup.Button>
            <RadioGroup.Button value="labels">Labels</RadioGroup.Button>
          </RadioGroup>

          {annotation.isReadOnly() && (
            <Tooltip title="Delete All Regions">
              <Button
                look="danger"
                type="text"
                aria-label="Delete All Regions"
                icon={<IconTrash />}
                style={{
                  height: 36,
                  width: 36,
                  padding: 0,
                }}
                onClick={() => {
                  confirm({
                    title: "Removing all regions",
                    body: "Do you want to delete all annotated regions?",
                    buttonLook: "destructive",
                    onOk: () => annotation.deleteAllRegions(),
                  });
                }}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {count ? (
        <div className="lsf-entities__header">
          <Space spread align={view === "regions" ? null : "end"}>
            {view === "regions" && (
              <Dropdown overlay={<SortMenu regionStore={regionStore} />} placement="bottomLeft">
                <div className="lsf-entities__sort" onClick={(e) => e.preventDefault()}>
                  <div className="lsf-entities__sort-icon">
                    <SortMenuIcon sortKey={regionStore.sort} />
                  </div>{" "}
                  {`Sorted by ${regionStore.sort[0].toUpperCase()}${regionStore.sort.slice(1)}`}
                </div>
              </Dropdown>
            )}

            <Space size="small" align="end">
              {regions.length > 0 ? (
                <Button
                  className={`lsf-entities__visibility ${regionStore.isAllHidden ? "lsf-entities__visibility_hidden" : ""}`}
                  size="small"
                  type="link"
                  style={{ padding: 0 }}
                  onClick={toggleVisibility}
                >
                  {regionStore.isAllHidden ? <IconInvisible /> : <IconVisible />}
                </Button>
              ) : null}
            </Space>
          </Space>
        </div>
      ) : null}

      <Oneof value={view}>
        <div className="lsf-entities__regions" case="regions">
          {count ? (
            <RegionTree regionStore={regionStore} />
          ) : (
            <div className="lsf-entities__empty">No Regions created yet</div>
          )}
        </div>
        <div className="lsf-entities__labels" case="labels">
          {count ? (
            <LabelList regionStore={regionStore} />
          ) : (
            <div className="lsf-entities__empty">No Labeled Regions created yet</div>
          )}
        </div>
      </Oneof>
    </div>
  );
});
