import React, { useMemo } from "react";
import { Modal, Table, Tabs } from "antd";
import { observer } from "mobx-react";

import { Hotkey } from "../../core/Hotkey";

import "./Settings.scss";
import { Block, Elem } from "../../utils/bem";

import EditorSettings from "../../core/settings/editorsettings";
import * as TagSettings from "./TagSettings";
import { IconClose } from "@humansignal/icons";
import { Toggle } from "@humansignal/ui";
import { ff } from "@humansignal/core";

const HotkeysDescription = () => {
  const columns = [
    { title: "Shortcut", dataIndex: "combo", key: "combo" },
    { title: "Description", dataIndex: "descr", key: "descr" },
  ];

  const keyNamespaces = Hotkey.namespaces();

  const getData = (descr) =>
    Object.keys(descr)
      .filter((k) => descr[k])
      .map((k) => ({
        key: k,
        combo: k.split(",").map((keyGroup) => {
          return (
            <Elem name="key-group" key={keyGroup}>
              {keyGroup
                .trim()
                .split("+")
                .map((k) => (
                  <Elem tag="kbd" name="key" key={k}>
                    {k}
                  </Elem>
                ))}
            </Elem>
          );
        }),
        descr: descr[k],
      }));

  return (
    <Block name="keys">
      <Tabs size="small">
        {Object.entries(keyNamespaces).map(([ns, data]) => {
          if (Object.keys(data.descriptions).length === 0) {
            return null;
          }
          return (
            <Tabs.TabPane key={ns} tab={data.description ?? ns}>
              <Table columns={columns} dataSource={getData(data.descriptions)} size="small" />
            </Tabs.TabPane>
          );
        })}
      </Tabs>
    </Block>
  );
};

const newUI = { newUI: true };

const editorSettingsKeys = Object.keys(EditorSettings).filter((key) => {
  const flag = EditorSettings[key].flag;
  return flag ? ff.isActive(flag) : true;
});

const enableTooltipsIndex = editorSettingsKeys.findIndex((key) => key === "enableTooltips");
const enableLabelTooltipsIndex = editorSettingsKeys.findIndex((key) => key === "enableLabelTooltips");

// swap these in the array
const tmp = editorSettingsKeys[enableTooltipsIndex];

editorSettingsKeys[enableTooltipsIndex] = editorSettingsKeys[enableLabelTooltipsIndex];
editorSettingsKeys[enableLabelTooltipsIndex] = tmp;

const SettingsTag = ({ children }) => {
  return <Block name="settings-tag">{children}</Block>;
};

const GeneralSettings = observer(({ store }) => {
  return (
    <Block name="settings" mod={newUI}>
      {editorSettingsKeys.map((obj, index) => {
        return (
          <Elem name="field" tag="label" key={index}>
            <Block name="settings__label">
              <Elem name="title">
                {EditorSettings[obj].newUI.title}
                {EditorSettings[obj].newUI.tags?.split(",").map((tag) => (
                  <SettingsTag key={tag}>{tag}</SettingsTag>
                ))}
              </Elem>
              <Elem name="description">{EditorSettings[obj].newUI.description}</Elem>
            </Block>
            <Toggle
              key={index}
              checked={store.settings[obj]}
              onChange={store.settings[EditorSettings[obj].onChangeEvent]}
              description={EditorSettings[obj].description}
            />
          </Elem>
        );
      })}
    </Block>
  );
});

const Settings = {
  General: { name: "General", component: GeneralSettings },
  Hotkeys: { name: "Hotkeys", component: HotkeysDescription },
};

const DEFAULT_ACTIVE = Object.keys(Settings)[0];

const DEFAULT_MODAL_SETTINGS = {
  name: "settings-modal",
  title: "Labeling Interface Settings",
  closeIcon: <IconClose />,
};

export default observer(({ store }) => {
  const availableSettings = useMemo(() => {
    const availableTags = Object.values(store.annotationStore.names.toJSON());
    const settingsScreens = Object.values(TagSettings);

    return availableTags.reduce((res, tagName) => {
      const tagType = store.annotationStore.names.get(tagName).type;
      const settings = settingsScreens.find(({ tagName }) => tagName.toLowerCase() === tagType.toLowerCase());

      if (settings) res.push(settings);

      return res;
    }, []);
  }, []);

  return (
    <Block
      tag={Modal}
      open={store.showingSettings}
      onCancel={store.toggleSettings}
      footer=""
      {...DEFAULT_MODAL_SETTINGS}
    >
      <Tabs defaultActiveKey={DEFAULT_ACTIVE}>
        {Object.entries(Settings).map(([key, { name, component }]) => (
          <Tabs.TabPane tab={name} key={key}>
            {React.createElement(component, { store })}
          </Tabs.TabPane>
        ))}
        {availableSettings.map((Page) => (
          <Tabs.TabPane tab={Page.title} key={Page.tagName}>
            <Page store={store} />
          </Tabs.TabPane>
        ))}
      </Tabs>
    </Block>
  );
});
