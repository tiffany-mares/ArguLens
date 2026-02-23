export default function SummaryModal({ summary, onClose }) {
  const winnerLabel =
    summary.winner === "A"
      ? "Speaker A Wins"
      : summary.winner === "B"
        ? "Speaker B Wins"
        : "It's a Tie";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          &times;
        </button>

        <div className="summary-winner">
          <h2>{winnerLabel}</h2>
          <div className="quality-score">
            <span className="quality-label">Debate Quality</span>
            <span className="quality-value">{summary.overallQualityScore}/100</span>
          </div>
        </div>

        <div className="summary-bullets">
          <h3>Summary</h3>
          <ul>
            {summary.summaryBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        <div className="summary-columns">
          <div className="summary-col speaker-a-col">
            <h3>Speaker A</h3>
            <h4>Strongest Points</h4>
            <ul>
              {summary.bestPointsA.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <h4>How to Improve</h4>
            <ul>
              {summary.improvementTipsA.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>

          <div className="summary-col speaker-b-col">
            <h3>Speaker B</h3>
            <h4>Strongest Points</h4>
            <ul>
              {summary.bestPointsB.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            <h4>How to Improve</h4>
            <ul>
              {summary.improvementTipsB.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

        {summary.commonFallacies.length > 0 && (
          <div className="summary-fallacies">
            <h3>Top Fallacies Spotted</h3>
            <div className="fallacy-tags">
              {summary.commonFallacies.map((f, i) => (
                <span key={i} className="fallacy-tag">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
