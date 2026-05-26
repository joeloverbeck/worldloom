interface BrokenReferenceChipProps {
  recordId: string;
}

export function BrokenReferenceChip({ recordId }: BrokenReferenceChipProps): JSX.Element {
  function copyRecordId(): void {
    void navigator.clipboard?.writeText(recordId);
  }

  return (
    <button
      aria-label={`Unresolved reference ${recordId}. Copy record ID.`}
      className="record-chip record-chip--broken record-chip--button"
      onClick={copyRecordId}
      title="Unresolved reference"
      type="button"
    >
      Unresolved reference: {recordId}
    </button>
  );
}
