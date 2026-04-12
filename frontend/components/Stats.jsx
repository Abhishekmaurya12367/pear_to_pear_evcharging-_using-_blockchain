// Defines window.StatsView
window.StatsView = function StatsView({ platformStats, userStats, userSelf }) {
  if (!platformStats) return <div className="card">Loading platform stats...</div>;

  return (
    <div className="stack">
      <div className="grid">
        <div className="card">
          <h2>📊 Platform Overview</h2>
          <div className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Total Sessions:</span>
              <span className="mono font-bold">{platformStats.totalSessions}</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Completed:</span>
              <span className="mono status COMPLETED">{platformStats.completedSessions}</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Failed:</span>
              <span className="mono status FAILED">{platformStats.failedSessions}</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Disputed:</span>
              <span className="mono status DISPUTED">{platformStats.disputedSessions}</span>
            </div>
            <div className="divider" />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Total Energy:</span>
              <span className="mono">{platformStats.totalEnergyTraded} Wh</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Fees Collected:</span>
              <span className="mono">{(Number(platformStats.totalFeesCollected) / 1e18).toFixed(6)} ETH</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>👤 My Profile Stats</h2>
          <div className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Reputation Score:</span>
              <span className="mono" style={{ color: "var(--accent-2)", fontWeight: "bold" }}>⭐ {userSelf?.reputation || 0}</span>
            </div>
            <div className="divider" />
            {userStats ? (
              <>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Total Sessions:</span>
                  <span className="mono">{userStats.totalSessions}</span>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Successful:</span>
                  <span className="mono status COMPLETED">{userStats.completedSessions}</span>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted">Energy Traded:</span>
                  <span className="mono">{userStats.totalEnergyTraded} Wh</span>
                </div>
              </>
            ) : (
              <p className="muted small">Connect wallet to see stats</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
