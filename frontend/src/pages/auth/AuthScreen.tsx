import { ArrowRight, BarChart3, Check, Globe2, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { BrandMark } from '../../components/BrandMark';
import type { Role } from '../../types';

type AuthScreenProps = {
  role: Role;
  authMode: 'login' | 'signup';
  authMessage: string;
  onRoleChange: (role: Role) => void;
  onAuthModeChange: (mode: 'login' | 'signup') => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function AuthScreen({
  role,
  authMode,
  authMessage,
  onRoleChange,
  onAuthModeChange,
  onSubmit,
}: AuthScreenProps) {
  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="auth-visual-top">
          <BrandMark light />
          <span className="auth-version">Sales operations / v1</span>
        </div>
        <div className="auth-visual-content">
          <span className="eyebrow eyebrow-light">THE OPERATING SYSTEM FOR BETTER DEALS</span>
          <h1>
            Move every deal<br />
            <em>forward.</em>
          </h1>
          <p>One workspace for your team to build, govern, and close high-value quotations.</p>
          <div className="auth-flow">
            <div className="flow-line" />
            {[
              ['01', 'Build', 'Create a quote in minutes'],
              ['02', 'Govern', 'Route risk to the right owner'],
              ['03', 'Close', 'Turn approval into momentum'],
            ].map(([number, title, detail]) => (
              <div className="flow-step" key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-visual-footer">
          <span>© 2024 DealFlow360</span>
          <span className="auth-footer-dot" />
          <span>Built for modern sales teams</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <BrandMark />
          </div>
          <div className="auth-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>
              {authMode === 'login'
                ? 'Sign in to your workspace'
                : 'Create your workspace account'}
            </h2>
            <p>Access your team&apos;s sales operations workspace.</p>
          </div>

          <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
            <button
              className={authMode === 'login' ? 'auth-toggle-active' : ''}
              onClick={() => onAuthModeChange('login')}
            >
              Log in
            </button>
            <button
              className={authMode === 'signup' ? 'auth-toggle-active' : ''}
              onClick={() => onAuthModeChange('signup')}
            >
              Sign up
            </button>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {authMode === 'signup' && (
              <div className="field-row">
                <label className="field">
                  <span>First name</span>
                  <input name="firstName" type="text" placeholder="Aisha" required />
                </label>
                <label className="field">
                  <span>Last name</span>
                  <input name="lastName" type="text" placeholder="Khan" required />
                </label>
              </div>
            )}
            <label className="field">
              <span>{authMode === 'login' ? 'Username or Work email' : 'Work email'}</span>
              <input
                name="email"
                type={authMode === 'login' ? 'text' : 'email'}
                placeholder={authMode === 'login' ? 'Username or you@company.com' : 'you@company.com'}
                autoComplete={authMode === 'login' ? 'username' : 'email'}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                placeholder="••••••••••••"
                autoComplete={
                  authMode === 'login' ? 'current-password' : 'new-password'
                }
                minLength={6}
                required
              />
            </label>

            <div className="role-heading">
              <div>
                <span className="field-label">Continue as</span>
                <small>Select your workspace role</small>
              </div>
              {authMode === 'login' && (
                <button type="button" className="text-button">
                  Forgot password?
                </button>
              )}
            </div>
            <div className="role-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {(
                [
                  {
                    value: 'sales-rep',
                    label: 'Sales rep',
                    detail: 'Sales workspace',
                    icon: BarChart3,
                  },
                  {
                    value: 'manager',
                    label: 'Approver',
                    detail: 'Manager review',
                    icon: ShieldCheck,
                  },
                  {
                    value: 'admin',
                    label: 'Admin',
                    detail: 'Configuration',
                    icon: UsersRound,
                  },
                  {
                    value: 'customer',
                    label: 'Customer',
                    detail: 'Portal negotiation',
                    icon: Globe2,
                  },
                ] as Array<{
                  value: Role;
                  label: string;
                  detail: string;
                  icon: typeof BarChart3;
                }>
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.value}
                    className={`role-card ${
                      role === item.value ? 'role-card-selected' : ''
                    }`}
                    onClick={() => onRoleChange(item.value)}
                  >
                    <span className="role-icon">
                      <Icon size={17} />
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <span className="role-radio">
                      {role === item.value && <span />}
                    </span>
                  </button>
                );
              })}
            </div>
            {authMessage && (
              <div className="auth-message">
                <Sparkles size={16} />
                <span>{authMessage}</span>
              </div>
            )}
            <button className="button button-primary auth-submit" type="submit">
              {authMode === 'login' ? 'Continue to workspace' : 'Create account'}
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="auth-legal">
            By continuing, you agree to our{' '}
            <a href="#terms">Terms of Service</a> and{' '}
            <a href="#privacy">Privacy Policy</a>.
          </p>
          <div className="auth-trust">
            <span>
              <Check size={14} /> SSO ready
            </span>
            <span>
              <Check size={14} /> Role-based access
            </span>
            <span>
              <Check size={14} /> Secure workspace
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
