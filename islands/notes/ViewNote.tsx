import Viewer from "$islands/Viewer.tsx";
import { ViewNoteRecord } from "$backend/repository/note-repository.ts";
import { Button } from "$components/Button.tsx";
import { Icon } from "$components/Icon.tsx";
import { MoreMenu } from "$islands/notes/MoreMenu.tsx";

export interface ViewNoteProps {
    record: ViewNoteRecord;
}

export function ViewNote({ record }: ViewNoteProps) {
    return (
        <div class="view-note flex flex-col">
            <div class="flex flex-row">
                <div class="title w-10/12">
                    {record.title}
                </div>
                <div class="text-md ml-2 w-2/12 text-right">
                    <Button
                        color="success"
                        title="Edit"
                        onClick={() => {}}
                    >
                        <Icon name="pencil" size="lg" /> Edit
                    </Button>{" "}
                    <div class="text-left inline-block">
                        <MoreMenu onMenuItemClick={() => {}} />
                    </div>
                </div>
            </div>
            <div>
                {record.tags.map((tag) => (
                    <a href={`/notes?tag=${tag}`} class="tag">
                        {`#${tag}`}
                    </a>
                ))}
            </div>
            {record.group_name && (
                <div class="text-sm">&rarr; in {record.group_name}</div>
            )}
            <div>
                <Viewer markdownText={record.note} />
            </div>
        </div>
    );
}
