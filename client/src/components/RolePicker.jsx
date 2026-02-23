const ROLES = [
  { value: "A", label: "Speaker A" },
  { value: "B", label: "Speaker B" },
  { value: "AUDIENCE", label: "Audience" }
];

export default function RolePicker({ currentRole, participants, onPick, disabled }) {
  const taken = new Set(
    participants.filter((p) => p.role === "A" || p.role === "B").map((p) => p.role)
  );

  return (
    <div className="role-picker">
      {ROLES.map((r) => {
        const isTaken = (r.value === "A" || r.value === "B") && taken.has(r.value) && currentRole !== r.value;
        const isActive = currentRole === r.value;

        return (
          <button
            key={r.value}
            className={`role-btn ${isActive ? "active" : ""}`}
            disabled={disabled || isTaken}
            onClick={() => onPick(r.value)}
          >
            {r.label}
            {isTaken && " (taken)"}
          </button>
        );
      })}
    </div>
  );
}
