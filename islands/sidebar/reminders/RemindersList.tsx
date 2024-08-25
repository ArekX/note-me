import { ComponentChild } from "preact";
import { useLoadMore } from "$frontend/hooks/use-load-more.ts";
import { ReminderNoteRecord } from "$backend/repository/note-reminder-repository.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    FindNoteRemindersMessage,
    FindNoteRemindersResponse,
    NoteFrontendResponse,
} from "$workers/websocket/api/notes/messages.ts";
import Loader from "$islands/Loader.tsx";
import LoadMoreWrapper from "$islands/LoadMoreWrapper.tsx";
import ReminderItem from "$islands/sidebar/reminders/ReminderItem.tsx";
import NoItemMessage from "../NoItemMessage.tsx";
import { useEffect } from "preact/hooks";
import { useSearch } from "$frontend/hooks/use-search.ts";
import SwitcherContainer from "$islands/sidebar/SwitcherContainer.tsx";
import SidebarPanelContents from "$islands/sidebar/SidebarPanelContents.tsx";

interface ReminderListProps {
    switcherComponent: ComponentChild;
}

export default function RemindersList({
    switcherComponent,
}: ReminderListProps) {
    const search = useSearch();

    const { sendMessage } = useWebsocketService<NoteFrontendResponse>({
        eventMap: {
            notes: {
                updateNoteResponse: () => reload(),
                setReminderResponse: () => reload(),
                removeReminderResponse: () => reload(),
            },
        },
    });

    const reload = () => {
        reset();
        loadMore();
    };

    const {
        records,
        hasMore,
        loader,
        reset,
        loadMore,
    } = useLoadMore<ReminderNoteRecord>({
        onLoadMore: async (lastRecord: ReminderNoteRecord | null) => {
            const response = await sendMessage<
                FindNoteRemindersMessage,
                FindNoteRemindersResponse
            >("notes", "findNoteReminders", {
                data: {
                    filters: {
                        fromNextAt: lastRecord?.next_at ?? 0,
                        fromId: lastRecord?.id ?? 0,
                        limit: 10,
                    },
                },
                expect: "findNoteRemindersResponse",
            });

            return response.records;
        },
        limit: 10,
        loaderInitialValue: true,
    });

    useEffect(() => {
        loadMore();
        search.setType("reminders");
    }, []);

    return (
        <SidebarPanelContents
            controlPanel={
                <SwitcherContainer
                    switcherComponent={switcherComponent}
                    icons={[
                        {
                            name: "Reload",
                            icon: "refresh",
                            onClick: reload,
                        },
                    ]}
                />
            }
        >
            {loader.running
                ? (
                    <div class="text-center py-4">
                        <Loader color="white" />
                    </div>
                )
                : (
                    <>
                        {records.value.length === 0 && (
                            <NoItemMessage
                                icon="alarm"
                                message="No reminders currently set."
                            />
                        )}
                        <LoadMoreWrapper
                            addCss="search-view-height"
                            hasMore={hasMore.value}
                            onLoadMore={loadMore}
                        >
                            <div>
                                {records.value.map((record) => (
                                    <ReminderItem
                                        key={record.id}
                                        record={record}
                                    />
                                ))}
                            </div>
                        </LoadMoreWrapper>
                    </>
                )}
        </SidebarPanelContents>
    );
}
