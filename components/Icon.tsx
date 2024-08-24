export type IconSize =
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl";

interface IconProps {
    name: string;
    type?: "regular" | "solid" | "logo";
    size?: IconSize;
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

const iconSettings = {
    markdown: {
        modifier: "l",
    },
};

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
    let modifier = name in iconSettings
        ? iconSettings[name as keyof typeof iconSettings].modifier
        : "";

    if (type === "solid") {
        modifier = "s";
    } else if (type === "logo") {
        modifier = "l";
    }

    return (
        <i
            class={`bx bx${modifier}-${name} text-${size} ${
                animation ? `bx-${animation}` : ""
            } align-middle ${className}`}
            onClick={onClick}
        >
        </i>
    );
}
