import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { IndexStatus, PageDetail, RecordLink } from '../../api/client';
import { CurrentStateTab } from './tabs/CurrentStateTab';
import { dispatchRecordLinkClick } from './navigation-dispatcher';
import { LinkedRecordPeek } from './LinkedRecordPeek';
import { PlanProseTab } from './tabs/PlanProseTab';
import { ValidationIntegrityTab } from './tabs/ValidationIntegrityTab';
import { WhatChangedHereTab } from './tabs/WhatChangedHereTab';
import { XRayTabs, type XRayTabId } from './XRayTabs';

interface XRayPanelProps {
  pageDetail: PageDetail;
  storySlug: string;
  worldIndexStatus?: IndexStatus | null;
  worldSlug: string;
}

function renderTabPanel(
  tabId: XRayTabId,
  onRecordLinkClick: (target: RecordLink | string) => void,
  pageDetail: PageDetail,
  worldSlug: string,
  storySlug: string,
  worldIndexStatus: IndexStatus | null,
): JSX.Element {
  switch (tabId) {
    case 'current-state':
      return <CurrentStateTab onRecordLinkClick={onRecordLinkClick} pageDetail={pageDetail} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'what-changed':
      return <WhatChangedHereTab onRecordLinkClick={onRecordLinkClick} pageDetail={pageDetail} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'plan-prose':
      return <PlanProseTab pageDetail={pageDetail} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'validation':
      return <ValidationIntegrityTab pageDetail={pageDetail} worldIndexStatus={worldIndexStatus} />;
  }
}

export function XRayPanel({ pageDetail, storySlug, worldIndexStatus = null, worldSlug }: XRayPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<XRayTabId>('current-state');
  const [peekRecordId, setPeekRecordId] = useState<string | null>(null);
  const navigate = useNavigate();

  function handleRecordLinkClick(target: RecordLink | string): void {
    dispatchRecordLinkClick(target, {
      activeRecordIds: pageDetail.currentStateRecordIds,
      navigateToPage: navigate,
      openPeek: setPeekRecordId,
      selectTab: setActiveTab,
      storyContext: { storySlug, worldSlug },
    });
  }

  return (
    <div className="xray-panel">
      <XRayTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div
        aria-labelledby={`xray-tab-${activeTab}`}
        className="xray-tab-panel"
        id={`xray-panel-${activeTab}`}
        role="tabpanel"
        tabIndex={0}
      >
        {renderTabPanel(activeTab, handleRecordLinkClick, pageDetail, worldSlug, storySlug, worldIndexStatus)}
      </div>
      <LinkedRecordPeek
        onClose={() => setPeekRecordId(null)}
        recordId={peekRecordId}
        storySlug={storySlug}
        worldSlug={worldSlug}
      />
    </div>
  );
}
