<script setup lang="ts">
import { ref } from "vue";
import Button from "@/components/Button.vue";
import DropdownList from "@/components/DropdownList.vue";
import Icon from "@/components/Icon.vue";
import Input from "@/components/Input.vue";
import UserAvatar from "@/components/UserAvatar.vue";
import PageHeader from "@/components/PageHeader.vue";
import ProfilePictureDialog from "./ProfilePictureDialog.vue";
import { useLoader } from "@/composables/useLoader";
import { useValidation } from "@/composables/useValidation";
import { supportedTimezoneList } from "@/lib/time-zone";
import { userProfileSchema, type EditUserProfile } from "@/schemas/users";
import { useProtectionLockStore } from "@/stores/protection-lock";
import { useToastStore } from "@/stores/toast";
import { useUserStore } from "@/stores/user";
import type { PreferredEditor } from "@/types/records";

const userStore = useUserStore();
const toastStore = useToastStore();
const protectionLock = useProtectionLockStore();
const saving = useLoader();
const validation = useValidation<EditUserProfile>(userProfileSchema);

const name = ref(userStore.user?.name ?? "");
const timezone = ref(userStore.user?.timezone ?? "UTC");
const preferredEditor = ref<PreferredEditor>(
    userStore.user?.preferred_editor ?? "rich",
);
const editorItems: { value: PreferredEditor; label: string }[] = [
    { value: "rich", label: "Rich text" },
    { value: "source", label: "Markdown source" },
];
const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

const choosingPicture = ref(false);
const removingPicture = useLoader();

const removePicture = removingPicture.wrap(async () => {
    try {
        await userStore.updateProfilePicture(null);
    } catch (error) {
        toastStore.reportError(error, "Failed to remove profile picture: ");
    }
});

const optional = (value: string) => (value.length > 0 ? value : undefined);

const submit = saving.wrap(async () => {
    const data: EditUserProfile = {
        name: name.value,
        timezone: timezone.value,
        preferred_editor: preferredEditor.value,
        old_password: optional(oldPassword.value),
        new_password: optional(newPassword.value),
        confirm_password: optional(confirmPassword.value),
    };
    if (!(await validation.validate(data))) {
        return;
    }

    try {
        await userStore.updateProfile(data);
    } catch (error) {
        if (validation.setServerErrors(error)) {
            return;
        }
        toastStore.reportError(error, "Failed to update profile: ");
        return;
    }

    // An unlocked protection lock keeps the password in memory; it has to be
    // the new one or protected notes stop decrypting.
    if (data.old_password && data.new_password && !protectionLock.isLocked) {
        protectionLock.resolveUnlockRequest(data.new_password);
    }
    oldPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    toastStore.addMessage({
        type: "success",
        text: "Profile updated successfully.",
    });
});
</script>

<template>
    <div>
        <PageHeader title="My Profile">
            Your name and timezone are used across NoteMe; reminders follow your
            timezone. Your profile picture is one of your uploaded images. The
            note editor is the one notes open in when you edit them; you can
            switch while editing.
        </PageHeader>
        <form
            class="grid gap-4 grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] max-w-4xl"
            @submit.prevent="submit"
        >
            <div class="glass-card p-5 flex flex-col gap-4">
                <div class="flex items-center gap-3">
                    <UserAvatar class="size-16 text-lg" />
                    <span class="min-w-0 flex flex-col gap-1.5">
                        <span class="min-w-0">
                            <strong class="block truncate">{{
                                userStore.user?.name
                            }}</strong>
                            <span class="block text-sm text-muted truncate">
                                @{{ userStore.user?.username }}
                            </span>
                        </span>
                        <span class="flex flex-wrap gap-1">
                            <Button size="xs" @click="choosingPicture = true">
                                <Icon name="image" />
                                {{
                                    userStore.user?.profile_picture
                                        ? "Change picture"
                                        : "Add picture"
                                }}
                            </Button>
                            <Button
                                v-if="userStore.user?.profile_picture"
                                size="xs"
                                color="transparentDanger"
                                :disabled="removingPicture.running.value"
                                @click="removePicture"
                            >
                                <Icon name="trash" /> Remove
                            </Button>
                        </span>
                    </span>
                </div>
                <Input
                    v-model="name"
                    label="Name"
                    type="text"
                    :validation="validation.state"
                    path="name"
                />
                <div>
                    <DropdownList
                        v-model="timezone"
                        label="Timezone"
                        :items="supportedTimezoneList"
                        :validation="validation.state"
                        path="timezone"
                    />
                </div>
                <div>
                    <DropdownList
                        v-model="preferredEditor"
                        label="Note editor"
                        :items="editorItems"
                        :validation="validation.state"
                        path="preferred_editor"
                    />
                </div>
            </div>
            <div class="glass-card p-5 flex flex-col gap-4">
                <h3 class="flex items-center gap-2 font-semibold">
                    <Icon name="lock-alt" size="lg" /> Change password
                </h3>
                <Input
                    v-model="oldPassword"
                    label="Old Password"
                    type="password"
                    :validation="validation.state"
                    path="old_password"
                />
                <div>
                    <Input
                        v-model="newPassword"
                        label="New Password"
                        type="password"
                        :validation="validation.state"
                        path="new_password"
                    />
                </div>
                <div>
                    <Input
                        v-model="confirmPassword"
                        label="Confirm Password"
                        type="password"
                        :validation="validation.state"
                        path="confirm_password"
                    />
                </div>
            </div>
            <div class="col-span-full">
                <div>
                    <Button
                        color="success"
                        type="submit"
                        :disabled="saving.running.value"
                    >
                        Update profile
                    </Button>
                </div>
            </div>
        </form>
        <ProfilePictureDialog
            v-if="choosingPicture"
            @close="choosingPicture = false"
        />
    </div>
</template>
