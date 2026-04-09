import { engine } from './engine.js';
import { CONFIG } from './config.js';

export function createGame() {
    return {
        state:   engine.createGame(),
        canRoll: true,        // REQ allowed only if last take made
        messages: []          // for UI feed
    };
}

export function addMessage(game, text, temporary = false) {
    const timestamp = Date.now();
    game.messages.push({ text, timestamp, temporary });
    // Keep max 20 messages for feed
    if (game.messages.length > 20) game.messages.shift();
    return game;
}

// Attempt a roll (REQ)
export function roll(game) {
    const { state, canRoll } = game;

    if (!canRoll && !state.freshRoll) {
        return addMessage(game, 'You must take at least one die before rolling.', true);
    }

    const newState = engine.roll(state, null, state.freshRoll);
    const farkle = engine.isFarkle(newState);

    if (farkle) {
        addMessage(game, 'FARKLE! Bust.', true);

        return {
            ...game,
            state: { ...newState, handScore: 0, dice: [], freshRoll: true },
            canRoll: true
        };
    }

    return {
        ...game,
        state: newState,
        canRoll: false
    };
}

// Attempt a take (LOK)
export function take(game, selectedIndexes) {
    const { state } = game;

    if (!selectedIndexes.length) {
        return addMessage(game, 'You must take at least one die.', true);
    }

    const newState = engine.take(state, selectedIndexes);

    const msg = `Took dice [${selectedIndexes.map(i => state.dice[i]).join(', ')}], scored ${newState.handScore - state.handScore}`;
    addMessage(game, msg);

    return {
        ...game,
        state: newState,
        canRoll: true
    };
}

// Attempt to bank points (EXF)
export function bank(game) {
    const { state } = game;

    if (state.handScore < CONFIG.minBank) {
        return addMessage(game, `Must score at least ${CONFIG.minBank} before banking.`, true);
    }

    const newState = engine.bank(state);
    addMessage(game, `Banked ${state.handScore} points! Total: ${newState.totalScore}`);

    return {
        ...game,
        state: newState,
        canRoll: true
    };
}

// Quick helper for UI to show hot-hand notification
export function isHotHand(game) {
    return game.state.hotHand;
}

// UI helpers for roll/take counters
export function getRollCounters(game) { return game.state.rollCounters; }
export function getTakeCounters(game) { return game.state.takeCounters; }
