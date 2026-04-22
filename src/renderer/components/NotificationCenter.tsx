/**
 * Notification center — bell icon with event list.
 */
import React, { useState } from 'react';

export interface Notification { id: string; message: string; type: 'info' | 'warning' | 'error'; read: boolean; timestamp: string }
interface Props { notifications: Notification[]; onMarkRead: (id: string) => void; onClear: () => void }

export const NotificationCenter: React.FC<Props> = ({ notifications, onMarkRead, onClear }) => {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="notification-center">
      <button className="notification-bell" onClick={() => setOpen(!open)} aria-label={`Notifications (${unread} unread)`}>
        🔔{unread > 0 && <span className="notification-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-header">
            <span>Notifications</span>
            <button onClick={onClear} aria-label="Clear all">Clear</button>
          </div>
          <ul className="notification-list">
            {notifications.length === 0 && <li className="notification-empty">No notifications</li>}
            {notifications.map((n) => (
              <li key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`} onClick={() => onMarkRead(n.id)}>
                <span className={`notification-type notification-${n.type}`}>{n.type === 'error' ? '❌' : n.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span className="notification-msg">{n.message}</span>
                <span className="notification-time">{n.timestamp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
