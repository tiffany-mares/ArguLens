import { useMemo, useState } from "react";

const RELATION_LABELS = {
  supports: "supports",
  attacks: "attacks",
  rebuts: "rebuts"
};

const STANCE_COLORS = {
  pro: "#22c55e",
  con: "#f43f5e",
  neutral: "#888"
};

const FILTER_OPTIONS = ["all", "supports", "attacks", "rebuts"];

function buildClaimsIndex(analysisByMessageId, messages) {
  const globalClaims = new Map();
  const globalLinks = [];
  const idRemap = new Map();

  for (const msg of messages) {
    const analysis = analysisByMessageId[msg.id];
    if (!analysis) continue;

    analysis.claims.forEach((claim, idx) => {
      const stableId = `${msg.id}_c${idx}`;
      idRemap.set(`${msg.id}:${claim.id}`, stableId);

      globalClaims.set(stableId, {
        id: stableId,
        originalId: claim.id,
        text: claim.text,
        stance: claim.stance,
        evidenceSnippets: claim.evidenceSnippets || [],
        speakerRole: msg.speakerRole,
        messageId: msg.id
      });
    });
  }

  for (const msg of messages) {
    const analysis = analysisByMessageId[msg.id];
    if (!analysis) continue;

    for (const link of analysis.links) {
      const sourceId = idRemap.get(`${msg.id}:${link.sourceClaimId}`);

      let targetId = idRemap.get(`${msg.id}:${link.targetClaimId}`);
      if (!targetId) {
        for (const [key, val] of idRemap) {
          if (key.endsWith(`:${link.targetClaimId}`)) {
            targetId = val;
            break;
          }
        }
      }

      if (sourceId && targetId) {
        globalLinks.push({
          sourceClaimId: sourceId,
          targetClaimId: targetId,
          relation: link.relation
        });
      }
    }
  }

  return { globalClaims, globalLinks };
}

export default function RhetoricalMap({ analysisByMessageId, messages, onScrollToMessage }) {
  const [filter, setFilter] = useState("all");

  const { globalClaims, globalLinks } = useMemo(
    () => buildClaimsIndex(analysisByMessageId, messages),
    [analysisByMessageId, messages]
  );

  const claimsList = Array.from(globalClaims.values());

  const filteredLinks = useMemo(
    () => filter === "all" ? globalLinks : globalLinks.filter((l) => l.relation === filter),
    [globalLinks, filter]
  );

  const claimsA = claimsList.filter((c) => c.speakerRole === "A");
  const claimsB = claimsList.filter((c) => c.speakerRole === "B");

  if (claimsList.length === 0) {
    return (
      <div className="rhetorical-map empty">
        <p>Claims will appear here as the debate progresses</p>
      </div>
    );
  }

  function handleNodeClick(messageId) {
    if (onScrollToMessage) onScrollToMessage(messageId);
  }

  function renderClaimNode(claim) {
    const outgoing = filteredLinks.filter((l) => l.sourceClaimId === claim.id);
    const incoming = filteredLinks.filter((l) => l.targetClaimId === claim.id);

    return (
      <div
        key={claim.id}
        className="map-node clickable"
        onClick={() => handleNodeClick(claim.messageId)}
        title="Click to scroll to message"
      >
        <div className="map-node-header">
          <span
            className="map-node-dot"
            style={{ background: STANCE_COLORS[claim.stance] }}
          />
          <span className="map-node-id">{claim.originalId}</span>
          <span className="map-node-stance" style={{ color: STANCE_COLORS[claim.stance] }}>
            {claim.stance}
          </span>
        </div>
              <p className="map-node-text">{claim.text}</p>
              {claim.evidenceSnippets.length > 0 ? (
                <div className="map-evidence">
                  {claim.evidenceSnippets.map((s, i) => (
                    <blockquote key={i} className="evidence-snippet">"{s}"</blockquote>
                  ))}
                </div>
              ) : (
                <p className="no-evidence">No evidence</p>
              )}

              {outgoing.length > 0 && (
          <div className="map-edges">
            {outgoing.map((link, i) => {
              const target = globalClaims.get(link.targetClaimId);
              return (
                <div key={i} className={`map-edge ${link.relation}`}>
                  <span className="edge-arrow">
                    {link.relation === "supports" ? "+" : link.relation === "attacks" ? "x" : "~"}
                  </span>
                  <span className="edge-relation">{RELATION_LABELS[link.relation]}</span>
                  <span className="edge-target">
                    {target ? target.text : link.targetClaimId}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {incoming.length > 0 && (
          <div className="map-edges incoming">
            {incoming.map((link, i) => {
              const source = globalClaims.get(link.sourceClaimId);
              return (
                <div key={i} className={`map-edge ${link.relation}`}>
                  <span className="edge-arrow">
                    {link.relation === "supports" ? "+" : link.relation === "attacks" ? "x" : "~"}
                  </span>
                  <span className="edge-from">
                    from {source ? source.originalId : link.sourceClaimId}
                  </span>
                  <span className="edge-relation">{RELATION_LABELS[link.relation]}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rhetorical-map">
      <div className="map-header">
        <h3>Rhetorical Map ({claimsList.length})</h3>
        <div className="map-filters">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              className={`map-filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="map-grouped">
        {claimsA.length > 0 && (
          <div className="map-group">
            <h4 className="map-group-label speaker-a-label">Speaker A ({claimsA.length})</h4>
            <div className="map-list">
              {claimsA.map(renderClaimNode)}
            </div>
          </div>
        )}

        {claimsB.length > 0 && (
          <div className="map-group">
            <h4 className="map-group-label speaker-b-label">Speaker B ({claimsB.length})</h4>
            <div className="map-list">
              {claimsB.map(renderClaimNode)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
