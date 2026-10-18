import { CircleHelp, Hand, RefreshCw, RotateCcw, Sparkles, ArrowRight } from 'lucide-react';
import Card from './Card.jsx';
import PlayerList from './PlayerList.jsx';

export default function GameTable({ gameCode, gameState, myPlayerId, onAction, onPass, busy, error }) {
  const players = gameState?.players || [];
  const me = players.find((player) => player.id === myPlayerId);
  const currentPlayerId = gameState?.currentPlayerId || players[gameState?.currentPlayerIndex]?.id;
  const isMyTurn = gameState?.phase === 'playing' && currentPlayerId === myPlayerId;
  const canAct = isMyTurn && gameState?.turnPhase === 'draw' && !busy;
  const canDraw = isMyTurn && (gameState?.turnChoice ?? 'none') === 'none';

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="PC-52 home"><span className="brand-mark">♠</span><span>PC<span className="brand-dash">-</span>52</span></a>
        <div className="room-chip"><span className="room-chip-label">ROOM CODE</span><strong>{gameCode}</strong></div>
        <div className={`turn-indicator ${isMyTurn ? 'turn-indicator--mine' : ''}`}><span className="status-dot" />{isMyTurn ? 'Your turn' : 'Opponent’s turn'}</div>
      </header>

      <div className="game-layout">
        <section className="table-main">
          <div className="game-heading">
            <div><p className="eyebrow">THE GAME IS ON</p><h1>Make your <em>move.</em></h1></div>
            <div className="turn-pill">{isMyTurn ? <><Sparkles size={15} /> YOUR TURN</> : <><CircleHelp size={15} /> WAIT YOUR TURN</>}</div>
          </div>

          <section className="felt-table">
            <div className="felt-topline"><span><span className="felt-dot" /> PC-52 TABLE</span><span>{players.length} PLAYERS</span></div>
            <div className="piles">
              <div className="pile-group">
                <span className="pile-label">DRAW PILE</span>
                <div className="card-stack"><div className="stack-shadow stack-shadow--one" /><div className="stack-shadow stack-shadow--two" /><Card back /></div>
                <span className="pile-count">{Number.isInteger(gameState.deckCount) ? `${gameState.deckCount} left` : 'Draw pile'}</span>
              </div>
              <div className="pile-divider"><span>✦</span></div>
              <div className="pile-group">
                <span className="pile-label">OPEN CARD</span>
                <div className="open-card-wrap">{gameState.openCard ? <Card card={gameState.openCard} /> : <div className="empty-card">No card</div>}</div>
                <span className="pile-count">Face up</span>
              </div>
            </div>
            <div className="table-instruction">
              <span className="instruction-icon">{isMyTurn ? <Hand size={17} /> : <RefreshCw size={16} />}</span>
              <span>{isMyTurn ? <><strong>Your move.</strong> Click one of your cards to swap it with the open card, or draw a new card.</> : <><strong>Hang tight.</strong> The table will update when the active player makes a move.</>}</span>
            </div>
          </section>

          <section className="hand-section">
            <div className="hand-heading"><div><p className="eyebrow">YOUR CARDS</p><h2>Your hand <span className="count-pill">{me?.cards?.length ?? 5}</span></h2></div><span className="hand-note">Five cards. One winning suit.</span></div>
            <div className="hand-cards">
              {Array.isArray(me?.cards) ? me.cards.map((card, index) => (
                <Card key={`${card}-${index}`} card={card} onClick={() => onAction('swap', index)} disabled={!canAct} label={`Swap ${card} with the open card`} />
              )) : <p className="hint-text">Your cards will appear when the server sends your game state.</p>}
            </div>

            {/* <div className="action-bar">
              <button className="primary-button" onClick={() => onAction('draw')} disabled={!canAct}><RotateCcw size={17} /> Draw new card</button>
              <span className="action-hint">{!isMyTurn ? 'It’s not your turn yet.' : 'Or click any card in your hand to swap.'}</span>
            </div> */}

            <div className="action-bar">
              <button
                  className="primary-button"
                  onClick={() => onAction('draw')}
                  disabled={!canDraw || busy}
              >
                  <RotateCcw size={17} />
                  Draw new card
              </button>
              <button
                  className="secondary-button"
                  onClick={onPass}
                  disabled={!isMyTurn || busy}
              >
                  <ArrowRight size={17} />
                  Pass turn
              </button>

              <span className="action-hint">
                  {!isMyTurn
                      ? "It's not your turn yet."
                      : gameState?.turnChoice === 'draw'
                          ? 'You have drawn. Swap cards or pass.'
                          : gameState?.turnChoice === 'swap'
                              ? 'You can keep swapping or pass. Drawing is no longer allowed.'
                              : 'Draw once, swap cards, or pass.'}
              </span>
            </div>

            {error && <p className="error-message" role="alert">{error}</p>}
          </section>
        </section>

        <aside className="game-sidebar">
          <PlayerList players={players} currentPlayerId={currentPlayerId} myPlayerId={myPlayerId} />
          <div className="rule-card"><div className="rule-icon"><Sparkles size={17} /></div><div><h3>Winning hand</h3><p>Collect all five cards in the same suit to win the game.</p></div></div>
        </aside>
      </div>
    </main>
  );
}
