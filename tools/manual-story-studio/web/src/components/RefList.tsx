import {
  MANUAL_RECORD_CLASSES,
  MANUAL_RECORD_CLASS_PREFIXES,
  type ManualRecordClass,
  type RecordRefs,
} from "../types/manual-story.js";

export interface RefListProps {
  refs: RecordRefs;
  onRefClick: (recordClass: ManualRecordClass, id: string) => void;
}

function classFromId(id: string): ManualRecordClass | null {
  for (const cls of MANUAL_RECORD_CLASSES) {
    const prefix = MANUAL_RECORD_CLASS_PREFIXES[cls];
    if (id.startsWith(`${prefix}-`)) return cls;
  }
  return null;
}

function Section(props: {
  title: string;
  ids: string[];
  fallbackClass: ManualRecordClass | null;
  onRefClick: (cls: ManualRecordClass, id: string) => void;
}) {
  if (props.ids.length === 0) {
    return (
      <div>
        <h4 style={{ margin: "8px 0 2px" }}>{props.title}</h4>
        <p style={{ margin: 0, color: "#666", fontSize: 12 }}>none</p>
      </div>
    );
  }
  return (
    <div>
      <h4 style={{ margin: "8px 0 2px" }}>{props.title}</h4>
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {props.ids.map((id) => {
          const cls = classFromId(id) ?? props.fallbackClass;
          if (!cls) {
            return (
              <li key={id} style={{ color: "#b00" }}>
                {id} (unknown class)
              </li>
            );
          }
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => props.onRefClick(cls, id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0366d6",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {id}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RefList(props: RefListProps) {
  return (
    <section className="manual-record-refs">
      <Section
        title="Characters"
        ids={props.refs.characters}
        fallbackClass="cast"
        onRefClick={props.onRefClick}
      />
      <Section
        title="Locations"
        ids={props.refs.locations}
        fallbackClass="locations"
        onRefClick={props.onRefClick}
      />
      <Section
        title="Related"
        ids={props.refs.related_records}
        fallbackClass={null}
        onRefClick={props.onRefClick}
      />
    </section>
  );
}
