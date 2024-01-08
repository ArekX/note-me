import { Signal, useSignal } from "@preact/signals";
import SearchBar from "./SearchBar.tsx";
import Loader from "$islands/Loader.tsx";
import { createGroup, findGroups, updateGroup } from "$frontend/api.ts";
import { useEffect } from "preact/hooks";
import { FindGroupsRequest } from "../../routes/api/find-groups.ts";
import { Icon } from "$components/Icon.tsx";
import GroupItem, { ContainerGroupRecord } from "$islands/groups/GroupItem.tsx";
import { record } from "https://deno.land/x/zod@v3.22.4/types.ts";

export default function GroupList() {
  const isLoading = useSignal(true);
  const groups: Signal<ContainerGroupRecord[]> = useSignal([]);

  const searchNotesAndGroups = async (query: string) => {
  };

  const loadGroups = async (parent_id?: string) => {
    isLoading.value = true;
    const request = {} as FindGroupsRequest;

    if (parent_id) {
      request.parent_id = parent_id;
    }

    const result = await findGroups(request);

    // TODO: Need to add to PARENT record.
    groups.value = result.data.map(record => ({
      is_new_record: false,
      is_processing: false,
      name: record.name,
      type: "group",
      edit_mode: false,
      record,
      children: []
    }));
    isLoading.value = false;
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const addRootGroup = () => {
    groups.value = [...groups.value, {
      is_new_record: true,
      is_processing: false,
      name: "",
      type: "group",
      edit_mode: true,
      record: {
        id: 0,
        name: "",
        created_at: 0,
        parent_id: null,
      },
      children: []
    }];
  };

  const saveGroup = async (container: ContainerGroupRecord) => {
    container.is_processing = true;
    if (container.is_new_record && container.type === "group") {

      const result = await createGroup({
        name: container.name,
        parent_id: container.record.parent_id,
      });

      container.record = result.data;
      container.edit_mode = false;
      container.is_new_record = false;

    } else if (!container.is_new_record && container.type == "group") {
      container.is_processing = true;
      await updateGroup({
        id: container.record.id,
        name: container.name,
        parent_id: container.record.parent_id,
      });

      container.edit_mode = false;
      container.record.name = container.name;
    }
    container.is_processing = false;
    groups.value = [...groups.value];
  };

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
          <span class="cursor-pointer hover:text-gray-300" title="Add Group" onClick={addRootGroup}>
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
        {groups.value.map((group) => <GroupItem
          container={group}
          onAccept={(group, newName) => {
            group.name = newName;
            saveGroup(group);
          }}
          onCancel={() => {
            if (group.is_new_record) {
              // TODO: This check needs to be nested
              groups.value = groups.value.filter(g => g !== group);
              return;
            }

            group.edit_mode = false;
            groups.value = [...groups.value];
          }}
          onAddNote={() => { }}
          onAddGroup={() => { }}
          onRename={(group) => {
            group.edit_mode = true;
            groups.value = [...groups.value];

          }}
        />)}
        {groups.value.length === 0 && !isLoading.value && <div class="text-center text-gray-400 pt-14">
          <div><Icon name="note" size="5xl" /></div>
          Add your first note with <Icon name="plus" />!
        </div>}
      </div>
    </div>
  );
}
