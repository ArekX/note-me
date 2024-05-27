export default function NoteLayout(props: { children: React.ReactNode }) {
    return (
        <div className="text-white pb-4 pt-4 pr-6 pl-6">
            {props.children}
        </div>
    );
}
