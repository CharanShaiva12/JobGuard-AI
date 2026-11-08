/**
 * JobGuard AI - Navigation Bar Component
 * Module: frontend.src.components.common.Navbar
 * Features:
 *   - Responsive Apple-styled navigation with theme variables
 *   - Live system status telemetry indicator (SystemStatusBadge)
 *   - Clean links: Scan, Dashboard, Intelligence, History, Analytics, Account, (Admin)
 *   - Theme and display mode picker button
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../../types';

interface NavbarProps {
  user: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenThemeModal: () => void;
  onOpenSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onOpenThemeModal,
  onOpenSidebar,
}) => {
  const location = useLocation();

  const navLinks = [
    { name: 'Scan', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Threat Intel', path: '/intelligence' },
    { name: 'History', path: '/history' },
  ];

  if (user) {
    navLinks.push({ name: 'Analytics', path: '/analytics' });
    navLinks.push({ name: 'My Account', path: '/account' });
  }

  if (user?.role === 'admin') {
    navLinks.push({ name: 'Models', path: '/models' });
    navLinks.push({ name: 'Admin', path: '/admin' });
  }

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left section: Consistent Three-Line Menu Button + Clickable Brand Logo */}
          <div className="flex items-center space-x-2.5">
            {/* Always Visible Three-Line Menu Button */}
            <button
              type="button"
              onClick={onOpenSidebar}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] rounded-xl border border-transparent hover:border-[var(--border-subtle)] transition-colors"
              aria-label="Open Navigation Sidebar"
              title="Open Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Clickable Brand Logo */}
            <Link to="/" className="flex items-center space-x-2.5 group" aria-label="JobGuard AI Home">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-canvas)] flex items-center justify-center border border-[var(--border-strong)] group-hover:border-[var(--accent-primary)] transition-colors">
                <svg
                  className="w-4 h-4 text-[var(--accent-primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
                  JobGuard <span className="text-[var(--accent-primary)]">AI</span>
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] leading-none hidden sm:block">
                  Spot Fake Jobs &amp; Internships Before You Apply.
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Controls: Theme Picker & Auth */}
          <div className="flex items-center space-x-2">
            {/* Theme & Display Modal Button */}
            <button
              type="button"
              onClick={onOpenThemeModal}
              title="Personalize theme and appearance"
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] rounded-xl border border-transparent hover:border-[var(--border-subtle)] transition-colors"
              aria-label="Theme settings"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4 4 4 0 014-4c.8 0 1.5.2 2.2.6C9.6 11 11.6 9 14 9c3.3 0 6 2.7 6 6 0 1.1-.3 2.1-.8 3H7z" />
              </svg>
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <Link
                  to="/account"
                  className="text-xs text-[var(--text-primary)] hover:text-[var(--accent-primary)] hidden sm:inline font-semibold px-2 py-1 rounded-lg hover:bg-[var(--bg-canvas)] transition-colors"
                  title="Manage account & profile"
                >
                  {user.username}
                </Link>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-strong)] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-canvas)] rounded-xl transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-xl transition-colors shadow-sm"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
