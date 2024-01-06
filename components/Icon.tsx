interface IconProps {
  name: string;
  type?: "regular" | "solid";
}

export function Icon(
  { name, type = "regular" }: IconProps,
) {
  return (
    <i
      class={`bx bx${
        type == "regular" ? "" : "s"
      }-${name} text-2xl align-middle`}
    >
    </i>
  );
}
