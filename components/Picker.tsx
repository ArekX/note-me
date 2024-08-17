import { FunctionalComponent } from "preact";
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
    Props extends object = never,
>({
    selector,
    map,
    propsGetter,
    defaultComponent: DefaultComponent,
}: PickerProps<T, Props>): JSX.Element | null {
    const props = propsGetter?.() ?? {} as Props;

    if (selector && selector in map) {
        const PickedComponent: FunctionalComponent<Props> = map[selector];
        return <PickedComponent key={selector} {...props} />;
    }

    if (DefaultComponent) {
        return <DefaultComponent key={selector} {...props} />;
    }

    return null;
}
