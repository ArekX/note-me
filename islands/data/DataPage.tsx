import ExportMyData from "./ExportMyData.tsx";
import ImportNotes from "$islands/data/ImportNotes.tsx";

export default function DataPage() {
    return (
        <div>
            <h1 class="text-xl font-semibold py-4">Data</h1>
            <div>
                <ExportMyData />
            </div>
            <div class="py-4">
                <ImportNotes />
            </div>
        </div>
    );
}
