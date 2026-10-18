import { Crown, Eye, EyeOff } from 'lucide-react';
import Card from './Card.jsx';

export default function PlayerList({ players = [], currentPlayerId, myPlayerId, isFinished = false }) {
  return (
    <section className="panel players-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">THE TABLE</p><h2>Players <span className="count-pill">{players.length}</span></h2></div>
        <span className="subtle">{isFinished ? <><Eye size={14} /> Open hands</> : <><EyeOff size={14} /> Private hands</>}</span>
      </div>
      <div className="players-list">
        {players.map((player) => {
          const isMe = player.id === myPlayerId;
          const isTurn = player.id === currentPlayerId && !isFinished;
          const cardsVisible = Array.isArray(player.cards) && (isFinished || isMe);
          const count = player.cardCount ?? player.cards?.length ?? 5;
          return (
            <div className={`player-row ${isTurn ? 'player-row--turn' : ''}`} key={player.id}>
              <div className="player-avatar" style={{ '--player-color': player.color || '#e4b96c' }}>{player.name?.slice(0, 1)?.toUpperCase() || '?'}</div>
              <div className="player-meta">
                <div className="player-name"><span>{player.name || 'Player'}</span>{isMe && <span className="you-pill">YOU</span>}{isTurn && <Crown size={14} className="turn-crown" />}</div>
                <p>{isFinished ? 'Hand revealed' : isTurn ? 'Their turn' : `${count} cards`}</p>
              </div>
              <div className="mini-hand" aria-label={cardsVisible ? 'Player cards' : 'Cards hidden'}>
                {Array.from({ length: Math.min(count, 5) }, (_, index) => cardsVisible
                  ? <Card key={index} card={player.cards[index]} small />
                  : <Card key={index} back small />)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
