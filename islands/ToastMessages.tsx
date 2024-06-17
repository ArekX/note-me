import { removeMessage, toastMessages } from "$frontend/toast-message.ts";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";

const typeColorMap = {
    warning: "bg-yellow-700",
    success: "bg-green-700",
    error: "bg-red-700",
};

export default function ToastMessages() {
    return (
        <div class="toast-messages absolute bottom-5 right-5 w-1/4">
            {toastMessages.value.map((message) => (
                <div
                    class={`${
                        typeColorMap[message.type]
                    } p-5 pr-12 text-white shadow-inner rounded-xl mt-5 relative`}
                >
                    {message.text}

                    <Button
                        color="danger"
                        size="xs"
                        onClick={() => removeMessage(message)}
                        addClass="absolute top-3 right-3"
                    >
                        <Icon name="minus-circle" size="lg" />
                    </Button>
                </div>
            ))}
        </div>
    );
}
