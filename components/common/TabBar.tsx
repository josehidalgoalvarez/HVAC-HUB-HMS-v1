import React from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: string;
  buttonId?: string;
  buttonClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  iconClassName?: string;
}

export interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  containerClassName: string;
  buttonClassName: string;
  activeClassName: string;
  inactiveClassName: string;
  iconClassName?: string;
  badgeClassName?: string;
  afterTab?: Record<string, React.ReactNode>;
}

/**
 * Shared tab-bar structure. Owns only button-row rendering; callers supply
 * all container/button/active/inactive styles, state, panels, and optional
 * non-tab slot nodes via `afterTab`.
 */
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  containerClassName,
  buttonClassName,
  activeClassName,
  inactiveClassName,
  iconClassName = 'text-[16px]',
  badgeClassName = 'px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white',
  afterTab,
}) => {
  return (
    <div className={containerClassName}>
      {tabs.map((tab) => {
        const resolvedButtonClass = tab.buttonClassName ?? buttonClassName;
        const resolvedActiveClass = tab.activeClassName ?? activeClassName;
        const resolvedInactiveClass = tab.inactiveClassName ?? inactiveClassName;
        const resolvedIconClass = tab.iconClassName ?? iconClassName;
        return (
          <React.Fragment key={tab.id}>
            <button
              id={tab.buttonId}
              onClick={() => onChange(tab.id)}
              className={`${resolvedButtonClass} ${
                activeTab === tab.id ? resolvedActiveClass : resolvedInactiveClass
              }`}
            >
              {tab.icon && (
                <span aria-hidden="true" className={`material-symbols-outlined ${resolvedIconClass}`}>
                  {tab.icon}
                </span>
              )}
              {tab.label}
              {tab.badge && tab.badge !== '' && (
                <span className={badgeClassName}>{tab.badge}</span>
              )}
            </button>
            {afterTab?.[tab.id]}
          </React.Fragment>
        );
      })}
    </div>
  );
};
