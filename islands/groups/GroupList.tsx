import { Signal, useSignal } from "@preact/signals";
import SearchBar from "./SearchBar.tsx";
import Loader from "$islands/Loader.tsx";
import { findGroups } from "$frontend/api.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { useEffect } from "preact/hooks";
import { FindGroupsRequest } from "../../routes/api/find-groups.ts";
import { Icon } from "$components/Icon.tsx";
import GroupItem from "$islands/groups/GroupItem.tsx";

export default function GroupList() {
  const isLoading = useSignal(true);
  const groups: Signal<GroupRecord[]> = useSignal([]);

  const searchNotesAndGroups = async (query: string) => {
  };

  const loadGroups = async (parent_id?: string) => {
    isLoading.value = true;
    const request = {} as FindGroupsRequest;

    if (parent_id) {
      request.parent_id = parent_id;
    }

    const result = await findGroups(request);

    groups.value = result.data;
    isLoading.value = false;
  };

  useEffect(() => {
    loadGroups();
  }, []);

  return (
    <div class="mt-3">
      <SearchBar onSearch={searchNotesAndGroups} />
      <div class="flex pl-2 pr-">
        <div class="flex-1 pt-1 text-sm">
          Notes
        </div>
        <div class="flex-1 text-right opacity-30 hover:opacity-100 pr-1">
          <span class="cursor-pointer hover:text-gray-300" title="Add Note">
            <Icon name="plus" />
          </span>
          <span class="cursor-pointer hover:text-gray-300" title="Add Group">
            <Icon name="folder-plus" />
          </span>
        </div>
      </div>
      <div>
        <Loader
          color="white"
          visible={isLoading.value}
          displayType="center-block"
        >
          Loading notes and groups...
        </Loader>
        <GroupItem
          record={{
            id: 0,
            name: "Group item",
            parent_id: null,
          }}
          onSave={() => {}}
        />
      </div>
    </div>
  );
}
