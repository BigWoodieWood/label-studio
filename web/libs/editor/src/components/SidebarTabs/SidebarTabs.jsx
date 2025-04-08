import "./SidebarTabs.scss";

// @todo there was an idea of switchable tabs, but they were not used,
// @todo so implementation was removed and the whole part of interface
// @todo is waiting to be removed in favor of new UI (see FF_DEV_3873)
export const SidebarTabs = ({ children }) => {
  return (
    <div className="dm-sidebar-tabs">
      <div className="dm-sidebar-tabs__content">{children}</div>
    </div>
  );
};
