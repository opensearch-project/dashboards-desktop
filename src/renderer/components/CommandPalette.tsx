import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ModelInfo } from '../../core/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
}

export const CommandPalette: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [current, setCurrent] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    window.osd.models.list().then(setModels).catch(() => {});
    window.osd.models.current().then(setCurrent).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const filtered = query
    ? models.filter(m => m.displayName.toLowerCase().includes(query.toLowerCase()) || m.provider.toLowerCase().includes(query.toLowerCase()))
    : models;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { onSelect(filtered[selected].id); onClose(); }
    if (e.key === 'Escape') onClose();
  }, [filtered, selected, onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="palette-overlay" role="presentation" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Switch model">
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Switch model…"
          aria-label="Search models"
          aria-activedescendant={filtered[selected] ? `palette-${filtered[selected].id}` : undefined}
        />
        <ul className="palette-list" role="listbox">
          {filtered.length === 0 ? (
            <li className="palette-empty" role="status">No matching models</li>
          ) : (
            filtered.map((m, i) => (
              <li
                key={m.id}
                id={`palette-${m.id}`}
                role="option"
                aria-selected={i === selected}
                className={`palette-item ${i === selected ? 'selected' : ''} ${m.id === current ? 'current' : ''}`}
                onClick={() => { onSelect(m.id); onClose(); }}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="palette-item-name">{m.displayName}</span>
                <span className="palette-item-provider">{m.provider}</span>
                <span className={`model-badge ${m.local ? 'model-badge-local' : 'model-badge-cloud'}`}>
                  {m.local ? 'local' : 'cloud'}
                </span>
                {m.id === current && <span className="palette-current">current</span>}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
