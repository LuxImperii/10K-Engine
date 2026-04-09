import { CONFIG } from './config.js';

export function rollDice(count, faces) {
    const dice = [];
    for (let i = 0; i < count; i++) {
        dice.push(Math.floor(Math.random() * faces) + 1);
    }
    return dice;
}

export function generateFrequencyArray(dice) {
    const freq = Array(6).fill(0);
    dice.forEach(face => freq[face - 1]++);
    return freq;
}

// engine.js - updated evaluateHand + minor cleanups
export function evaluateHand(dice, scoring) {
    const freq = generateFrequencyArray(dice);
    let score = 0;
    const scoringDice = [];

    for (let i = 0; i < 6; i++) {
        const f = i + 1;
        let count = freq[i];
        const cfg = scoring.find(s => s.face === f);

        if (!cfg) continue;

        // Special rule: 6 of any kind = 5000
        if (count === 6) {
            score += 5000;
            for (let j = 0; j < 6; j++) scoringDice.push(f);
            continue;
        }

        // Normal sets of exactly 3 (no 4/5/6 beyond the special case)
        if (count >= 3) {
            score += cfg.set3;
            for (let j = 0; j < 3; j++) scoringDice.push(f);
            count -= 3;
        }

        // Solo scoring for remaining dice (only 1s and 5s)
        for (let j = 0; j < count; j++) {
            if (cfg.solo > 0) {
                score += cfg.solo;
                scoringDice.push(f);
            }
        }
    }

    return { score, scoringDice, freq };
}

export function removeSelectedDice(dice, selectedIndexes) {
    return dice.filter((_, idx) => !selectedIndexes.includes(idx));
}

export function createGame() {
    return {
        dice: [],
        handScore: 0,
        totalScore: 0,
        freshRoll: true,
        rollCounters: [0, 0, 0, 0, 0, 0],
        takeCounters: [0, 0, 0, 0, 0, 0]
    };
}

export const engine = {
	createGame,
    roll(state, count = null, fresh = false) {
        const diceCount = fresh ? CONFIG.diceCount : (count ?? state.dice.length);
        const dice = rollDice(diceCount, CONFIG.faces);

        const newRollCounters = [...state.rollCounters];
        dice.forEach(face => newRollCounters[face - 1]++);

        return {
            ...state,
            dice,
            rollCounters: newRollCounters,
            freshRoll: fresh
        };
    },

    take(state, selectedIndexes) {
        if (!selectedIndexes.length) return state;

        const selectedDiceFaces = selectedIndexes.map(idx => state.dice[idx]);
        const { score, scoringDice } = evaluateHand(selectedDiceFaces, CONFIG.scoring);

        const newTakeCounters = [...state.takeCounters];
        selectedDiceFaces.forEach(face => newTakeCounters[face - 1]++);

        const remainingDice = removeSelectedDice(state.dice, selectedIndexes);

        let hotHand = false;
        if (remainingDice.length === 0 && scoringDice.length === selectedDiceFaces.length) {
            hotHand = true;
        }

        const newDice = hotHand ? rollDice(CONFIG.diceCount, CONFIG.faces) : remainingDice;

        const newRollCounters = hotHand ? [...state.rollCounters] : state.rollCounters;
        if (hotHand) {
            newDice.forEach(face => newRollCounters[face - 1]++);
        }

        return {
            ...state,
            dice: newDice,
            handScore: state.handScore + score,
            rollCounters: newRollCounters,
            takeCounters: newTakeCounters,
            freshRoll: false,
            hotHand
        };
    },

    isFarkle(state) {
        const { score } = evaluateHand(state.dice, CONFIG.scoring);
        return score === 0;
    },

    bank(state) {
        if (state.handScore < CONFIG.minBank) return state;
        return {
            ...state,
            totalScore: state.totalScore + state.handScore,
            handScore: 0,
            dice: [],
            freshRoll: true
        };
    },

    evaluateHand // export for UI
};
