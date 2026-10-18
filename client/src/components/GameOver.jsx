import { ArrowRight, Crown, RotateCcw, Sparkles } from 'lucide-react';
import Card from './Card.jsx';

export default function GameOver({ gameCode, gameState, myPlayerId, isHost, onNewGame, busy, error }) {
  const players = gameState?.players || [];
  const winner = players.find((player) => player.id === gameState?.winner);
  const isMe = gameState?.winner === myPlayerId;

  return (
    <main className="app-shell game-over-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PC-52 home"><span className="brand-mark">♠</span><span>PC<span className="brand-dash">-</span>52</span></a>
        <div className="room-chip"><span className="room-chip-label">ROOM CODE</span><strong>{gameCode}</strong></div>
        <span className="finished-label"><Sparkles size={15} /> GAME FINISHED</span>
      </header>
      <section className="winner-banner">
        <div className="winner-crown"><Crown size={26} /></div>
        <p className="eyebrow">THE TABLE HAS SPOKEN</p>
        <h1>{isMe ? 'You did it!' : `${winner?.name || 'A player'} wins!`}</h1>
        <p>{isMe ? 'You collected five cards of the same suit. Beautifully played.' : `${winner?.name || 'The winner'} collected five cards of the same suit.`}</p>
      </section>
      <section className="revealed-hands">
        <div className="hand-heading"><div><p className="eyebrow">ALL CARDS REVEALED</p><h2>Show your hands</h2></div><span className="subtle">Good game, everyone.</span></div>
        <div className="revealed-player-grid">
          {players.map((player) => (
            <article className={`revealed-player ${player.id === gameState.winner ? 'revealed-player--winner' : ''}`} key={player.id}>
              <div className="revealed-player-heading">
                <div className="player-avatar" style={{ '--player-color': player.color || '#e4b96c' }}>{player.name?.slice(0, 1)?.toUpperCase() || '?'}</div>
                <div className="player-meta"><div className="player-name">{player.name || 'Player'} {player.id === myPlayerId && <span className="you-pill">YOU</span>}</div><p>{player.id === gameState.winner ? 'Winning hand' : 'Final hand'}</p></div>
                {player.id === gameState.winner && <Crown className="turn-crown" size={19} />}
              </div>
              <div className="revealed-cards">{(player.cards || []).map((card, index) => <Card key={`${card}-${index}`} card={card} small />)}</div>
            </article>
          ))}
        </div>
      </section>
      <div className="new-game-row">
        {isHost ? <button className="primary-button" disabled={busy} onClick={onNewGame}><RotateCcw size={17} /> {busy ? 'Resetting…' : 'Start a new game'} <ArrowRight size={16} /></button> : <p className="waiting-message">Waiting for the host to start a new game…</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
      </div>
    </main>
  );
}
