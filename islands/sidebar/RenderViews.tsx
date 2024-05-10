import { RemindersList } from "$islands/sidebar/RemindersList.tsx";
import { SharedNotesList } from "$islands/sidebar/SharedNotesList.tsx";
import { ComponentChild, VNode } from "preact";
import { NewTreeList } from "../tree/TreeList.tsx";

interface RendererProps {
    searchQuery: string;
    switcher: ComponentChild;
}

type RendererTypes = "notes" | "shared" | "reminders";

type RendererFn = (data: RendererProps) => VNode<unknown>;

const RenderGroupList = (data: RendererProps) => (
    <NewTreeList
        searchQuery={data.searchQuery}
        switcherComponent={data.switcher}
    />
);

const RenderRemindersList = (data: RendererProps) => (
    <RemindersList switcherComponent={data.switcher} />
);

const RenderSharedNotesList = (data: RendererProps) => (
    <SharedNotesList switcherComponent={data.switcher} />
);

export const RendererViews: Record<RendererTypes, RendererFn> = {
    notes: RenderGroupList,
    shared: RenderSharedNotesList,
    reminders: RenderRemindersList,
};
