/**
 * ============================================================================
 * PC 52 GAME SERVER
 * ============================================================================
 * 
 * Express + Socket.io server for multiplayer PC-52 game.
 * Handles real-time game communication, session management, and game state.
 * 
 * Features:
 * - WebSocket-based real-time multiplayer
 * - Game room management with 4-character codes
 * - Automatic cleanup of stale games
 * - Connection limits for free tier hosting
 * - Keep-alive ping endpoint for Render free tier
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import * as GameLogic from './gameLogic.js';

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// IN-MEMORY STATE
// ============================================================================

/** Map of gameCode -> game state object */
const games = new Map();

/** Map of socketId -> { gameId, playerId } for tracking player connections */
const playerSockets = new Map();

// Connection limits for free tier hosting (Render, Vercel, etc.)
const MAX_CONCURRENT_GAMES = 50;
const MAX_TOTAL_PLAYERS = 200;
let totalConnectedPlayers = 0;

// ============================================================================
// HTTP ENDPOINTS
// ============================================================================

/** Server info and health check */
app.get('/', (req, res) => {
    res.json({
        name: 'PC-52 Game Server',
        status: 'running',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            ping: '/ping',
            socket: 'ws://[this-url]'
        },
        author: 'Manthan Patel'
    });
});

/** Detailed health check with server stats */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        activeGames: games.size,
        maxGames: MAX_CONCURRENT_GAMES,
        connectedPlayers: totalConnectedPlayers,
        maxPlayers: MAX_TOTAL_PLAYERS,
        timestamp: new Date().toISOString(),
    });
});

/** Lightweight keep-alive ping (prevents Render free tier from sleeping) */
app.get('/ping', (req, res) => {
    res.send('pong');
});

// ============================================================================
// SOCKET.IO SETUP
// ============================================================================

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ============================================================================
// AUTOMATIC CLEANUP
// ============================================================================

/** Clean up games that have been created before 3+ hours */
setInterval(() => {
    const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
    let cleanedCount = 0;
    games.forEach((game, id) => {
        if(game.createdAt && game.createdAt < threeHoursAgo) {
            games.delete(id);
            cleanedCount++;
        }
    });
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} stale games. Active games: ${games.size}`);
    }
}, 30 * 60 * 1000); // Check every 30 minutes

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Generate a 4-character alphanumeric game code (excludes ambiguous chars like 0/O, 1/I) */
function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for(let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/** Send player-specific game state to each player in a game */
function broadcastGameState(gameCode) {
    const game = games.get(gameCode);
    if (!game) return;

    for (const [socketId, info] of playerSockets.entries()) {
        if (info.gameId !== gameCode) continue;

        const view = GameLogic.getPlayerView(game, info.playerId);

        if (view.success !== false) {
            io.to(socketId).emit('gameState', view);
        }
    }
}

/** Broadcast an event to all players in a game (same data to everyone) */
function broadcastToGame(gameId, event, data) {
    const game = games.get(gameId);
    if(!game) return;
    
    game.players.forEach(player => {
        const socketId = [...playerSockets.entries()]
            .find(([_, v]) => v.gameId === gameId && v.playerId === player.id)?.[0];
        
        if(socketId) {
            io.to(socketId).emit(event, data);
        }
    });
}

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

io.on('connection', (socket) => {

    // --------------------------------------------------------------------
    // CONNECTION MANAGEMENT
    // --------------------------------------------------------------------
  
    // Check if server is at capacity
    if(totalConnectedPlayers >= MAX_TOTAL_PLAYERS) {
        console.log('Server at capacity, rejecting connection:', socket.id);
        socket.emit('serverFull', { 
            message: 'Server is at maximum capacity. Please try again in a few minutes.',
            players: totalConnectedPlayers,
            maxPlayers: MAX_TOTAL_PLAYERS
        });
        socket.disconnect(true);
        return;
    }
  
    totalConnectedPlayers++;
    console.log(`Player connected: ${socket.id} (Total: ${totalConnectedPlayers}/${MAX_TOTAL_PLAYERS})`);

    // --------------------------------------------------------------------
    // GAME CREATION AND JOINING
    // --------------------------------------------------------------------
  
    /** Create a new game room as the host */
    socket.on('createGame', ({ playerName }, callback) => {
        // Check game limit
        if(games.size >= MAX_CONCURRENT_GAMES) {
            callback({ 
                success: false, 
                error: 'Server has reached maximum number of games. Please try again later.' 
            });
            return;
        }
    
        const gameCode = generateGameCode();
        const playerId = uuidv4();
        
        const game = GameLogic.createGame(gameCode, {
            id: playerId,
            name: playerName
        });
        
        game.hostId = playerId;
    
        // Add timestamp for cleanup
        game.createdAt = Date.now();
    
        games.set(gameCode, game);
        playerSockets.set(socket.id, { gameId: gameCode, playerId });
        socket.join(gameCode);
    
        console.log(`Game ${gameCode} created by ${playerName}`);
    
        callback({
            success: true,
            gameCode,
            playerId,
            gameState: GameLogic.getPlayerView(game, playerId)
        });
    });

    socket.on('joinGame', ({ gameCode, playerName }, callback) => {
        const code = gameCode?.trim().toUpperCase();
        const game = games.get(code);

        if(!game) {
            return callback?.({ success: false, error: 'Game not found' });
        }

        const playerId = uuidv4();
        const result = GameLogic.addPlayer(game, {
            id: playerId,
            name: playerName
        });

        if(!result.success) {
            return callback?.({ success: false, error: result.error });
        }

        playerSockets.set(socket.id, { gameId: code, playerId });
        socket.join(code);

        callback?.({
            success: true,
            gameCode: code,
            playerId,
            gameState: GameLogic.getPlayerView(game, playerId)
        });

        broadcastToGame(code, 'playerJoined', {
            player: {
                id: playerId,
                name: playerName,
                color: game.players.at(-1).color
            }
        });
        broadcastGameState(code);
    });

    // --------------------------------------------------------------------
    // GAME FLOW CONTROLS
    // --------------------------------------------------------------------

    /** Start the game (host only) - randomizes player order and begins setup */
    socket.on('startGame', (_payload = {}, callback) => {
        const reply = (result) => {
            if (typeof callback === 'function') {
                callback(result);
            }
        };

        const playerInfo = playerSockets.get(socket.id);

        if (!playerInfo) {
            return reply({
                success: false,
                error: 'Not in a game'
            });
        }

        const game = games.get(playerInfo.gameId);

        if (!game) {
            return reply({
                success: false,
                error: 'Game not found'
            });
        }

        if (game.hostId !== playerInfo.playerId) {
            return reply({
                success: false,
                error: 'Only host can start the game'
            });
        }

        const result = GameLogic.startGame(game);

        if (!result.success) {
            return reply(result);
        }

        broadcastToGame(playerInfo.gameId, 'gameStarted', {
            turnOrder: result.turnOrder
        });

        broadcastGameState(playerInfo.gameId);

        reply({
            ...result,
            gameState: GameLogic.getPlayerView(game, playerInfo.playerId)
        });
    });

    socket.on('newGame', (payload = {}, callback) => {
        const reply = (result) => {
            if (typeof callback === 'function') {
                callback(result);
            }
        };

        const playerInfo = playerSockets.get(socket.id);

        if (!playerInfo) {
            return reply({
                success: false,
                error: 'You are not in a game'
            });
        }

        const { gameId, playerId } = playerInfo;
        const game = games.get(gameId);

        if (!game) {
            return reply({
                success: false,
                error: 'Game not found'
            });
        }

        // Only the original host may start a new round.
        if (game.hostId !== playerId) {
            return reply({
                success: false,
                error: 'Only the host can start a new game'
            });
        }

        if (game.phase !== 'finished') {
            return reply({
                success: false,
                error: 'The current game has not finished'
            });
        }

        // Keep the players and room; reset the round.
        for (const player of game.players) {
            player.cards = [];
            player.turnOrder = null;
        }

        game.phase = 'waiting';
        game.currentPlayerIndex = 0;
        game.turnPhase = 'draw';
        game.turnChoice = 'none';
        game.hasTookThisTurn = false;
        game.openCard = null;
        game.deck = [];
        game.winner = null;

        // Deal a fresh hand and immediately start the new round.
        const result = GameLogic.startGame(game);

        if (!result.success) {
            return reply(result);
        }

        broadcastToGame(gameId, 'gameStarted', {
            turnOrder: result.turnOrder,
            newGame: true
        });

        broadcastGameState(gameId);

        reply({
            success: true,
            turnOrder: result.turnOrder,
            gameState: GameLogic.getPlayerView(game, playerId)
        });
    });

    // --------------------------------------------------------------------
    // TURN ACTIONS
    // --------------------------------------------------------------------

    socket.on('takeTurn', (payload = {}, callback) => {
        const reply = (result) => {
            if(typeof callback === 'function') {
                callback(result);
            }
        };

        const { action, cardIndex } = payload && typeof payload === 'object' ? payload : {};
        const playerInfo = playerSockets.get(socket.id);

        if(!playerInfo) {
            return reply({
                success: false,
                error: 'You are not in a game'
            });
        }

        const { gameId, playerId } = playerInfo;
        const game = games.get(gameId);

        if(!game) {
            return reply({
                success: false,
                error: 'Game not found'
            });
        }

        const result = GameLogic.takeTurn(
            game,
            playerId,
            action,
            cardIndex
        );

        if(!result.success) {
            return reply(result);
        }

        const winnerId = GameLogic.checkWinner(game);

        if (winnerId) {
            const winner = game.players.find(p => p.id === winnerId);

            broadcastToGame(gameId, 'gameOver', {
                winnerId,
                winnerName: winner?.name
            });
        }

        broadcastGameState(gameId);

        reply({
            success: true,
            action: result.action,
            openCard: game.openCard,
            winner: game.winner
        });
    });

    socket.on('passTurn', (payload = {}, callback) => {
        const reply = (result) => {
            if (typeof callback === 'function') {
                callback(result);
            }
        };

        const playerInfo = playerSockets.get(socket.id);

        if(!playerInfo) {
            return reply({
                success: false,
                error: 'You are not in a game'
            });
        }

        const { gameId, playerId } = playerInfo;
        const game = games.get(gameId);

        if(!game) {
            return reply({
                success: false,
                error: 'Game not found'
            });
        }

        const result = GameLogic.passTurn(game, playerId);

        if(!result.success) {
            return reply(result);
        }

        broadcastToGame(gameId, 'turnPassed', {
            playerId,
            nextPlayerId: result.nextPlayerId
        });

        // Each player receives their own filtered game state.
        broadcastGameState(gameId);

        reply({
            ...result,
            gameState: GameLogic.getPlayerView(game, playerId)
        });
    });

    // --------------------------------------------------------------------
    // CONNECTION LIFECYCLE
    // --------------------------------------------------------------------
  
    socket.on('rejoinGame', ({ gameCode, playerId } = {}, callback) => {
        const code = gameCode?.trim().toUpperCase();
        const game = games.get(code);

        if(!game) {
            return callback?.({
                success: false,
                error: 'Game not found'
            });
        }

        const player = game.players.find(p => p.id === playerId);

        if(!player) {
            return callback?.({
                success: false,
                error: 'Player not found in game'
            });
        }

        // Remove any previous socket mapping for this player.
        for (const [oldSocketId, info] of playerSockets.entries()) {
            if (info.gameId === code && info.playerId === playerId) {
                playerSockets.delete(oldSocketId);
            }
        }

        playerSockets.set(socket.id, {
            gameId: code,
            playerId
        });

        socket.join(code);

        callback?.({
            success: true,
            gameState: GameLogic.getPlayerView(game, playerId)
        });

        broadcastToGame(code, 'playerReconnected', {
            playerId,
            playerName: player.name
        });
    });

    /** Handle player disconnection */
    socket.on('disconnect', () => {
        totalConnectedPlayers = Math.max(0, totalConnectedPlayers - 1);
        const playerInfo = playerSockets.get(socket.id);

        if (playerInfo) {
            const { gameId, playerId } = playerInfo;
            const game = games.get(gameId);
            if (game) {
                const player = game.players.find(p => p.id === playerId);
                if (player) {
                    broadcastToGame(gameId, 'playerDisconnected', {
                        playerId,
                        playerName: player.name
                    });
                }
            }
            playerSockets.delete(socket.id);
        }

        console.log(
            `Player disconnected: ${socket.id} ` +
            `(Total: ${totalConnectedPlayers}/${MAX_TOTAL_PLAYERS})`
        );
    });
  
    /** Reconnect to an existing game (e.g., after page refresh) */
    socket.on('reconnect', ({ gameCode, playerId }, callback) => {
        const game = games.get(gameCode);
        
        if(!game) {
            callback({ success: false, error: 'Game not found' });
            return;
        }
        
        const player = game.players.find(p => p.id === playerId);
        if(!player) {
            callback({ success: false, error: 'Player not found in game' });
            return;
        }
    
        // Remove old socket mapping if exists
        for(const [socketId, info] of playerSockets.entries()) {
            if(info.gameId === gameCode && info.playerId === playerId) {
                playerSockets.delete(socketId);
                break;
            }
        }
    
        playerSockets.set(socket.id, { gameId: gameCode, playerId });
        socket.join(gameCode);
    
        callback({
            success: true,
            gameState: GameLogic.getPlayerView(game, playerId)
        });
        broadcastToGame(gameCode, 'playerReconnected', { playerName: player.name });
    });

});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// const PORT = process.env.PORT || 3000;
// httpServer.listen(PORT, () => {
//     console.log(`PC-52 server running on port ${PORT}`);
// });

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PC-52 server running on port ${PORT}`);
});