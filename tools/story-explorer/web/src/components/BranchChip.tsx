interface BranchChipProps {
  branchId: string;
  onClick?: () => void;
}

export function BranchChip({ branchId, onClick }: BranchChipProps): JSX.Element {
  return (
    <button className="branch-chip" type="button" onClick={onClick} aria-label={`Branch ${branchId}`}>
      {branchId}
    </button>
  );
}
