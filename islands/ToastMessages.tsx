import { removeMessage, toastMessages } from "$frontend/toast-message.ts";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";

const typeColorMap = {
    warning: "bg-yellow-700",
    success: "bg-green-700",
    info: "bg-blue-700",
    error: "bg-red-700",
};

export default function ToastMessages() {
    return (
        <div class="toast-messages absolute bottom-5 right-5 w-1/4">
            {toastMessages.value.map((message) => (
                <div
                    class={`${
                        typeColorMap[message.type]
                    } p-5 flex items-center text-white shadow-inner rounded-xl mt-5`}
                >
                    <div class="flex-grow">
                        {message.text}
                    </div>

                    <div class="pl-2">
                        <Button
                            color="danger"
                            size="xs"
                            onClick={() => removeMessage(message)}
                        >
                            <Icon name="minus-circle" size="lg" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
