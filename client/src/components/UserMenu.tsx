import { useEffect, useRef, useState } from "react";
import type { Notification, User } from "../types";
import * as api from "../api";
import { IconLogOut } from "./Icons";
import { colorForKey } from "../palette";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Props = {
  user: User;
  onLogout: () => void;
};

export default function UserMenu({ user, onLogout }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const list = await api.getNotifications();
      setNotifications(list);
    } catch {
      // transient network errors shouldn't break the header
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      // ignore
    }
  }

  async function handleItemClick(n: Notification) {
    if (n.read) return;
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    try {
      await api.markNotificationRead(n.id);
    } catch {
      // ignore
    }
  }

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={handleToggle}
        title={user.name}
        aria-label="Account and notifications"
      >
        <span className="user-chip-avatar" style={{ background: colorForKey(user.id) }}>
          {user.name.charAt(0).toUpperCase()}
        </span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-all" onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="empty-hint">No notifications yet.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notification-item ${n.read ? "" : "unread"}`}
                  onClick={() => handleItemClick(n)}
                >
                  <span className="notification-message">{n.message}</span>
                  <span className="notification-time">{timeAgo(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="user-menu-footer">
            <button type="button" className="user-menu-logout" onClick={onLogout}>
              <IconLogOut size={13} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
