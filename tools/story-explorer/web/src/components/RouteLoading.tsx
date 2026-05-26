interface RouteLoadingProps {
  label?: string;
}

const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} satisfies React.CSSProperties;

export function RouteLoading({ label = 'Loading...' }: RouteLoadingProps): JSX.Element {
  return (
    <div className="route-loading" role="status" aria-label={label}>
      <span aria-hidden="true" className="route-loading__mark">
        Loading
      </span>
      <span style={visuallyHiddenStyle} aria-live="polite">
        {label}
      </span>
    </div>
  );
}
