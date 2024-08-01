import UserProfile from "$islands/profile/UserProfile.tsx";
import Passkeys from "$islands/profile/Passkeys.tsx";

export default function Page() {
    return (
        <div>
            <UserProfile />
            <Passkeys />
        </div>
    );
}
