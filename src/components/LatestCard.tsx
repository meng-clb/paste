import type { Clip } from '../types';

type LatestCardProps = {
  clip: Clip | null;
};

export default function LatestCard({ clip }: LatestCardProps) {
  return (
    <div className="card">
      <div className="card-title">Latest clip</div>
      {clip ? (
        <div>
          <div className="clip-text">{clip.content}</div>
          <div className="muted">{clip.deviceLabel}</div>
        </div>
      ) : (
        <p className="muted">No clips yet. Sync one to get started.</p>
      )}
    </div>
  );
}
