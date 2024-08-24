import { removeMessage, toastMessages } from "$frontend/toast-message.ts";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";

const typeColorMap = {
    warning: "bg-yellow-800/90 border-yellow-600/50",
    success: "bg-green-800/90 border-green-600/50",
    info: "bg-blue-800/90 border-blue-600/50",
    error: "bg-red-800/90 border-red-600/50",
};

export default function ToastMessages() {
    return (
        <div class="toast-messages absolute bottom-5 right-5 max-md:left-5 lg:w-1/4 z-50">
            {toastMessages.value.map((message) => (
                <div
                    class={`${
                        typeColorMap[message.type]
                    } border p-5 max-md:py-1 max-md:px-2 flex items-center text-white rounded-xl mt-5 shadow-gray-900 shadow-md`}
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
