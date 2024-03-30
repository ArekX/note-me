type Arraylike<T> = {
    [key: number]: T;
    length: number;
    slice: (start: number, end: number) => Arraylike<T>;
};

export interface Reader<T> {
    next: (amount?: number) => void;
    peek: (amount?: number) => T | Arraylike<T>;
    isEof: () => boolean;
    begin: () => void;
    rollback: () => void;
    commit: () => void;
    getAt: () => { line: number; character: number };
}

export const createReader = <T>(
    input: Arraylike<T>,
): Reader<T> => {
    let pos = 0;
    let characterPos = 0;
    let linePos = 0;
    const posStack: number[] = [];

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
        begin: () => posStack.push(pos),
        rollback: () => {
            if (posStack.length === 0) {
                throw new Error("No state to pop.");
            }
            pos = posStack.pop()!;
        },
        commit: () => {
            if (posStack.length === 0) {
                throw new Error("No state to pop.");
            }
            posStack.pop()!;
        },
        isEof: () => pos >= input.length,
        getAt: () => ({ line: linePos, character: characterPos }),
    };
};
