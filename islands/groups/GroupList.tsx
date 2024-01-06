import { Signal, useSignal } from "@preact/signals";
import SearchBar from "./SearchBar.tsx";
import Loader from "$islands/Loader.tsx";
import { findGroups } from "$frontend/api.ts";
import { GroupRecord } from "$backend/repository/group-repository.ts";
import { useEffect } from "preact/hooks";
import { FindGroupsRequest } from "../../routes/api/find-groups.ts";

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
      <div className="p-4">
        <Loader color="white" visible={isLoading.value} />
      </div>
    </div>
  );
}
