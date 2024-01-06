import { GroupRecord } from "$backend/repository/group-repository.ts";
import { Icon } from "$components/Icon.tsx";

interface GroupItemProps {
  record: GroupRecord;
  onSave: () => void;
}

export default function GroupItem({ record, onSave }: GroupItemProps) {
  return (
    <div class="relative group-item hover:bg-gray-600">
      <div class="absolute right-0 flex items-center group-item-actions pr-1">
        <span class="hover:text-gray-300 cursor-pointer" title="Add Note">
          <Icon name="plus" />
        </span>
        <span class="hover:text-gray-300 cursor-pointer" title="Add Group">
          <Icon name="folder-plus" />
        </span>
        <span class="hover:text-gray-300 cursor-pointer" title="Rename">
          <Icon name="edit" />
        </span>
      </div>
      <span class="group-item-name pl-2">
        <Icon name="folder" /> Group
      </span>
    </div>
  );
}
