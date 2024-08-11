import ExportMyData from "./ExportMyData.tsx";
import ImportNotes from "$islands/data/ImportNotes.tsx";

export default function DataPage() {
    return (
        <div>
            <div>
                <ExportMyData />
            </div>
            <div class="py-4">
                <ImportNotes />
            </div>
        </div>
    );
}
