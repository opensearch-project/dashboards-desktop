/**
 * Context menu — right-click handler for messages, connections, indices.
 */
import React, { useState, useEffect, useCallback } from 'react';

export interface MenuItem { label: string; action: () => void; icon?: string; disabled?: boolean; separator?: boolean }
interface Props { items: MenuItem[]; x: number; y: number; onClose: () => void }

export const ContextMenu: React.FC<Props> = ({ items, x, y, onClose }) => {
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener('click', handler);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') onClose(); });
    return () => { document.removeEventListener('click', handler); };
  }, [onClose]);

  return (
    <ul className="context-menu" style={{ position: 'fixed', left: x, top: y }} role="menu">
      {items.map((item, i) =>
        item.separator ? <li key={i} className="context-menu-separator" role="separator" /> : (
          <li key={i} role="menuitem" className={item.disabled ? 'disabled' : ''} onClick={() => { if (!item.disabled) { item.action(); onClose(); } }}>
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            {item.label}
          </li>
        )
      )}
    </ul>
  );
};

export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const show = useCallback((e: React.MouseEvent, items: MenuItem[]) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, items }); }, []);
  const close = useCallback(() => setMenu(null), []);
  return { menu, show, close };
}
