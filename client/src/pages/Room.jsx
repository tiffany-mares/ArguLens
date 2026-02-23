import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { send, onMessage } from "../lib/ws";
import ChatFeed from "../components/ChatFeed";
import MessageInput from "../components/MessageInput";
import RolePicker from "../components/RolePicker";
import AnalysisPanel from "../components/AnalysisPanel";
import RhetoricalMap from "../components/RhetoricalMap";
import SummaryModal from "../components/SummaryModal";
import "./Room.css";

export default function Room() {
  const { roomId } = useParams();
  const [roomState, setRoomState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [analysisByMessageId, setAnalysisByMessageId] = useState({});
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [scrollToMessageId, setScrollToMessageId] = useState(null);
  const [rewriteByMessageId, setRewriteByMessageId] = useState({});

  useEffect(() => {
    const unsub = onMessage((msg) => {
      switch (msg.type) {
        case "ROOM_STATE":
          setRoomState(msg.payload);
          break;
        case "MESSAGE_RECEIVED":
          setMessages((prev) => [...prev, msg.payload.message]);
          break;
        case "ANALYSIS_RESULT":
          setAnalysisByMessageId((prev) => ({
            ...prev,
            [msg.payload.messageId]: msg.payload.analysis
          }));
          break;
        case "DEBATE_ENDED":
          setRoomState((prev) => (prev ? { ...prev, status: "ENDED" } : prev));
          break;
        case "DEBATE_SUMMARY":
          setSummary(msg.payload.summary);
          setShowSummary(true);
          break;
        case "REWRITE_RESULT":
          setRewriteByMessageId((prev) => ({
            ...prev,
            [msg.payload.messageId]: msg.payload.rewrite
          }));
          break;
        case "ERROR":
          console.error("[room]", msg.payload.message);
          break;
      }
    });

    return unsub;
  }, []);

  function handleSetRole(role) {
    send("SET_ROLE", { roomId, role });
    setMyRole(role);
  }

  function handleSend(text) {
    send("SEND_MESSAGE", { roomId, text });
  }

  function handleEndDebate() {
    send("END_DEBATE", { roomId });
  }

  function handleExport() {
    const transcript = {
      roomId,
      motion: roomState?.motion,
      exportedAt: new Date().toISOString(),
      messages: messages.map((msg) => ({
        ...msg,
        analysis: analysisByMessageId[msg.id] || null
      })),
      summary: summary || null
    };

    const blob = new Blob([JSON.stringify(transcript, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `argulens-${roomId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isSpeaker = myRole === "A" || myRole === "B";
  const isLive = roomState?.status === "LIVE";
  const selectedAnalysis = selectedMessageId ? analysisByMessageId[selectedMessageId] : null;

  return (
    <div className="room">
      <header className="room-header">
        <div className="room-header-left">
          <h1 className="room-motion">{roomState?.motion ?? "Loading..."}</h1>
          <span className={`room-status ${isLive ? "live" : "ended"}`}>
            {isLive ? "LIVE" : "ENDED"}
          </span>
        </div>
        <div className="room-header-right">
          <span className="room-code">Room: <strong>{roomId}</strong></span>
          {isLive && (
            <button className="end-btn" onClick={handleEndDebate}>
              End Debate
            </button>
          )}
          {!isLive && summary && (
            <button className="summary-btn" onClick={() => setShowSummary(true)}>
              View Results
            </button>
          )}
          {messages.length > 0 && (
            <button className="export-btn" onClick={handleExport}>
              Export JSON
            </button>
          )}
        </div>
      </header>

      <div className="room-body">
        <main className="room-main">
          <ChatFeed
            messages={messages}
            analysisByMessageId={analysisByMessageId}
            selectedMessageId={selectedMessageId}
            onSelectMessage={setSelectedMessageId}
            scrollToMessageId={scrollToMessageId}
          />
          {isSpeaker && isLive && <MessageInput onSend={handleSend} />}
          {!isSpeaker && isLive && (
            <p className="audience-note">Pick Speaker A or B to join the debate</p>
          )}
          {!isLive && !summary && (
            <p className="audience-note">Debate ended. Generating summary...</p>
          )}
          {!isLive && summary && (
            <p className="audience-note">Debate ended. Click "View Results" to see the summary.</p>
          )}
        </main>

        <aside className="room-sidebar">
          <section className="sidebar-section">
            <h3>Your Role</h3>
            <RolePicker
              currentRole={myRole}
              participants={roomState?.participants ?? []}
              onPick={handleSetRole}
              disabled={!isLive}
            />
          </section>

          <section className="sidebar-section">
            <h3>Participants ({roomState?.participants?.length ?? 0})</h3>
            <ul className="participant-list">
              {(roomState?.participants ?? []).map((p, i) => (
                <li key={i} className={`participant role-${p.role}`}>
                  <span className="participant-name">{p.name}</span>
                  <span className="participant-role">
                    {p.role === "A" ? "Speaker A" : p.role === "B" ? "Speaker B" : p.role === "AUDIENCE" ? "Audience" : "No role"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <AnalysisPanel
            analysis={selectedAnalysis}
            rewrite={selectedMessageId ? rewriteByMessageId[selectedMessageId] : null}
            onRewriteNeutral={
              selectedMessageId && selectedAnalysis?.biasFlags?.length > 0
                ? () => {
                    const msg = messages.find((m) => m.id === selectedMessageId);
                    if (msg) {
                      send("REWRITE_NEUTRAL", { messageId: msg.id, text: msg.text });
                    }
                  }
                : null
            }
          />

          <RhetoricalMap
            analysisByMessageId={analysisByMessageId}
            messages={messages}
            onScrollToMessage={(msgId) => {
              setScrollToMessageId(null);
              setTimeout(() => setScrollToMessageId(msgId), 0);
            }}
          />
        </aside>
      </div>

      {showSummary && summary && (
        <SummaryModal summary={summary} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}
