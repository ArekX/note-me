interface LogoProps {
  height?: number;
  width?: number;
  white?: boolean;
}

export function Logo(props: LogoProps) {
  return (
    <img
      src={`/logo${props.white ? "-white" : ""}.svg`}
      alt="NoteMe"
      height={props.height ?? 32}
      width={props.height ?? 32}
      class={`inline-block`}
    />
  );
}
