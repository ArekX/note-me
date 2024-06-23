import { JSX } from "preact";

export type PickerMap<T extends string | number | symbol, Props = never> = {
    [K in T]: (props: Props) => JSX.Element;
};

interface PickerProps<
    T extends string | number | symbol,
    Props,
> {
    selector: T | null;
    propsGetter?: () => Props;
    map: PickerMap<T, Props>;
    defaultComponent?: (props: Props) => JSX.Element;
}

export default function Picker<
    T extends string | number | symbol,
    Props = never,
>({
    selector,
    map,
    propsGetter,
    defaultComponent,
}: PickerProps<T, Props>): JSX.Element | null {
    return selector && selector in map
        ? map[selector](propsGetter?.() ?? {} as never)
        : defaultComponent?.(propsGetter?.() ?? {} as never) ?? null;
}
