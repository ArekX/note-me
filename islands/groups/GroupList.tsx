import { Signal, useSignal } from "@preact/signals";
import SearchBar from "./SearchBar.tsx";
import Loader from "$islands/Loader.tsx";
import { createGroup, findGroups, updateGroup } from "$frontend/api.ts";
import { useEffect } from "preact/hooks";
import { FindGroupsRequest } from "../../routes/api/find-groups.ts";
import { Icon } from "$components/Icon.tsx";
import GroupItem, { ContainerGroupRecord, createContainer, createNewContainerRecord } from "$islands/groups/GroupItem.tsx";
import { clearPopupOwner } from "$frontend/stores/active-sidebar-item.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { deleteGroup } from "$frontend/api.ts";
import { validateClientSchema } from "$backend/schemas.ts";
import { deleteRequestSchema } from "../../routes/api/delete-group.ts";
import { addGroupRequestSchema } from "../../routes/api/add-group.ts";

export default function GroupList() {
  const isLoading = useSignal(true);
  const groups: Signal<ContainerGroupRecord[]> = useSignal([]);

  const searchNotesAndGroups = async (query: string) => {
  };

  const loadGroups = async (parent?: ContainerGroupRecord) => {
    if (!parent) {
      isLoading.value = true;
    } else {
      parent.is_processing = true;
    }

    const request: FindGroupsRequest = {};

    if (parent) {
      request.parent_id = parent.record.id.toString();
    }

    const result = (await findGroups(request)).data.map((record: GroupRecord) => createContainer({
      type: "group",
      record
    }, parent ?? null));


    if (!parent) {
      groups.value = result;
    } else {
      parent.children = result;
      updateToRoot(parent);
    }

    if (!parent) {
      isLoading.value = false;
    } else {
      parent.is_processing = false;
    }
  };

  const addRootGroup = () => {
    groups.value = [...groups.value, createNewContainerRecord("group", null, null)];
  };

  const saveGroup = async (container: ContainerGroupRecord) => {
    container.is_processing = true;

    const { is_new_record, name, type, record } = container;

    if (type !== "group") {
      return;
    }

    container.is_processing = true;

    if (is_new_record) {
      container.record = (await createGroup({
        name,
        parent_id: record.parent_id,
      })).data;
      container.is_new_record = false;
    } else {
      await updateGroup({
        id: record.id,
        name,
        parent_id: container.record.parent_id,
      });
      container.record.name = container.name;
    }

    container.edit_mode = false;
    container.is_processing = false;
    updateToRoot(container);
  };

  const updateToRoot = (container: ContainerGroupRecord) => {
    container.children = [...container.children];
    let parent = container.parent;
    while (parent) {
      parent.children = [...parent.children];
      parent = parent.parent;
    }
    groups.value = [...groups.value];
  };

  const reloadEverything = () => {
    groups.value = [];
    loadGroups();
  };

  const handleCancelEdit = (container: ContainerGroupRecord, parent: ContainerGroupRecord | null) => {

    if (container.is_new_record) {
      if (parent === null) {
        groups.value = groups.value.filter(g => g !== container);
      } else {
        parent.children = parent.children.filter(g => g !== container);
      }
    }

    container.edit_mode = false;

    if (container) {
      updateToRoot(container);
    }

  };

  const handleAcceptEdit = async (container: ContainerGroupRecord, newName: string) => {

    // TODO: Needs fixing
    await validateClientSchema(addGroupRequestSchema, { name: newName });


    container.name = newName;
    await saveGroup(container);
    updateToRoot(container);
  };

  const handleAddGroup = (container: ContainerGroupRecord) => {
    container.children.push(createNewContainerRecord("group", container.record.id, container));
    updateToRoot(container);
  };

  const handleRename = (container: ContainerGroupRecord) => {
    container.edit_mode = true;
    updateToRoot(container);
  };

  const handleLoadchildren = (container: ContainerGroupRecord) => {
    loadGroups(container);
  };

  const handleAddNote = (container: ContainerGroupRecord) => { };

  const handleDelete = async (container: ContainerGroupRecord, parent?: ContainerGroupRecord) => {
    container.is_processing = true;
    await deleteGroup(container.record.id);

    if (parent) {
      parent.children = parent.children.filter(g => g !== container);
      updateToRoot(parent);
      return;
    }

    groups.value = groups.value.filter(g => g !== container);
  };

  useEffect(() => {
    loadGroups();
    clearPopupOwner();
  }, []);

  return (
    <div class="mt-3">
      <SearchBar onSearch={searchNotesAndGroups} />
      <div class="flex pl-2 select-none">
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
          <span class="cursor-pointer hover:text-gray-300" title="Reload" onClick={reloadEverything}>
            <Icon name="refresh" />
          </span>
        </div>
      </div>
      <div class="overflow-auto group-list">
        <Loader
          color="white"
          visible={isLoading.value}
          displayType="center-block"
        >
          Loading notes and groups...
        </Loader>
        {groups.value.map((group) => <GroupItem
          container={group}
          parent={null}
          onAcceptEdit={handleAcceptEdit}
          onCancelEdit={handleCancelEdit}
          onAddNote={handleAddNote}
          onAddGroup={handleAddGroup}
          onRename={handleRename}
          onLoadChildren={handleLoadchildren}
          onDelete={handleDelete}
        />)}
        {groups.value.length === 0 && !isLoading.value && <div class="text-center text-gray-400 pt-14">
          <div><Icon name="note" size="5xl" /></div>
          Add your first note with <Icon name="plus" />!
        </div>}
      </div>
    </div>
  );
}
