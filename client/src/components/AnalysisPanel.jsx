import { useState } from "react";

const TABS = ["Scores", "Fallacies", "Bias", "Claims"];

export default function AnalysisPanel({ analysis, onRewriteNeutral, rewrite }) {
  const [activeTab, setActiveTab] = useState("Scores");

  if (!analysis) {
    return (
      <section className="analysis-panel">
        <h3>Analysis</h3>
        <p className="analysis-empty">Click a message to view its analysis</p>
      </section>
    );
  }

  return (
    <section className="analysis-panel">
      <h3>Analysis</h3>

      <div className="analysis-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`analysis-tab ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="analysis-content">
        {activeTab === "Scores" && <ScoresTab analysis={analysis} />}
        {activeTab === "Fallacies" && <FallaciesTab fallacies={analysis.fallacies} />}
        {activeTab === "Bias" && (
          <BiasTab
            biasFlags={analysis.biasFlags}
            onRewriteNeutral={onRewriteNeutral}
            rewrite={rewrite}
          />
        )}
        {activeTab === "Claims" && <ClaimsTab claims={analysis.claims} links={analysis.links} />}
      </div>
    </section>
  );
}

function ScoresTab({ analysis }) {
  return (
    <div className="scores-tab">
      <div className="score-bar">
        <div className="score-label">Logic</div>
        <div className="score-track">
          <div className="score-fill logic" style={{ width: `${analysis.logicScore}%` }} />
        </div>
        <div className="score-value">{analysis.logicScore}</div>
      </div>
      <div className="score-bar">
        <div className="score-label">Persuasion</div>
        <div className="score-track">
          <div className="score-fill persuasion" style={{ width: `${analysis.persuasionScore}%` }} />
        </div>
        <div className="score-value">{analysis.persuasionScore}</div>
      </div>
    </div>
  );
}

function FallaciesTab({ fallacies }) {
  if (fallacies.length === 0) {
    return <p className="tab-empty">No fallacies detected</p>;
  }

  return (
    <ul className="analysis-list">
      {fallacies.map((f, i) => (
        <li key={i} className={`analysis-item severity-${f.severity}`}>
          <div className="item-header">
            <strong>{f.type}</strong>
            <span className={`severity-badge ${f.severity}`}>{f.severity}</span>
          </div>
          <p className="item-explanation">{f.explanation}</p>
          {f.quote && <blockquote className="item-quote">"{f.quote}"</blockquote>}
          {f.suggestion && <p className="item-suggestion">Suggestion: {f.suggestion}</p>}
        </li>
      ))}
    </ul>
  );
}

function BiasTab({ biasFlags, onRewriteNeutral, rewrite }) {
  if (biasFlags.length === 0) {
    return <p className="tab-empty">No bias detected</p>;
  }

  return (
    <div>
      <ul className="analysis-list">
        {biasFlags.map((b, i) => (
          <li key={i} className={`analysis-item severity-${b.severity}`}>
            <div className="item-header">
              <strong>{b.type}</strong>
              <span className={`severity-badge ${b.severity}`}>{b.severity}</span>
            </div>
            <p className="item-explanation">{b.explanation}</p>
            {b.quote && <blockquote className="item-quote">"{b.quote}"</blockquote>}
            {b.neutralRewrite && <p className="item-suggestion">Neutral: {b.neutralRewrite}</p>}
          </li>
        ))}
      </ul>

      {onRewriteNeutral && (
        <div className="rewrite-section">
          <button className="rewrite-btn" onClick={onRewriteNeutral}>
            Rewrite Neutrally
          </button>
          {rewrite && (
            <div className="rewrite-result">
              <h4>Neutral Rewrite</h4>
              <p className="rewrite-text">{rewrite}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ClaimsTab({ claims, links }) {
  if (claims.length === 0) {
    return <p className="tab-empty">No claims extracted</p>;
  }

  return (
    <div>
      <ul className="analysis-list">
        {claims.map((c) => (
          <li key={c.id} className="analysis-item claim-card">
            <div className="item-header">
              <strong>{c.id}</strong>
              <span className={`stance-badge stance-${c.stance}`}>{c.stance}</span>
            </div>
            <p className="item-explanation">{c.text}</p>
            {c.evidenceSnippets && c.evidenceSnippets.length > 0 ? (
              <div className="evidence-list">
                {c.evidenceSnippets.map((snippet, idx) => (
                  <blockquote key={idx} className="evidence-snippet">"{snippet}"</blockquote>
                ))}
              </div>
            ) : (
              <p className="no-evidence">This claim lacks evidence</p>
            )}
          </li>
        ))}
      </ul>
      {links.length > 0 && (
        <div className="links-section">
          <h4>Links</h4>
          <ul className="analysis-list">
            {links.map((l, i) => (
              <li key={i} className="analysis-item link-item">
                <span>{l.sourceClaimId}</span>
                <span className={`link-relation ${l.relation}`}>{l.relation}</span>
                <span>{l.targetClaimId}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
