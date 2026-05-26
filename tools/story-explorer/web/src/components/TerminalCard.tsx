import type { TerminalReason } from '../api/client';

interface TerminalCardProps {
  terminalReason: TerminalReason;
}

function terminalCopy(terminalReason: TerminalReason): string {
  switch (terminalReason) {
    case 'no_children':
      return 'All emitted choices currently have no continued child page.';
    case 'paused':
      return 'Branch has reached a paused state per PG metadata.';
    case 'terminal':
      return 'Terminal page per PG metadata.';
    case null:
      return 'No further pages from this point.';
  }

  const exhaustiveReason: never = terminalReason;
  return exhaustiveReason;
}

export function TerminalCard({ terminalReason }: TerminalCardProps): JSX.Element {
  return (
    <div className="terminal-card">
      <h3>No committed continuation from this page.</h3>
      <p>{terminalCopy(terminalReason)}</p>
    </div>
  );
}
