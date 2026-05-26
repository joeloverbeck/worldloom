export interface MaintenancePagePlanRecordLine {
  action: "create" | "supersede";
  recordType: string;
  recordId: string;
  supersedes?: string;
}

export interface RenderMaintenancePagePlanArgs {
  pageId: string;
  parentPageId: string;
  eventId: string;
  eventKind: "audit_repair" | "system_repair";
  reason: string;
  sourceTicket: string;
  records: MaintenancePagePlanRecordLine[];
}

export function renderMaintenancePagePlan(args: RenderMaintenancePagePlanArgs): string {
  const recordLines = args.records
    .map((record) => {
      const supersedes = record.supersedes === undefined ? "" : `; supersedes ${record.supersedes}`;
      return `- ${record.action}: ${record.recordType} ${record.recordId}${supersedes}`;
    })
    .join("\n");

  return [
    `# Maintenance Page Plan ${args.pageId}`,
    "",
    "## Maintenance Trigger",
    "",
    `- Parent page: ${args.parentPageId}`,
    `- Maintenance event: ${args.eventId} (${args.eventKind})`,
    `- Source ticket: ${args.sourceTicket}`,
    `- Reason: ${args.reason}`,
    "",
    "## Maintenance Record Delta",
    "",
    recordLines,
    "",
    "## Renderer Context",
    "",
    "No prose render is expected for this maintenance PG. The page exists to make bounded story-state maintenance forkable from a committed PG snapshot.",
    "",
    "## Prose Quality Carry-Forward",
    "",
    "Sections 2, 3, and 19 of the normal prose-quality instructions are carried forward by reference; this maintenance plan does not author new fictional scene prose.",
    ""
  ].join("\n");
}
