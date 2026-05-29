import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { IndexStatus, RecordLink, StateTickXray } from '../../api/client';
import { CurrentStateTab } from './tabs/CurrentStateTab';
import { dispatchRecordLinkClick } from './navigation-dispatcher';
import { LinkedRecordPeek } from './LinkedRecordPeek';
import { ValidationIntegrityTab } from './tabs/ValidationIntegrityTab';
import { WhatChangedHereTab } from './tabs/WhatChangedHereTab';
import { XRayTabs, XRAY_TABS, type XRayTabId } from './XRayTabs';

interface XRayPanelProps {
  tick: StateTickXray;
  storySlug: string;
  worldIndexStatus?: IndexStatus | null;
  worldSlug: string;
}

function renderTabPanel(
  tabId: XRayTabId,
  onRecordLinkClick: (target: RecordLink | string) => void,
  tick: StateTickXray,
  worldSlug: string,
  storySlug: string,
  worldIndexStatus: IndexStatus | null,
): JSX.Element {
  switch (tabId) {
    case 'current-state':
      return <CurrentStateTab onRecordLinkClick={onRecordLinkClick} tick={tick} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'what-changed':
      return <WhatChangedHereTab onRecordLinkClick={onRecordLinkClick} tick={tick} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'validation':
      return <ValidationIntegrityTab tick={tick} worldIndexStatus={worldIndexStatus} />;
  }
}

export function XRayPanel({ tick, storySlug, worldIndexStatus = null, worldSlug }: XRayPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<XRayTabId>('current-state');
  const [peekRecordId, setPeekRecordId] = useState<string | null>(null);
  const navigate = useNavigate();
  const activeRecordIds = useMemo(() => Object.values(tick.activeRecordsByClass).flat(), [tick.activeRecordsByClass]);

  function handleRecordLinkClick(target: RecordLink | string): void {
    dispatchRecordLinkClick(target, {
      activeRecordIds,
      navigateToPage: navigate,
      openPeek: setPeekRecordId,
      selectTab: setActiveTab,
      storyContext: { storySlug, worldSlug },
    });
  }

  return (
    <div className="xray-panel">
      <XRayTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {XRAY_TABS.map((tab) => {
        const selected = tab.id === activeTab;

        return (
          <div
            aria-labelledby={`xray-tab-${tab.id}`}
            className="xray-tab-panel"
            hidden={!selected}
            id={`xray-panel-${tab.id}`}
            key={tab.id}
            role="tabpanel"
            tabIndex={selected ? 0 : -1}
          >
            {selected ? renderTabPanel(tab.id, handleRecordLinkClick, tick, worldSlug, storySlug, worldIndexStatus) : null}
          </div>
        );
      })}
      <LinkedRecordPeek
        onClose={() => setPeekRecordId(null)}
        recordId={peekRecordId}
        storySlug={storySlug}
        worldSlug={worldSlug}
      />
    </div>
  );
}
