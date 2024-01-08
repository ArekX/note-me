import { GroupRecord } from "$backend/repository/group-repository.ts";
import { Icon } from "$components/Icon.tsx";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { NoteRecord } from "$backend/repository/note-repository.ts";

export type ContainerGroupRecord = GroupItem | NoteItem;

interface ContainerRecordBase {
  is_new_record: boolean;
  is_processing: boolean;
  edit_mode: boolean;
  name: string;
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
  container: ContainerGroupRecord;
  onAccept: (record: ContainerGroupRecord, newName: string) => void;
  onCancel: (record: ContainerGroupRecord) => void;
  onAddNote: (record: ContainerGroupRecord) => void;
  onAddGroup: (record: ContainerGroupRecord) => void;
  onRename: (record: ContainerGroupRecord) => void;
}

export default function GroupItem({ container, onAccept, onCancel, onRename }: GroupItemProps) {
  const name = useSignal(container.name);

  const handleCancel = () => {
    name.value = container.name;
    onCancel(container);
  };

  useEffect(() => {
    name.value = container.name;
  }, [container.name]);

  return (
    <div class="relative group-item hover:bg-gray-600">
      {!container.edit_mode && <div class="absolute right-0 flex items-center group-item-actions pr-1">
        <span class="hover:text-gray-300 cursor-pointer" title="Add Note">
          <Icon name="plus" />
        </span>
        <span class="hover:text-gray-300 cursor-pointer" title="Add Group">
          <Icon name="folder-plus" />
        </span>
        <span class="hover:text-gray-300 cursor-pointer" title="Rename" onClick={() => onRename(container)}>
          <Icon name="edit" />
        </span>
      </div>}
      {container.edit_mode ?
        <div class="group-item-editor relative flex">

          <div
            class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400"
          >
            {!container.is_processing && <span class="hover:text-white cursor-pointer" title="Accept" onClick={() => onAccept(container, name.value)}><Icon name="check" /></span>}
            {!container.is_processing && <span class="hover:text-white cursor-pointer" title="Cancel" onClick={handleCancel}><Icon name="block" /></span>}
            {container.is_processing && <Icon name="loader-alt" animation="spin" />}
          </div>
          <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
            <Icon name="folder" />
          </div>
          <input
            type="text"
            class="outline-none border-1 pl-9 pr-14 border-gray-900 bg-gray-700 p-2 w-full"
            placeholder="Enter group name..."
            disabled={container.is_processing}
            value={name.value}
            onInput={(e) => name.value = (e.target as HTMLInputElement).value}
          />
        </div>
        :
        <span class="group-item-name pl-2">
          <Icon name={container.type == "group" ? "folder" : "file"} />{' '}
          <span class="name-text">{container.name}</span>
        </span>
      }

    </div>
  );
}
