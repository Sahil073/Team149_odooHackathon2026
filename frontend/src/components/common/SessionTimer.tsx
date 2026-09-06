import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';

type SessionTimerProps = {
  onLogout: () => void;
  onNotify?: (message: string) => void;
  initialMinutes?: number;
};

export function SessionTimer({
  onLogout,
  onNotify,
  initialMinutes = 30,
}: SessionTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    const saved = localStorage.getItem('dealflow.sessionExpiry');
    if (saved) {
      const remaining = Math.floor((parseInt(saved, 10) - Date.now()) / 1000);
      if (remaining > 0) return remaining;
    }
    const initialSeconds = initialMinutes * 60;
    localStorage.setItem('dealflow.sessionExpiry', String(Date.now() + initialSeconds * 1000));
    return initialSeconds;
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          localStorage.removeItem('dealflow.sessionExpiry');
          onLogout();
          return 0;
        }
        // Show warning modal when 5 minutes (300s) remain
        if (prev === 300) {
          setShowWarningModal(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onLogout]);

  function extendSession(minutes: number = 30) {
    const newSeconds = minutes * 60;
    setSecondsRemaining(newSeconds);
    localStorage.setItem('dealflow.sessionExpiry', String(Date.now() + newSeconds * 1000));
    setShowWarningModal(false);
    setShowDropdown(false);
    if (onNotify) {
      onNotify(`Session extended by ${minutes} minutes.`);
    }
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCritical = secondsRemaining < 120; // < 2 mins
  const isWarning = secondsRemaining < 300;  // < 5 mins

  return (
    <div className="session-timer-wrapper" style={{ position: 'relative' }}>
      <button
        type="button"
        className={`session-timer-pill ${isCritical ? 'critical' : isWarning ? 'warning' : ''}`}
        onClick={() => setShowDropdown((prev) => !prev)}
        title="Active session remaining. Click to extend."
      >
        {isCritical ? (
          <AlertTriangle size={14} className="timer-icon warning-blink" />
        ) : (
          <Clock size={14} className="timer-icon" />
        )}
        <span className="session-timer-text">
          {formattedTime}
        </span>
        <ChevronDown size={11} className="timer-chevron" />
      </button>

      {/* Session Details Dropdown */}
      {showDropdown && (
        <div className="session-timer-menu">
          <div className="session-menu-header">
            <strong>Session Active</strong>
            <span className="session-tag">Expires in {minutes}m {seconds}s</span>
          </div>
          <p className="session-menu-desc">
            Your login will automatically time out when the counter reaches 00:00 for security compliance.
          </p>
          <div className="session-menu-actions">
            <button
              type="button"
              className="button button-small button-primary"
              onClick={() => extendSession(30)}
            >
              <RefreshCw size={13} /> Extend +30 mins
            </button>
            <button
              type="button"
              className="button button-small"
              onClick={() => extendSession(60)}
            >
              +60 mins
            </button>
          </div>
        </div>
      )}

      {/* Expiry Warning Dialog */}
      {showWarningModal && (
        <div className="session-warning-backdrop">
          <div className="session-warning-dialog">
            <div className="warning-icon-circle">
              <AlertTriangle size={24} color="#e11d48" />
            </div>
            <h3>Session Expiring Soon</h3>
            <p>
              Your session will expire in <strong>{minutes}m {seconds}s</strong> due to inactivity. Would you like to extend your session to stay logged in?
            </p>
            <div className="session-dialog-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={() => extendSession(30)}
              >
                Extend Session (+30 min)
              </button>
              <button
                type="button"
                className="button"
                onClick={() => setShowWarningModal(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
