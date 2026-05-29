import type { KeyboardEvent } from 'react';

export type XRayTabId = 'current-state' | 'what-changed' | 'validation';

export interface XRayTabDefinition {
  id: XRayTabId;
  label: string;
}

export const XRAY_TABS: XRayTabDefinition[] = [
  { id: 'current-state', label: 'Current State' },
  { id: 'what-changed', label: 'What Changed Here' },
  { id: 'validation', label: 'Validation & Integrity' },
];

const FIRST_TAB_ID: XRayTabId = 'current-state';
const LAST_TAB_ID: XRayTabId = 'validation';

interface XRayTabsProps {
  activeTab: XRayTabId;
  onTabChange: (tabId: XRayTabId) => void;
}

function focusTab(tabId: XRayTabId): void {
  const tab = document.getElementById(`xray-tab-${tabId}`);
  tab?.focus();
}

function nextTabId(activeTab: XRayTabId, direction: 1 | -1): XRayTabId {
  const currentIndex = XRAY_TABS.findIndex((tab) => tab.id === activeTab);
  const nextIndex = (currentIndex + direction + XRAY_TABS.length) % XRAY_TABS.length;
  return XRAY_TABS[nextIndex]?.id ?? FIRST_TAB_ID;
}

export function XRayTabs({ activeTab, onTabChange }: XRayTabsProps): JSX.Element {
  function activateTab(tabId: XRayTabId): void {
    onTabChange(tabId);
    window.requestAnimationFrame(() => focusTab(tabId));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      activateTab(nextTabId(activeTab, 1));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      activateTab(nextTabId(activeTab, -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      activateTab(FIRST_TAB_ID);
    } else if (event.key === 'End') {
      event.preventDefault();
      activateTab(LAST_TAB_ID);
    }
  }

  return (
    <div className="xray-tabs" role="tablist" aria-label="State X-Ray tabs">
      {XRAY_TABS.map((tab) => {
        const selected = tab.id === activeTab;

        return (
          <button
            aria-controls={`xray-panel-${tab.id}`}
            aria-selected={selected}
            className="xray-tabs__tab"
            id={`xray-tab-${tab.id}`}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={handleKeyDown}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
