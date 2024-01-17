import { GroupRecord } from "$backend/repository/group-repository.ts";
import { Icon } from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import IconMenu from "$islands/IconMenu.tsx";
import { activeMenuRecordId, clearPopupOwner } from "$frontend/stores/active-sidebar-item.ts";
import ConfirmDialog from "$islands/ConfirmDialog.tsx";

export type ContainerGroupRecord = GroupItemRecord | NoteItemRecord;

interface ContainerRecordBase {
  is_new_record: boolean;
  is_processing: boolean;
  edit_mode: boolean;
  name: string;
  parent: ContainerGroupRecord | null;
  children: ContainerGroupRecord[];
}

export interface GroupItemRecord extends ContainerRecordBase {
  type: "group",
  record: GroupRecord;
}

export interface NoteItemRecord extends ContainerRecordBase {
  type: "note",
  record: NoteRecord;
}

interface GroupItemProps {
  parent: ContainerGroupRecord | null;
  container: ContainerGroupRecord;
  onAcceptEdit: (container: ContainerGroupRecord, newName: string) => void;
  onCancelEdit: (container: ContainerGroupRecord, parent: ContainerGroupRecord | null) => void;
  onAddNote: (container: ContainerGroupRecord, parent: ContainerGroupRecord | null) => void;
  onAddGroup: (container: ContainerGroupRecord, parent: ContainerGroupRecord | null) => void;
  onRename: (container: ContainerGroupRecord) => void;
  onDelete: (container: ContainerGroupRecord) => void;
  onLoadChildren: (container: ContainerGroupRecord) => void;
}

export type RecordItem = { type: "group", record: GroupRecord } | { type: "note", record: NoteRecord };

export const createNewContainerRecord = (type: "group" | "note", parent_id: number | null, parent: ContainerGroupRecord | null): ContainerGroupRecord => {

  const newRecordFields = {
    is_new_record: true,
  };

  if (type == "group") {
    const record: GroupRecord = {
      id: 0,
      name: "",
      created_at: 0,
      parent_id,
      has_notes: null,
      has_subgroups: null,
    };

    return {
      ...createContainer({
        type,
        record,
      }, parent),
      ...newRecordFields,
      edit_mode: true
    };
  }

  const record: NoteRecord = {
    id: 0,
    title: "",
    note: "",
    created_at: 0,
    user_id: 0,
    updated_at: 0
  };

  return {
    ...createContainer({
      type,
      record,
    }, parent),
    ...newRecordFields,
    edit_mode: true
  };
};

export const createContainer = (item: RecordItem, parent: ContainerGroupRecord | null): ContainerGroupRecord => {
  const { type, record } = item;
  const containerProps = {
    is_new_record: false,
    is_processing: false,
    edit_mode: false,
    type,
    parent,
    children: []
  };


  if (type === "note") {
    return {
      ...containerProps,
      name: record.title,
      record,
    } as ContainerGroupRecord;
  }

  return {
    ...containerProps,
    name: record.name,
    record,
  } as ContainerGroupRecord;
};

export default function GroupItem({
  parent,
  container,
  onAcceptEdit,
  onAddNote,
  onAddGroup,
  onCancelEdit,
  onRename,
  onDelete,
  onLoadChildren
}: GroupItemProps) {
  const name = useSignal(container.name);
  const isOpen = useSignal(false);
  const isConfirmingDelete = useSignal(false);
  const areChildrenLoaded = useSignal(false);

  const handleCancel = () => {
    const newRecordCount = container.children.filter(c => c.is_new_record).length;

    if (newRecordCount === container.children.length) {
      isOpen.value = false;
    }

    name.value = container.name;
    onCancelEdit(container, parent);
  };

  const handleOpenFolder = () => {

    const { edit_mode, type, record, children } = container;

    if (
      edit_mode ||
      (type == "note") ||
      (type == "group" && (!record.has_notes && !record.has_subgroups && children.length == 0))
    ) {
      return;
    }

    isOpen.value = !isOpen.value;

    if (isOpen.value && !areChildrenLoaded.value) {
      onLoadChildren(container);
    }
  };

  useEffect(() => {
    name.value = container.name;
  }, [container.name]);

  return (
    <div class="group-item-container select-none" onClick={(e) => {
      clearPopupOwner();
      handleOpenFolder();
      e.stopPropagation();
    }}>
      <div class={`relative group-item hover:bg-gray-600 ${activeMenuRecordId.value == container.record.id ? 'opened-menu' : ''}`} title={container.name}>
        {!container.edit_mode && !container.is_processing && <div class="absolute right-0 flex items-center group-item-actions pr-1">
          <span class="hover:text-gray-300 cursor-pointer" title="Add Note" onClick={(e) => {
            onAddNote(container, parent);
            clearPopupOwner();
            e.stopPropagation();
          }}>
            <Icon name="plus" />
          </span>
          <IconMenu iconName="dots-horizontal-rounded"
            recordId={container.record.id}
            menuItems={[
              {
                name: "Add Note",
                icon: "plus",
                onClick: () => {
                  isOpen.value = true;
                  onAddNote(container, parent);
                }
              },
              {
                name: "Add Group",
                icon: "folder-plus",
                onClick: () => {
                  isOpen.value = true;
                  onAddGroup(container, parent);
                }
              },
              {
                name: "Refresh",
                icon: "refresh",
                onClick: () => {
                  container.children = [];
                  areChildrenLoaded.value = false;
                  onLoadChildren(container);
                }
              },
              {
                name: "Rename",
                icon: "edit",
                onClick: () => onRename(container)
              },
              {
                name: "Delete",
                icon: "minus-circle",
                onClick: () => isConfirmingDelete.value = true
              }
            ]} />
        </div>}
        {container.is_processing && <div class="absolute inset-y-0 right-0 flex items-center pl-2 pr-2 text-gray-400">
          <Icon name="loader-alt" animation="spin" />
        </div>}

        {container.edit_mode ?
          <div class="group-item-editor relative flex">

            {!container.is_processing && <div
              class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
            >
              <span class="hover:text-white cursor-pointer" title="Accept" onClick={(e) => {
                onAcceptEdit(container, name.value);
                e.stopPropagation();
              }}><Icon name="check" /></span>
              <span class="hover:text-white cursor-pointer" title="Cancel" onClick={(e) => {
                handleCancel();
                e.stopPropagation();
              }}><Icon name="block" /></span>

            </div>}
            <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
              <Icon name="folder" />
            </div>
            <input
              type="text"
              class="outline-none border-1 pl-9 pr-14 border-gray-900 bg-gray-700 p-2 w-full"
              placeholder="Enter group name..."
              autoFocus={true}
              disabled={container.is_processing}
              value={name.value}
              onKeyPress={(e) => {
                if (e.key == "Enter") {
                  onAcceptEdit(container, name.value);
                }
              }}
              onInput={(e) => name.value = (e.target as HTMLInputElement).value}
            />
          </div>
          :
          <span class="group-item-name pl-2 pr-2">
            <Icon name={container.type == "group" ? (isOpen.value ? "folder-open" : "folder") : "file"} type={
              container.type == "group" && (container.record.has_notes || container.record.has_subgroups || container.children.length > 0)
                ? "solid"
                : "regular"
            } />{' '}
            <span class="name-text">{container.name}</span>
          </span>
        }

      </div>
      {isOpen.value && <div class="group-item-children">
        {container.children.map((child) => <GroupItem
          container={child}
          parent={container}
          onAcceptEdit={onAcceptEdit}
          onCancelEdit={onCancelEdit}
          onAddNote={onAddNote}
          onAddGroup={onAddGroup}
          onRename={onRename}
          onDelete={onDelete}
          onLoadChildren={onLoadChildren}
        />)}
      </div>}
      <ConfirmDialog
        prompt={`Are you sure that you want to delete this ${container.type}?`}
        onConfirm={() => {
          isConfirmingDelete.value = false;
          onDelete(container);
        }}
        confirmColor="danger"
        confirmText={`Delete ${container.type}`}
        onCancel={() => {
          isConfirmingDelete.value = false;
        }}
        visible={isConfirmingDelete.value}
      />
    </div>
  );
}
