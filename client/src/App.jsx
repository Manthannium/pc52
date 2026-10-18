import { useEffect, useState } from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { socket, emitWithAck } from './socket.js';
import LandingPage from './components/LandingPage.jsx';
import Lobby from './components/Lobby.jsx';
import GameTable from './components/GameTable.jsx';
import GameOver from './components/GameOver.jsx';

const SESSION_KEY = 'pc52-session';

function screenForState(state) {
  if (state?.phase === 'finished') return 'finished';
  if (state?.phase === 'playing') return 'playing';
  if (state?.phase === 'waiting') return 'lobby';
  return null;
}

export default function App() {
  const [connection, setConnection] = useState(socket.connected ? 'connected' : 'connecting');
  const [screen, setScreen] = useState('landing');
  const [gameCode, setGameCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [hostPlayerId, setHostPlayerId] = useState('');
  const [gameState, setGameState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState(false);

  const isHost = Boolean(playerId && (playerId === hostPlayerId || playerId === gameState?.hostId));

  useEffect(() => {
    let recoveryAttempted = false;

    const applyGameState = (state) => {
      if (!state || state.success === false) return;
      setGameState(state);
      const nextScreen = screenForState(state);
      if (nextScreen) setScreen(nextScreen);
    };

    const attemptRecovery = async () => {
      if (recoveryAttempted) return;
      recoveryAttempted = true;
      let saved;
      try { saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { saved = null; }
      if (!saved?.gameCode || !saved?.playerId) return;

      setRecovering(true);
      const result = await emitWithAck('rejoinGame', saved);
      setRecovering(false);
      if (result?.success) {
        setGameCode(saved.gameCode);
        setPlayerId(saved.playerId);
        setHostPlayerId(saved.hostPlayerId || '');
        applyGameState(result.gameState);
        setError('');
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    };

    const onConnect = () => {
      setConnection('connected');
      attemptRecovery();
    };
    const onDisconnect = () => setConnection('disconnected');
    const onConnectError = () => setConnection('disconnected');
    const onGameState = (state) => applyGameState(state);
    const onServerFull = (payload) => setError(payload?.message || 'The server is full.');
    const onGameOver = () => setScreen('finished');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('gameState', onGameState);
    socket.on('gameOver', onGameOver);
    socket.on('serverFull', onServerFull);

    if (socket.connected) {
      setConnection('connected');
      attemptRecovery();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('gameState', onGameState);
      socket.off('gameOver', onGameOver);
      socket.off('serverFull', onServerFull);
    };
  }, []);

  function enterGame(result, hostId = '') {
    const code = String(result.gameCode || '').toUpperCase();
    const id = result.playerId;
    setGameCode(code);
    setPlayerId(id);
    setHostPlayerId(hostId);
    setGameState(result.gameState);
    setScreen(screenForState(result.gameState) || 'lobby');
    setError('');
    localStorage.setItem(SESSION_KEY, JSON.stringify({ gameCode: code, playerId: id, hostPlayerId: hostId }));
  }

  async function createGame(playerName) {
    setBusy(true); setError('');
    const result = await emitWithAck('createGame', { playerName });
    setBusy(false);
    if (!result?.success) { setError(result?.error || 'Could not create the game.'); return; }
    enterGame(result, result.playerId);
  }

  async function joinGame(playerName, code) {
    setBusy(true); setError('');
    const result = await emitWithAck('joinGame', { playerName, gameCode: code });
    setBusy(false);
    if (!result?.success) { setError(result?.error || 'Could not join the game.'); return; }
    enterGame(result);
  }

  async function startGame() {
    setBusy(true); setError('');
    const result = await emitWithAck('startGame');
    setBusy(false);
    if (!result?.success) { setError(result?.error || 'Could not start the game.'); return; }
    if (result.gameState) {
      setGameState(result.gameState);
      setScreen(screenForState(result.gameState) || 'playing');
    }
  }

  async function takeAction(action, cardIndex) {
    setBusy(true); setError('');
    const payload = { action };
    if (Number.isInteger(cardIndex)) payload.cardIndex = cardIndex;
    const result = await emitWithAck('takeTurn', payload);
    setBusy(false);
    if (!result?.success) { setError(result?.error || 'That move could not be made.'); return; }
    if (result.gameState) setGameState(result.gameState);
    // Normally the server broadcasts an updated personalized gameState to everyone.
  }

  async function passTurn() {
      setBusy(true);
      setError('');

      const result = await emitWithAck('passTurn');

      setBusy(false);

      if (!result?.success) {
          setError(result?.error || 'Could not pass your turn.');
          return;
      }

      if (result.gameState) {
          setGameState(result.gameState);
      }
  }

  async function startNewGame() {
    setBusy(true);
    setError('');

    const result = await emitWithAck('newGame');

    setBusy(false);

    if (!result?.success) {
        setError(result?.error || 'Could not start a new game.');
        return;
    }

    if (result.gameState) {
        const nextState = result.gameState;

        setGameState(nextState);

        if (nextState.phase === 'playing') {
            setScreen('playing');
        } else if (nextState.phase === 'waiting') {
            setScreen('lobby');
        } else if (nextState.phase === 'finished') {
            setScreen('finished');
        }
    }
  }

  return (
    <>
      <div className={`connection-status connection-status--${connection}`}>
        {connection === 'connected' ? <><Wifi size={14} /> Connected</> : connection === 'connecting' ? <><Wifi size={14} /> Connecting…</> : <><WifiOff size={14} /> Reconnecting…</>}
      </div>
      {recovering && <div className="recovery-note">Restoring your game…</div>}
      {screen === 'landing' && <LandingPage onCreate={createGame} onJoin={joinGame} busy={busy} error={error} />}
      {screen === 'lobby' && gameState && <Lobby gameCode={gameCode} gameState={gameState} myPlayerId={playerId} isHost={isHost} onStart={startGame} busy={busy} error={error} />}
      {screen === 'playing' && gameState && <GameTable gameCode={gameCode} gameState={gameState} myPlayerId={playerId} onAction={takeAction} onPass={passTurn} busy={busy} error={error} />}
      {screen === 'finished' && gameState && <GameOver gameCode={gameCode} gameState={gameState} myPlayerId={playerId} isHost={isHost} onNewGame={startNewGame} busy={busy} error={error} />}
      {error && screen !== 'landing' && screen !== 'lobby' && screen !== 'finished' && <div className="global-error"><AlertCircle size={16} />{error}</div>}
    </>
  );
}
