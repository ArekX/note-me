export const inputHandler =
    (handler: (value: string) => void) => (event: Event) => {
        handler((event.target as HTMLInputElement).value);
    };
