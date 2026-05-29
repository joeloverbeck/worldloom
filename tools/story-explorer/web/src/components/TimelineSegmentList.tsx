import type {
  BranchSplitTimelineSegment,
  TerminalMarkerTimelineSegment,
  TimelineSegment,
} from '../api/client';
import { ChoiceSurfacePanel } from './ChoiceSurfacePanel';
import { PgTick } from './PgTick';
import { SceneSegmentCard } from './SceneSegmentCard';
import { UnscenedRunCard } from './UnscenedRunCard';

interface TimelineSegmentListProps {
  segments: TimelineSegment[];
  onSelectPage: (pageId: string) => void;
}

function terminalReasonCopy(reason: TerminalMarkerTimelineSegment['reason']): string {
  switch (reason) {
    case 'no_children':
      return 'All emitted choices currently have no continued child page.';
    case 'paused':
      return 'Branch has reached a paused state per PG metadata.';
    case 'terminal':
      return 'Terminal page per PG metadata.';
  }
  const exhaustive: never = reason;
  return exhaustive;
}

function BranchSplitMarker({
  segment,
  onSelectPage,
}: {
  segment: BranchSplitTimelineSegment;
  onSelectPage: (pageId: string) => void;
}): JSX.Element {
  return (
    <div
      className={`timeline-segment branch-split${segment.focused ? ' timeline-segment--focused' : ''}`}
      aria-label={`Branch split at ${segment.pageId}`}
    >
      <h3 className="branch-split__title">Branch split</h3>
      <PgTick pageId={segment.pageId} onSelect={onSelectPage} focused={segment.focused} />
      <ul className="branch-split__children" aria-label="Child branches">
        {segment.childBranchIds.map((branchId) => (
          <li className="branch-split__child" key={branchId}>
            {branchId}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TerminalMarker({
  segment,
  onSelectPage,
}: {
  segment: TerminalMarkerTimelineSegment;
  onSelectPage: (pageId: string) => void;
}): JSX.Element {
  return (
    <div
      className={`timeline-segment terminal-marker${segment.focused ? ' timeline-segment--focused' : ''}`}
      aria-label={`Terminal marker at ${segment.pageId}`}
    >
      <h3 className="terminal-marker__title">Terminal</h3>
      <PgTick pageId={segment.pageId} onSelect={onSelectPage} focused={segment.focused} />
      <p className="terminal-marker__reason">{terminalReasonCopy(segment.reason)}</p>
    </div>
  );
}

function renderSegment(segment: TimelineSegment, onSelectPage: (pageId: string) => void): JSX.Element {
  switch (segment.kind) {
    case 'scene_segment':
      return <SceneSegmentCard segment={segment} onSelectPage={onSelectPage} />;
    case 'unscened_run':
      return (
        <UnscenedRunCard
          pageIds={segment.pageIds}
          startPageId={segment.startPageId}
          endPageId={segment.endPageId}
          onSelectPage={onSelectPage}
          focused={segment.focused}
        />
      );
    case 'choice_surface':
      return (
        <ChoiceSurfacePanel choiceSurface={segment.choiceSurface} onSelectPage={onSelectPage} focused={segment.focused} />
      );
    case 'branch_split':
      return <BranchSplitMarker segment={segment} onSelectPage={onSelectPage} />;
    case 'terminal_marker':
      return <TerminalMarker segment={segment} onSelectPage={onSelectPage} />;
  }
  const exhaustive: never = segment;
  return exhaustive;
}

function segmentKey(segment: TimelineSegment): string {
  switch (segment.kind) {
    case 'scene_segment':
      return segment.sceneId;
    case 'unscened_run':
      return segment.startPageId;
    case 'choice_surface':
      return segment.choiceSurface.pageId;
    case 'branch_split':
    case 'terminal_marker':
      return segment.pageId;
  }
  const exhaustive: never = segment;
  return exhaustive;
}

export function TimelineSegmentList({ segments, onSelectPage }: TimelineSegmentListProps): JSX.Element {
  if (segments.length === 0) {
    return <p className="timeline-empty">No timeline segments for this branch.</p>;
  }

  return (
    <ol className="timeline-segment-list" aria-label="Branch timeline segments">
      {segments.map((segment, index) => (
        <li className="timeline-segment-list__item" key={`${segment.kind}-${segmentKey(segment)}-${index}`}>
          {renderSegment(segment, onSelectPage)}
        </li>
      ))}
    </ol>
  );
}
