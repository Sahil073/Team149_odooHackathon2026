import { Sparkles, TrendingUp, AlertCircle, RefreshCw, Zap } from 'lucide-react';

export type WinPredictionData = {
  winProbability: number; // 0.0 - 1.0 or 0 - 100
  status: 'HIGH' | 'MODERATE' | 'AT_RISK' | string;
  confidence?: number;
  keyDriver?: string;
  recommendedDiscountPct?: number;
};

type DealWinRateCardProps = {
  data: WinPredictionData | null;
  loading?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
};

export function DealWinRateCard({ data, loading = false, onRefresh, compact = false }: DealWinRateCardProps) {
  if (loading && !data) {
    return (
      <div className="deal-win-card" style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px dashed rgba(99, 102, 241, 0.3)', textAlign: 'center' }}>
        <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px', color: '#6366f1' }} />
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
          Computing ML Win Probability...
        </p>
      </div>
    );
  }

  // Normalize probability to 0-100 percentage
  const rawProb = data?.winProbability ?? 0.50;
  const pct = rawProb <= 1.0 ? Math.round(rawProb * 100) : Math.round(rawProb);

  const isHigh = pct >= 70;
  const isModerate = pct >= 45 && pct < 70;

  const accentColor = isHigh ? '#10b981' : isModerate ? '#f59e0b' : '#ef4444';
  const bgColor = isHigh ? 'rgba(16, 185, 129, 0.08)' : isModerate ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)';
  const borderColor = isHigh ? 'rgba(16, 185, 129, 0.25)' : isModerate ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)';
  const statusLabel = isHigh ? 'HIGH PROPENSITY' : isModerate ? 'MODERATE PROBABILITY' : 'AT-RISK DEAL';

  if (compact) {
    return (
      <div
        className="deal-win-card-compact"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          borderRadius: '8px',
          background: bgColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        <Sparkles size={16} style={{ color: accentColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: accentColor, letterSpacing: '0.05em' }}>
              ML WIN PROBABILITY
            </span>
            <strong style={{ fontSize: '0.9rem', color: accentColor }}>{pct}%</strong>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.08)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: accentColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="deal-win-rate-panel"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
        marginTop: '16px',
        position: 'relative',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: accentColor }}>
              AI Deal Win Predictor
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
              Trained on DealFlow360 B2B Conversion Engine
            </span>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Recalculate AI Score"
            disabled={loading}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        )}
      </div>

      {/* Main Score Display */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: accentColor, lineHeight: 1 }}>
          {pct}%
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '12px',
            background: isHigh ? 'rgba(16, 185, 129, 0.15)' : isModerate ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: accentColor,
          }}
        >
          {statusLabel}
        </span>
        {data?.confidence && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)', marginLeft: 'auto' }}>
            Confidence: {Math.round(data.confidence * 100)}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor})`,
            borderRadius: '3px',
            transition: 'width 0.5s ease-in-out',
          }}
        />
      </div>

      {/* Key Driver Insight */}
      {data?.keyDriver && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.8rem', color: 'var(--text-primary, #1e293b)', lineHeight: '1.35', marginBottom: '8px' }}>
          {isHigh ? (
            <TrendingUp size={15} style={{ color: accentColor, flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <AlertCircle size={15} style={{ color: accentColor, flexShrink: 0, marginTop: '2px' }} />
          )}
          <span>{data.keyDriver}</span>
        </div>
      )}

      {/* Actionable Sweet Spot Recommendation */}
      {data?.recommendedDiscountPct !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.7)',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: 'var(--text-primary, #334155)',
            marginTop: '8px',
          }}
        >
          <Zap size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
          <span>
            <strong>AI Optimization:</strong> Recommended discount sweet-spot is <strong>{data.recommendedDiscountPct}%</strong> to maximize gross profit.
          </span>
        </div>
      )}
    </div>
  );
}

