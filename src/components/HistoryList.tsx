type HistoryClip = {
  id: string;
  content: string;
};

type HistoryListProps = {
  open: boolean;
  clips: HistoryClip[];
  onToggle: () => void;
  onCopy: (text: string) => void;
};

export default function HistoryList({ open, clips, onToggle, onCopy }: HistoryListProps) {
  return (
    <div className="card">
      <div className="card-row">
        <div className="card-title">History</div>
        <button className="btn ghost" onClick={onToggle}>
          {open ? 'Hide' : 'View more'}
        </button>
      </div>
      {open && (
        <ul className="clip-list">
          {clips.map((clip) => (
            <li className="clip-item" key={clip.id}>
              <span className="clip-text">{clip.content}</span>
              <button className="btn ghost" onClick={() => onCopy(clip.content)}>
                Copy
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
