import type { IndexStatus } from '../api/client';

interface IndexStatusBannerProps {
  status: IndexStatus;
}

type BannerSeverity = 'info' | 'warning' | 'error';

function Banner({ severity, children }: { severity: BannerSeverity; children: React.ReactNode }): JSX.Element {
  return (
    <aside className={`index-status-banner index-status-banner--${severity}`}>
      <div role="status">{children}</div>
    </aside>
  );
}

export function IndexStatusBanner({ status }: IndexStatusBannerProps): JSX.Element | null {
  switch (status.kind) {
    case 'fresh':
      return null;
    case 'missing':
      return <Banner severity="warning">Index not built. {status.remedy}</Banner>;
    case 'stale':
      return <Banner severity="info">{status.driftedFiles.length} file(s) drifted. {status.remedy}</Banner>;
    case 'empty':
      return <Banner severity="info">Index built but contains no records. {status.remedy}</Banner>;
    case 'version_mismatch':
      return (
        <Banner severity="warning">
          Schema version mismatch (expected {status.expected}, found {status.found}). {status.remedy}
        </Banner>
      );
    case 'open_failed':
      return <Banner severity="error">Index could not be opened. {status.error}</Banner>;
  }

  const exhaustiveStatus: never = status;
  return exhaustiveStatus;
}
