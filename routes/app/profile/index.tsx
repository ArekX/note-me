import UserProfile from "$islands/profile/UserProfile.tsx";
import UserPasskeys from "../../../islands/profile/UserPasskeys.tsx";

export default function Page() {
    return (
        <div>
            <UserProfile />
            <UserPasskeys />
        </div>
    );
}
