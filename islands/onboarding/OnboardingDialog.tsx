import { UserOnboardingState } from "../../workers/database/query/user-repository.ts";
import { useUser } from "$frontend/hooks/use-user.ts";
import Dialog from "$islands/Dialog.tsx";
import OnboardingWrapper, {
    ContentFn,
} from "$islands/onboarding/OnboardingWrapper.tsx";
import { useSignal } from "@preact/signals";

interface OnboardingDialogProps {
    widthClass?: string;
    title?: string;
    onboardingClassName?: string;
    onboardingKey: keyof UserOnboardingState;
    content: ContentFn;
}

export default function OnboardingDialog(
    {
        widthClass = "w-1/2 max-md:w-full",
        onboardingKey,
        onboardingClassName,
        content,
        title,
    }: OnboardingDialogProps,
) {
    const user = useUser();
    const isVisible = useSignal(true);

    if (!isVisible.value || user.getOnboardingState()[onboardingKey]) {
        return null;
    }

    return (
        <Dialog
            visible={true}
            props={{
                class: widthClass,
            }}
            title={title}
        >
            <OnboardingWrapper
                onboardingKey={onboardingKey}
                className={onboardingClassName}
                allowClose={true}
                content={content}
                onClosed={() => isVisible.value = false}
            />
        </Dialog>
    );
}
