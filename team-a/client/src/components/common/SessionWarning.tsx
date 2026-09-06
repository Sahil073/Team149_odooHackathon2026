import { AlertTriangle, Clock, LogOut, RefreshCw } from 'lucide-react';

type SessionWarningProps = {
  timeLeft: string;   // formatted "mm:ss"
  onExtend: () => void;
  onLogout: () => void;
};

export function SessionWarning({ timeLeft, onExtend, onLogout }: SessionWarningProps) {
  return (
    <div className="session-overlay" role="alertdialog" aria-modal="true" aria-labelledby="session-warning-title">
      <div className="session-modal">
        {/* Animated ring */}
        <div className="session-icon-ring">
          <AlertTriangle size={28} strokeWidth={1.8} />
        </div>

        <div className="session-content">
          <h2 id="session-warning-title">Your session is expiring</h2>
          <p>
            For your security, this workspace will automatically sign you out in
          </p>
          <div className="session-countdown" aria-live="polite" aria-atomic="true">
            <Clock size={16} />
            <span>{timeLeft}</span>
          </div>
          <p className="session-sub">
            Any unsaved work will be preserved in your drafts.
          </p>
        </div>

        <div className="session-actions">
          <button
            id="session-extend-button"
            className="button button-primary"
            onClick={onExtend}
            autoFocus
          >
            <RefreshCw size={15} />
            Stay signed in
          </button>
          <button
            id="session-logout-button"
            className="button"
            onClick={onLogout}
          >
            <LogOut size={15} />
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
