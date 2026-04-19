import React, { useState, useEffect, useRef } from 'react';
import type { AuthUser } from '../../core/types';

export const OAuthLogin: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.osd.auth.currentUser().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const login = async (provider: 'github' | 'google') => {
    setLoggingIn(true);
    try {
      const u = provider === 'github'
        ? await window.osd.auth.loginGithub()
        : await window.osd.auth.loginGoogle();
      setUser(u);
    } catch { /* user cancelled or error */ }
    setLoggingIn(false);
  };

  const logout = async () => {
    await window.osd.auth.logout();
    setUser(null);
    setMenuOpen(false);
  };

  if (!user) {
    return (
      <div className="oauth-login">
        <button className="oauth-btn oauth-github" onClick={() => login('github')} disabled={loggingIn} aria-label="Sign in with GitHub">
          <span aria-hidden="true">⬡</span> GitHub
        </button>
        <button className="oauth-btn oauth-google" onClick={() => login('google')} disabled={loggingIn} aria-label="Sign in with Google">
          <span aria-hidden="true">◉</span> Google
        </button>
      </div>
    );
  }

  return (
    <div className="oauth-user" ref={ref}>
      <button className="oauth-avatar-btn" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`${user.name}, account menu`}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt="" className="oauth-avatar" />
          : <span className="oauth-avatar-placeholder">{user.name.charAt(0)}</span>
        }
      </button>
      {menuOpen && (
        <div className="oauth-menu" role="menu">
          <div className="oauth-menu-header">
            <strong>{user.name}</strong>
            <span className="oauth-email">{user.email}</span>
            <span className="oauth-provider">{user.provider}</span>
          </div>
          <button className="oauth-menu-item" role="menuitem" onClick={logout}>Sign out</button>
        </div>
      )}
    </div>
  );
};
