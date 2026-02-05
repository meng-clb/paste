import type { Clip } from '../types';

type LatestCardProps = {
  clip: Clip | null;
  onCopy: (text: string) => void;
};

export default function LatestCard({ clip, onCopy }: LatestCardProps) {
  return (
    <div className="card">
      <div className="card-title">Latest clip</div>
      {clip ? (
        <div>
          <div className="clip-text">{clip.content}</div>
          <div className="row">
            <span className="muted">{clip.deviceLabel}</span>
            <button className="btn ghost" onClick={() => onCopy(clip.content)}>
              Copy
            </button>
          </div>
        </div>
      ) : (
        <p className="muted">No clips yet. Sync one to get started.</p>
      )}
    </div>
  );
}
