import { useState } from 'react';

import type { IndexStatus, PageDetail } from '../../api/client';
import { CurrentStateTab } from './tabs/CurrentStateTab';
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
  pageDetail: PageDetail,
  worldSlug: string,
  storySlug: string,
  worldIndexStatus: IndexStatus | null,
): JSX.Element {
  switch (tabId) {
    case 'current-state':
      return <CurrentStateTab pageDetail={pageDetail} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'what-changed':
      return <WhatChangedHereTab pageDetail={pageDetail} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'plan-prose':
      return <PlanProseTab pageDetail={pageDetail} storySlug={storySlug} worldSlug={worldSlug} />;
    case 'validation':
      return <ValidationIntegrityTab pageDetail={pageDetail} worldIndexStatus={worldIndexStatus} />;
  }
}

export function XRayPanel({ pageDetail, storySlug, worldIndexStatus = null, worldSlug }: XRayPanelProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<XRayTabId>('current-state');

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
        {renderTabPanel(activeTab, pageDetail, worldSlug, storySlug, worldIndexStatus)}
      </div>
    </div>
  );
}
