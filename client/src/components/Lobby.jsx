import { useState } from 'react';
import { Check, Copy, Crown, Play, Users } from 'lucide-react';

export default function Lobby({ gameCode, gameState, myPlayerId, isHost, onStart, busy, error }) {
  const [copied, setCopied] = useState(false);
  const players = gameState?.players || [];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PC-52 home"><span className="brand-mark">♠</span><span>PC<span className="brand-dash">-</span>52</span></a>
        <div className="room-chip"><span className="room-chip-label">ROOM CODE</span><strong>{gameCode}</strong><button className="icon-button" onClick={copyCode} title="Copy room code">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
      </header>

      <section className="lobby-content">
        <div className="lobby-intro">
          <span className="kicker"><span className="kicker-line" /> TABLE IS OPEN</span>
          <h1>Waiting for<br /><em>the players.</em></h1>
          <p>Invite your friends with the room code. The host can start when at least two players have joined.</p>
        </div>
        <div className="panel lobby-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">YOUR TABLE</p><h2><Users size={21} /> Players <span className="count-pill">{players.length}/4</span></h2></div>
            <span className="waiting-pill"><span className="status-dot" /> Waiting</span>
          </div>
          <div className="lobby-player-list">
            {players.map((player) => (
              <div className="lobby-player" key={player.id}>
                <div className="player-avatar" style={{ '--player-color': player.color || '#e4b96c' }}>{player.name?.slice(0, 1)?.toUpperCase() || '?'}</div>
                <div className="player-meta">
                  <div className="player-name">{player.name || 'Player'} {player.id === myPlayerId && <span className="you-pill">YOU</span>}</div>
                  <p>{player.id === gameState.hostId || (isHost && player.id === myPlayerId) ? 'Host' : 'Ready to play'}</p>
                </div>
                {(player.id === gameState.hostId || (isHost && player.id === myPlayerId)) && <span className="host-tag"><Crown size={14} /> HOST</span>}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - players.length) }, (_, index) => (
              <div className="lobby-player lobby-player--empty" key={`empty-${index}`}>
                <div className="empty-avatar">＋</div><div className="player-meta"><div className="player-name">Open seat</div><p>Invite a friend to join</p></div>
              </div>
            ))}
          </div>
          <div className="lobby-actions">
            {isHost ? (
              <button className="primary-button full-button" onClick={onStart} disabled={busy || players.length < 2}>
                <Play size={18} fill="currentColor" /> {busy ? 'Starting…' : 'Start game'} <span className="button-arrow">→</span>
              </button>
            ) : <div className="waiting-message"><span className="pulse-dot" /> Waiting for the host to start…</div>}
            {isHost && players.length < 2 && <p className="hint-text">At least two players are needed to start.</p>}
            {error && <p className="error-message" role="alert">{error}</p>}
          </div>
        </div>
      </section>
      <footer className="site-footer"><span>PC-52 CARD TABLE</span><span>Room {gameCode}</span></footer>
    </main>
  );
}
