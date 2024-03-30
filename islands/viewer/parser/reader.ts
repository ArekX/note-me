export interface Reader {
    next: (amount?: number) => void;
    peek: (amount?: number) => string;
    isEof: () => boolean;
    getAt: () => { line: number; character: number };
}

export const createReader = (input: string): Reader => {
    let pos = 0;
    let characterPos = 0;
    let linePos = 0;

    return {
        next: (amount: number = 1): void => {
            for (let i = 0; i < amount; i++) {
                if (input[pos + i] === "\n") {
                    linePos++;
                    characterPos = 0;
                } else {
                    characterPos++;
                }
                pos++;
            }
        },
        peek: (amount: number = 1) =>
            amount == 1 ? input[pos] : input.slice(pos, pos + amount),
        isEof: () => pos >= input.length,
        getAt: () => ({ line: linePos, character: characterPos }),
    };
};
