interface IconProps {
    name: string;
    type?: "regular" | "solid";
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
    onClick?: () => void;
    className?: string;
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

export default function Icon(
    {
        name,
        type = "regular",
        size = "2xl",
        animation,
        onClick,
        className = "",
    }: IconProps,
) {
    return (
        <i
            class={`bx bx${type == "regular" ? "" : "s"}-${name} text-${size} ${
                animation ? `bx-${animation}` : ""
            } align-middle ${className}`}
            onClick={onClick}
        >
        </i>
    );
}
