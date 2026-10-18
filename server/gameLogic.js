/**
 * 
 * ============================================================================
 * PC-52 GAME LOGIC ENGINE
 * ============================================================================
 * 
 * This module contains the complete game logic for a digital implementation 
 * of the Playing Cards 52 Game. It handles:
 * 
 * - Card shuffle and distribute
 * - Player management and turn flow
 * 
 */

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

export const SUITS = ['C','D','H','S'];
export const NUMBERS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

export const DECK = SUITS.flatMap(suit =>
    NUMBERS.map(number => `${number}${suit}`)
);

export const PLAYER_COLORS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#6a994e', '#9d4edd'];
export const CARDS_IN_HAND = 5;
export const MAX_PLAYERS = 4;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function shuffleDeck(deck) {
    const shuffled = [...deck];
    for(let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================

export function createGame(gameId, hostPlayer) {
    return {
        id: gameId,
        phase: 'waiting', // waiting, playing, finished
        currentPlayerIndex: 0,
        maxPlayers: MAX_PLAYERS,
        deck: [],
        hostId: hostPlayer.id,

        players: [{
            id: hostPlayer.id,
            name: hostPlayer.name,
            color: PLAYER_COLORS[0],
            turnOrder: null, // Will be set when game starts
            cards: [],  // when game starts
        }],
        turnPhase: 'draw', // draw, swap
        winner: null,
        hasTookThisTurn: false, // Track if he has took the turn
        openCard: null,
        createdAt: Date.now(),
        turnChoice: 'none', // 'none', 'swap', or 'draw'
    };
};

export function addPlayer(game, player) {
    if(game.players.length >= MAX_PLAYERS) {
        return {
            success: false, 
            error: 'Game is full'
        };
    }

    if (game.phase !== 'waiting') {
        return { 
            success: false, 
            error: 'Game already started or finished' 
        };
    }

    game.players.push({
        id: player.id,
        name: player.name,
        color: PLAYER_COLORS[game.players.length],
        turnOrder: null, // Will be set when game starts
        cards: [],
    });
  
    return { success: true };
}

/** 
 * Start the game - randomizes player order and begins turn
 * Requires at least 2 players
 */
export function startGame(game) {
    if (game.phase !== 'waiting') {
        return { success: false, error: 'Game has already started' };
    }

    if (game.players.length < 2) {
        return { success: false, error: 'Need at least 2 players' };
    }

    // Randomize player order
    const shuffledPlayers = shuffleDeck(
        game.players.map((_, index) => index)
    );

    game.players = shuffledPlayers.map((oldIndex, newIndex) => {
        const player = game.players[oldIndex];

        player.turnOrder = newIndex + 1;
        player.color = PLAYER_COLORS[newIndex];

        return player;
    });

    // Shuffle and deal
    const shuffledDeck = shuffleDeck(DECK);

    for(const player of game.players) {
        player.cards = shuffledDeck.splice(0, CARDS_IN_HAND);
    }

    // One face-up card; the rest remain in the draw pile
    game.openCard = shuffledDeck.shift();
    game.deck = shuffledDeck;

    game.phase = 'playing';
    game.currentPlayerIndex = 0;
    game.turnPhase = 'draw';
    game.turnChoice = 'none';
    game.hasTookThisTurn = false;
    game.winner = null;

    return {
        success: true,
        turnOrder: game.players.map(p => ({
            id: p.id,
            name: p.name,
            color: p.color,
            turnOrder: p.turnOrder
        }))
    };
}

// ============================================================================
// TURN ACTIONS
// ============================================================================

function validateTurn(game, playerId) {
    if (game.phase !== 'playing') {
        return {
            success: false,
            error: 'Game is not in progress'
        };
    }
    const player = game.players[game.currentPlayerIndex];
    if (!player || player.id !== playerId) {
        return {
            success: false,
            error: 'Not your turn'
        };
    }
    return { success: true, player };
}

function finishTurn(game) {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    game.turnPhase = 'draw';
    game.turnChoice = 'none';
    game.hasTookThisTurn = false;
}

// Validates and executes the requested action.
export function takeTurn(game, playerId, action, cardIndex) {
    if(action === 'draw') {
        return drawCard(game, playerId);
    }
    if(action === 'swap') {
        return swapCard(game, playerId, cardIndex);
    }
    return { success: false, error: 'Invalid action' };
}

export function drawCard(game, playerId) {
    const validation = validateTurn(game, playerId);
    if (!validation.success) return validation;

    if (game.turnChoice === 'swap') {
        return {
            success: false,
            error: 'You already chose to swap. Pass to end your turn.'
        };
    }

    if (game.turnChoice === 'draw') {
        return {
            success: false,
            error: 'You have already drawn this turn.'
        };
    }

    if (!game.deck?.length) {
        return {
            success: false,
            error: 'The deck is empty.'
        };
    }

    const drawnCard = game.deck.shift();

    // Recycle the old open card at the bottom of the deck.
    if (game.openCard) {
        game.deck.push(game.openCard);
    }

    game.openCard = drawnCard;
    game.turnChoice = 'draw';
    game.hasTookThisTurn = true;

    // Do not call finishTurn() here.
    // The player may still swap cards or pass.

    return {
        success: true,
        action: 'draw',
        openCard: game.openCard
    };
}

export function swapCard(game, playerId, cardIndex) {
    const validation = validateTurn(game, playerId);
    if (!validation.success) return validation;

    const { player } = validation;

    if (
        !Number.isInteger(cardIndex) ||
        cardIndex < 0 ||
        cardIndex >= player.cards.length
    ) {
        return {
            success: false,
            error: 'Invalid card index'
        };
    }

    // If this is their first action, they have chosen the swap route.
    // Subsequent swaps remain allowed, including after drawing.
    if (game.turnChoice === 'none') {
        game.turnChoice = 'swap';
    }

    const previousOpenCard = game.openCard;

    game.openCard = player.cards[cardIndex];
    player.cards[cardIndex] = previousOpenCard;

    game.hasTookThisTurn = true;

    // Do not call finishTurn() here either.

    return {
        success: true,
        action: 'swap',
        openCard: game.openCard
    };
}

export function passTurn(game, playerId) {
    const validation = validateTurn(game, playerId);
    if (!validation.success) return validation;

    finishTurn(game);

    return {
        success: true,
        action: 'pass',
        nextPlayerId: game.players[game.currentPlayerIndex].id
    };
}

// ============================================================================
// VICTORY CONDITION
// ============================================================================

/**
 * check if player has all cards of same suit -> then win
 */
export function checkWinner(game) {
    for(const player of game.players) {
        if (
            player.cards.length === CARDS_IN_HAND &&
            player.cards.every(
                card => card.slice(-1) === player.cards[0].slice(-1)
            )
        ) {
            game.phase = 'finished';
            game.winner = player.id;
            return player.id;
        }
    }

    return null;
}

// ============================================================================
// PLAYER VIEW (for sending game state to clients)
// ============================================================================

/** 
 * Get a player-specific view of the game state
 * 
 * Hides private information from other players:
 * - Other players' cards 
 * 
 * After game ends, all information becomes public.
 */
export function getPlayerView(game, playerId) {
    const playerIndex = game.players.findIndex(p => p.id === playerId);

    if(playerIndex === -1) {
        return { success: false, error: 'Player not found' };
    }
  
    // After game ends, all information is public
    const isGameOver = game.phase === 'finished';

    return {
        phase: game.phase,
        turnPhase: game.turnPhase,
        turnChoice: game.turnChoice ?? 'none',

        hostId: game.hostId,
        currentPlayerIndex: game.currentPlayerIndex,
        currentPlayerId: game.players[game.currentPlayerIndex]?.id,

        openCard: game.openCard,
        deckCount: game.deck.length,
        winner: game.winner ?? null,

        players: game.players.map((player, index) => ({
            id: player.id,
            name: player.name,
            color: player.color,
            turnOrder: player.turnOrder,
            cardCount: player.cards.length,

            cards:
                game.phase === 'finished' || index === playerIndex
                    ? [...player.cards]
                    : null
        }))
    };
}
