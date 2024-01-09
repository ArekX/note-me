import { GroupRecord } from "$backend/repository/group-repository.ts";
import { Icon } from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { NoteRecord } from "$backend/repository/note-repository.ts";
import IconMenu from "$islands/IconMenu.tsx";
import { activeMenuRecordId } from "$frontend/stores/active-sidebar-item.ts";

export type ContainerGroupRecord = GroupItem | NoteItem;

interface ContainerRecordBase {
  is_new_record: boolean;
  is_processing: boolean;
  edit_mode: boolean;
  name: string;
  parent: ContainerGroupRecord | null;
  children: ContainerGroupRecord[];
}

interface GroupItem extends ContainerRecordBase {
  type: "group",
  record: GroupRecord;
}

interface NoteItem extends ContainerRecordBase {
  type: "note",
  record: NoteRecord;
}

interface GroupItemProps {
  parent: ContainerGroupRecord | null;
  container: ContainerGroupRecord;
  onAccept: (container: ContainerGroupRecord, newName: string) => void;
  onCancel: (container: ContainerGroupRecord, parent: ContainerGroupRecord | null) => void;
  onAddNote: (container: ContainerGroupRecord, parent: ContainerGroupRecord | null) => void;
  onAddGroup: (container: ContainerGroupRecord, parent: ContainerGroupRecord | null) => void;
  onRename: (container: ContainerGroupRecord) => void;
  onRefresh: (container: ContainerGroupRecord) => void;
  onDelete: (container: ContainerGroupRecord) => void;
  onLoadChildren: (container: ContainerGroupRecord) => void;
}

export default function GroupItem({
  parent,
  container,
  onAccept,
  onAddNote,
  onAddGroup,
  onCancel,
  onRename,
  onRefresh,
  onDelete,
  onLoadChildren
}: GroupItemProps) {
  const name = useSignal(container.name);
  const isOpen = useSignal(false);
  const areChildrenLoaded = useSignal(false);

  const handleCancel = () => {
    const newRecordCount = container.children.filter(c => c.is_new_record).length;

    if (newRecordCount === container.children.length) {
      isOpen.value = false;
    }

    name.value = container.name;
    onCancel(container, parent);
  };

  const handleOpenFolder = () => {

    if (
      (container.type == "note") ||
      (container.type == "group" && (!container.record.has_notes && !container.record.has_subgroups && container.children.length == 0))
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
    <div class="group-item-container" onClick={(e) => {
      handleOpenFolder();
      e.stopPropagation();
    }}>
      <div class={`relative group-item hover:bg-gray-600 ${activeMenuRecordId.value == container.record.id ? 'opened-menu' : ''}`}>
        {!container.edit_mode && <div class="absolute right-0 flex items-center group-item-actions pr-1">
          <span class="hover:text-gray-300 cursor-pointer" title="Add Note" onClick={() => onAddNote(container, parent)}>
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
                name: "Rename",
                icon: "edit",
                onClick: () => onRename(container)
              },
              {
                name: "Refresh",
                icon: "refresh",
                onClick: () => onRefresh(container)
              },
              {
                name: "Delete",
                icon: "minus-circle",
                onClick: () => onDelete(container)
              }
            ]} />
        </div>}
        {container.edit_mode ?
          <div class="group-item-editor relative flex">

            <div
              class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
            >
              {!container.is_processing && <span>
                <span class="hover:text-white cursor-pointer" title="Accept" onClick={(e) => {
                  onAccept(container, name.value);
                  e.stopPropagation();
                }}><Icon name="check" /></span>
                <span class="hover:text-white cursor-pointer" title="Cancel" onClick={(e) => {
                  handleCancel();
                  e.stopPropagation();
                }}><Icon name="block" /></span>
              </span>}
              {container.is_processing && <Icon name="loader-alt" animation="spin" />}
            </div>
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
              onInput={(e) => name.value = (e.target as HTMLInputElement).value}
            />
          </div>
          :
          <span class="group-item-name pl-2">
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
          onAccept={onAccept}
          onCancel={onCancel}
          onAddNote={onAddNote}
          onAddGroup={onAddGroup}
          onRename={onRename}
          onDelete={onDelete}
          onRefresh={onRefresh}
          onLoadChildren={onLoadChildren}
        />)}
      </div>}
    </div>
  );
}
