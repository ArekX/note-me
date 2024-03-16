interface IconProps {
    name: string;
    type?: "regular" | "solid";
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
    animation?:
        | "spin"
        | "tada"
        | "flashing"
        | "burst"
        | "fade-left"
        | "fade-right"
        | "fade-up"
        | "fade-down";
}

export function Icon(
    { name, type = "regular", size = "2xl", animation }: IconProps,
) {
    return (
        <i
            class={`bx bx${type == "regular" ? "" : "s"}-${name} text-${size} ${
                animation ? `bx-${animation}` : ""
            } align-middle`}
        >
        </i>
    );
}
