export const when = <TrueType, FalseType>(
    condition: () => boolean,
    onTrue: () => Promise<TrueType>,
    onFalse?: () => Promise<FalseType>,
): Promise<TrueType | FalseType | null> => {
    if (condition()) {
        return onTrue();
    }

    return onFalse ? onFalse() : Promise.resolve(null);
};
