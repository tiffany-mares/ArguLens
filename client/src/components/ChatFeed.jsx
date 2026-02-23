import { useEffect, useRef, useCallback } from "react";

export default function ChatFeed({ messages, analysisByMessageId, selectedMessageId, onSelectMessage, scrollToMessageId }) {
  const bottomRef = useRef(null);
  const msgRefs = useRef({});

  const setMsgRef = useCallback((id, el) => {
    if (el) msgRefs.current[id] = el;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (scrollToMessageId && msgRefs.current[scrollToMessageId]) {
      msgRefs.current[scrollToMessageId].scrollIntoView({ behavior: "smooth", block: "center" });
      onSelectMessage(scrollToMessageId);
    }
  }, [scrollToMessageId, onSelectMessage]);

  if (messages.length === 0) {
    return <div className="chat-feed empty">No messages yet. Start debating!</div>;
  }

  return (
    <div className="chat-feed">
      {messages.map((msg) => {
        const analysis = analysisByMessageId?.[msg.id];
        const isSelected = selectedMessageId === msg.id;

        return (
          <div
            key={msg.id}
            ref={(el) => setMsgRef(msg.id, el)}
            id={`msg-${msg.id}`}
            className={`chat-msg speaker-${msg.speakerRole}${isSelected ? " selected" : ""}`}
            onClick={() => onSelectMessage(isSelected ? null : msg.id)}
          >
            <div className="chat-msg-header">
              <span className="chat-speaker">
                {msg.speakerName} (Speaker {msg.speakerRole})
              </span>
              <span className="chat-time">
                {new Date(msg.ts).toLocaleTimeString()}
              </span>
            </div>
            <p className="chat-text">{msg.text}</p>
            {analysis && (
              <div className="chat-badges">
                <span className="badge badge-logic">Logic {analysis.logicScore}</span>
                <span className="badge badge-persuasion">Persuasion {analysis.persuasionScore}</span>
                {analysis.fallacies.length > 0 && (
                  <span className="badge badge-fallacy">
                    {analysis.fallacies.length} fallac{analysis.fallacies.length === 1 ? "y" : "ies"}
                  </span>
                )}
                {analysis.biasFlags.length > 0 && (
                  <span className="badge badge-bias">
                    {analysis.biasFlags.length} bias flag{analysis.biasFlags.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            )}
            {!analysis && (
              <div className="chat-badges">
                <span className="badge badge-loading">Analyzing...</span>
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
