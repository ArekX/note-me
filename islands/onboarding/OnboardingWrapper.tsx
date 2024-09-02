import { JSX } from "preact";
import Button from "$components/Button.tsx";
import { UserOnboardingState } from "$backend/repository/user-repository.ts";
import { useUser } from "$frontend/hooks/use-user.ts";

export type ContentFn = (props: { onClosed?: () => void }) => JSX.Element;

interface OnboardingWrapperProps {
    onDismissed?: () => void;
    onClosed?: () => void;
    onboardingKey: keyof UserOnboardingState;
    allowClose?: boolean;
    showBorder?: boolean;
    className?: string;
    content: ContentFn;
}
export default function OnboardingWrapper(
    {
        className,
        onboardingKey,
        onDismissed,
        onClosed,
        showBorder,
        allowClose,
        content: ContentComponent,
    }: OnboardingWrapperProps,
) {
    const user = useUser();

    if (user.getOnboardingState()[onboardingKey]) {
        return null;
    }

    const handleDismiss = () => {
        user.updateOnboardingState({
            [onboardingKey]: true,
        });
        onDismissed?.();
    };

    if (!className && showBorder) {
        className = "default-onboarding-wrapper";
    }

    return (
        <div className={className}>
            <div class="onboarding-contents">
                <ContentComponent onClosed={onClosed} />
            </div>
            <div class="text-right py-4">
                <Button
                    color="success"
                    title="Dismiss this message so that it won't show again."
                    onClick={handleDismiss}
                    addClass="max-md:w-full max-md:block max-md:mb-2"
                >
                    Don't show this again
                </Button>
                {allowClose && (
                    <Button
                        onClick={onClosed}
                        title="Close this dialog without dismissing the message."
                        addClass="md:ml-2 max-md:w-full max-md:block"
                    >
                        Close
                    </Button>
                )}
            </div>
        </div>
    );
}
