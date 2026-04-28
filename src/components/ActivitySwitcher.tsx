import { Footprints, Waves } from "lucide-react";
import type { ActivityKind } from "../types";

const activities: Array<{ id: ActivityKind; label: string; icon: typeof Footprints }> = [
  { id: "hiking", label: "Hiking", icon: Footprints },
  { id: "kayaking", label: "Kayaking", icon: Waves }
];

export function ActivitySwitcher({
  activeActivity,
  onChange
}: {
  activeActivity: ActivityKind;
  onChange: (activity: ActivityKind) => void;
}) {
  return (
    <div className="activity-switcher" aria-label="Activity">
      {activities.map((activity) => {
        const Icon = activity.icon;
        const selected = activity.id === activeActivity;
        return (
          <button
            aria-pressed={selected}
            className={selected ? "activity-switch active" : "activity-switch"}
            key={activity.id}
            onClick={() => onChange(activity.id)}
            type="button"
          >
            <Icon size={15} aria-hidden="true" />
            {activity.label}
          </button>
        );
      })}
    </div>
  );
}
