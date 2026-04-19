import React, { useState, useEffect } from 'react';
import type { PinnedMessage } from '../../core/types';

interface Props {
  conversationId: string | null;
  onClose: () => void;
  onUnpin: (messageId: string) => void;
}

export const PinnedMessages: React.FC<Props> = ({ conversationId, onClose, onUnpin }) => {
  const [pins, setPins] = useState<PinnedMessage[]>([]);

  useEffect(() => {
    if (!conversationId) return;
    window.osd.messages
      .listPinned(conversationId)
      .then(setPins)
      .catch(() => {});
  }, [conversationId]);

  return (
    <div className="pinned-panel" role="complementary" aria-label="Pinned messages">
      <header className="pinned-header">
        <h3>Pinned Messages ({pins.length})</h3>
        <button className="btn-icon-sm" onClick={onClose} aria-label="Close pinned messages">
          ✕
        </button>
      </header>
      {pins.length === 0 ? (
        <p className="pinned-empty" role="status">
          No pinned messages
        </p>
      ) : (
        <ul className="pinned-list" role="list">
          {pins.map((p) => (
            <li key={p.message_id} className="pinned-item">
              <span className="pinned-role">{p.role}</span>
              <p className="pinned-content">
                {p.content.slice(0, 200)}
                {p.content.length > 200 ? '…' : ''}
              </p>
              <button
                className="btn-icon-sm"
                onClick={() => onUnpin(p.message_id)}
                aria-label="Unpin"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
