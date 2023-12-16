interface IconProps {
  name: string;
}

export function Icon(
  props: IconProps,
) {
  return (
    <span class="material-symbols-outlined align-middle">{props.name}</span>
  );
}
