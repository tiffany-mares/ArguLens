import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { connect, send, onMessage } from "../lib/ws";

export default function Home() {
  const navigate = useNavigate();

  const [motion, setMotion] = useState("");
  const [createName, setCreateName] = useState("");

  const [roomCode, setRoomCode] = useState("");
  const [joinName, setJoinName] = useState("");

  function handleCreate() {
    if (!motion.trim() || !createName.trim()) return;

    connect();

    const unsub = onMessage((msg) => {
      if (msg.type === "ROOM_CREATED") {
        unsub();
        navigate(`/room/${msg.payload.roomId}`);
      }
      if (msg.type === "ERROR") {
        unsub();
        alert(msg.payload.message);
      }
    });

    setTimeout(() => {
      send("CREATE_ROOM", { motion: motion.trim(), name: createName.trim() });
    }, 300);
  }

  function handleJoin() {
    if (!roomCode.trim() || !joinName.trim()) return;

    connect();

    const unsub = onMessage((msg) => {
      if (msg.type === "ROOM_JOINED") {
        unsub();
        navigate(`/room/${msg.payload.roomId}`);
      }
      if (msg.type === "ERROR") {
        unsub();
        alert(msg.payload.message);
      }
    });

    setTimeout(() => {
      send("JOIN_ROOM", { roomId: roomCode.trim(), name: joinName.trim() });
    }, 300);
  }

  return (
    <div className="home">
      <h1>ArguLens</h1>
      <p className="subtitle">AI-Powered Debate Engine</p>

      <div className="home-panels">
        <section className="panel">
          <h2>Create a Debate</h2>
          <input
            type="text"
            placeholder="Your name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <input
            type="text"
            placeholder='Motion — e.g. "Should campuses ban TikTok?"'
            value={motion}
            onChange={(e) => setMotion(e.target.value)}
          />
          <button onClick={handleCreate}>Create Room</button>
        </section>

        <div className="divider">or</div>

        <section className="panel">
          <h2>Join a Debate</h2>
          <input
            type="text"
            placeholder="Your name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <button onClick={handleJoin}>Join Room</button>
        </section>
      </div>
    </div>
  );
}
