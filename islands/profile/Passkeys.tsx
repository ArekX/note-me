import Button from "$components/Button.tsx";
import { startRegistration } from "$frontend/deps.ts";
import { useWebsocketService } from "$frontend/hooks/use-websocket-service.ts";
import {
    GetPasskeyRegistrationMessage,
    GetPasskeyRegistrationResponse,
} from "$workers/websocket/api/users/messages.ts";

export default function Passkeys() {
    const { sendMessage } = useWebsocketService();
    const registerDevice = async () => {
        const options = await sendMessage<
            GetPasskeyRegistrationMessage,
            GetPasskeyRegistrationResponse
        >("users", "getPasskeyRegistrationOptions", {
            expect: "getPasskeyRegistrationOptionsResponse",
        });

        const credential = await startRegistration(options.options);

        console.log(credential);
    };
    return (
        <div>
            <Button onClick={registerDevice}>Register device</Button>
        </div>
    );
}
