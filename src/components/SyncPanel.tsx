type SyncPanelProps = {
  onSync: () => void;
  disabled: boolean;
};

export default function SyncPanel({ onSync, disabled }: SyncPanelProps) {
  return (
    <div className="card">
      <div className="card-title">Paste to sync</div>
      <textarea placeholder="Paste your text here" rows={5} />
      <button className="btn" onClick={onSync} disabled={disabled}>
        Sync
      </button>
    </div>
  );
}
