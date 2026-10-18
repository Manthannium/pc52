import { useState } from 'react';
import { ArrowRight, DoorOpen, Plus, Spade } from 'lucide-react';

export default function LandingPage({ onCreate, onJoin, busy, error }) {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const canEnter = playerName.trim().length > 0 && !busy;

  function submitCreate(event) {
    event.preventDefault();
    if (canEnter) onCreate(playerName.trim());
  }

  function submitJoin(event) {
    event.preventDefault();
    if (canEnter && gameCode.length === 4) onJoin(playerName.trim(), gameCode);
  }

  return (
    <main className="landing-shell">
      <nav className="topbar topbar--landing">
        <a className="brand" href="/" aria-label="PC-52 home">
          <span className="brand-mark"><Spade size={20} fill="currentColor" /></span>
          <span>PC<span className="brand-dash">-</span>52</span>
        </a>
        {/* <span className="online-label"><span className="status-dot" /> Multiplayer card room</span> */}
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="kicker"><span className="kicker-line" /> MADE WITH 💛 BY MANTHAN PATEL </span>
          <h1>Your table.<br /><em>Your winning hand.</em></h1>
          <p className="hero-description">Gather your friends, keep your cards close, and be the first to collect five cards of the same suit.</p>
          <div className="hero-points">
            <span><span className="point-check">✓</span> 2–4 players</span>
            <span><span className="point-check">✓</span> Free Online Real-time Multiplayer Game</span>
          </div>
          <div className="hero-card-art" aria-hidden="true">
            <div className="art-glow" />
            {/* <img className="hero-card hero-card--back" src="/cards/back_cards-07.png" alt="" /> */}
            <img className="hero-card hero-card--front" src="/cards/QH.png" alt="" />
            {/* <div className="art-caption"><span className="art-caption-dot" /> THE NEXT MOVE IS YOURS</div> */}
          </div>
        </div>

        <div className="entry-card">
          <div className="entry-card-top">
            <span className="entry-icon"><Spade size={21} /></span>
            <span className="eyebrow">WELCOME TO PC-52</span>
          </div>
          <h2>Ready to play?</h2>
          <p className="entry-subtitle">Choose a name and join the table.</p>

          <label className="field-label" htmlFor="player-name">YOUR NAME</label>
          <input
            id="player-name"
            className="text-input"
            maxLength={20}
            placeholder="e.g. Sushi"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            autoComplete="nickname"
          />
          <button className="primary-button full-button" disabled={!canEnter} onClick={submitCreate}>
            <Plus size={18} /> Create a new game <ArrowRight size={17} className="button-arrow" />
          </button>

          <div className="or-divider"><span /><small>OR JOIN ROOM</small><span /></div>
          <form onSubmit={submitJoin}>
            {/* <label className="field-label" htmlFor="game-code">4-CHARACTER ROOM CODE</label> */}
            <label className="field-label" htmlFor="game-code"></label>
            <input
              id="game-code"
              className="text-input code-input"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={4}
              placeholder="A B C D"
              value={gameCode}
              onChange={(event) => setGameCode(event.target.value.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase())}
            />
            <button className="secondary-button full-button" type="submit" disabled={!canEnter || gameCode.length !== 4}>
              <DoorOpen size={18} /> Join game <ArrowRight size={17} className="button-arrow" />
            </button>
          </form>
          {busy && <p className="form-status">Connecting to the table…</p>}
          {error && <p className="error-message" role="alert">{error}</p>}
          {/* <p className="privacy-note">Your hand stays private until the game ends.</p> */}
        </div>
      </section>
      {/* <footer className="site-footer"><span>PC-52 CARD TABLE</span><span>Made for good company.</span></footer> */}
    </main>
  );
}
