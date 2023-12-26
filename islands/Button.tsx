interface ButtonProps {
  name: string;
  onClick?: () => void;
}

export default function Button({ name, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      class="bg-sky-800 text-white p-2 rounded-lg hover:bg-sky-950 border-s-sky-950-50"
    >
      {name}
    </button>
  );
}
