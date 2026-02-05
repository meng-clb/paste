type SyncPanelProps = {
  value: string;
  status: string | null;
  onChange: (next: string) => void;
  onSync: () => void;
  disabled: boolean;
};

export default function SyncPanel({ value, status, onChange, onSync, disabled }: SyncPanelProps) {
  return (
    <div className="card">
      <div className="card-title">Paste to sync</div>
      <textarea
        placeholder="Paste your text here"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="row">
        <button className="btn" onClick={onSync} disabled={disabled}>
          Sync
        </button>
        {status && <span className="muted">{status}</span>}
      </div>
    </div>
  );
}
