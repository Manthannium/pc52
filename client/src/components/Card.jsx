export default function Card({
  card,
  back = false,
  small = false,
  disabled = false,
  onClick,
  label,
}) {
  const image = back ? '/cards/back_cards-07.png' : `/cards/${card}.png`;

  return (
    <button
      type="button"
      className={`playing-card ${small ? 'playing-card--small' : ''} ${onClick ? 'playing-card--clickable' : ''}`}
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label || (back ? 'Face-down card' : `Card ${card}`)}
      title={label || (back ? 'Hidden card' : card)}
    >
      <img src={image} alt={back ? 'Hidden card' : card} draggable="false" />
    </button>
  );
}
