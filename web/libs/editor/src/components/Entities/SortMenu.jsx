import { Menu } from "antd";
import { observer } from "mobx-react";
import { ThunderboltOutlined } from "@ant-design/icons";
import { IconDate } from "@humansignal/icons";
import "./SortMenu.scss";

export const SortMenuIcon = ({ sortKey }) => {
  switch (sortKey) {
    case "date":
      return <IconDate />;
    case "score":
      return <ThunderboltOutlined />;
    default:
      return null;
  }
};

export const SortMenu = observer(({ regionStore }) => {
  return (
    <Menu className="lsf-sort-menu" selectedKeys={[regionStore.sort]}>
      <Menu.Item key="date">
        <div
          className="lsf-sort-menu__option-inner"
          onClick={(ev) => {
            regionStore.setSort("date");
            ev.preventDefault();
            return false;
          }}
        >
          <div className="lsf-sort-menu__title">
            <span className="lsf-sort-menu__icon">
              <SortMenuIcon sortKey="date" />
            </span>{" "}
            Date
          </div>
          <span>{regionStore.sort === "date" && (regionStore.sortOrder === "asc" ? "↓" : "↑")}</span>
        </div>
      </Menu.Item>
      <Menu.Item key="score">
        <div
          className="lsf-sort-menu__option-inner"
          onClick={(ev) => {
            regionStore.setSort("score");
            ev.preventDefault();
            return false;
          }}
        >
          <div className="lsf-sort-menu__title">
            <span className="lsf-sort-menu__icon">
              <SortMenuIcon sortKey="score" />
            </span>{" "}
            Score
          </div>
          <span>{regionStore.sort === "score" && (regionStore.sortOrder === "asc" ? "↓" : "↑")}</span>
        </div>
      </Menu.Item>
    </Menu>
  );
});
