import React, { useState, useEffect, useRef } from 'react';
import type { ModelInfo } from '../../core/types';

interface Props {
  onModelSwitch?: (modelId: string) => void;
}

export const ModelSwitcher: React.FC<Props> = ({ onModelSwitch }) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.osd.models
      .list()
      .then(setModels)
      .catch(() => {});
    window.osd.models
      .current()
      .then(setCurrent)
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const switchModel = async (id: string) => {
    await window.osd.models.switch(id);
    setCurrent(id);
    setOpen(false);
    onModelSwitch?.(id);
  };

  const currentModel = models.find((m) => m.id === current);
  const label = currentModel?.displayName ?? current ?? 'No model';

  return (
    <div className="model-switcher" ref={ref}>
      <button
        className="model-pill"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current model: ${label}`}
      >
        <span>{label}</span>
        {currentModel && (
          <span
            className={`model-badge ${currentModel.local ? 'model-badge-local' : 'model-badge-cloud'}`}
          >
            {currentModel.local ? 'local' : 'cloud'}
          </span>
        )}
      </button>

      {open && (
        <ul className="model-dropdown" role="listbox" aria-label="Select model">
          {models.length === 0 ? (
            <li className="model-option" role="status">
              No models available
            </li>
          ) : (
            models.map((m) => (
              <li key={m.id} role="option" aria-selected={m.id === current}>
                <button
                  className={`model-option ${m.id === current ? 'active' : ''}`}
                  onClick={() => switchModel(m.id)}
                >
                  <span className="model-option-name">{m.displayName}</span>
                  <span className="model-option-provider">{m.provider}</span>
                  <span
                    className={`model-badge ${m.local ? 'model-badge-local' : 'model-badge-cloud'}`}
                  >
                    {m.local ? 'local' : 'cloud'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
