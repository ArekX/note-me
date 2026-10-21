import { useRouter, type RouteLocationRaw } from "vue-router";
import { useMobileMenu } from "./useMobileMenu";

// On a phone the list covers the note; picking the note that is already
// open does not change the route, so the list is closed here as well.
export const useOpenNote = () => {
    const router = useRouter();
    const mobileMenu = useMobileMenu();

    return (location: RouteLocationRaw) => {
        mobileMenu.close();
        return router.push(location);
    };
};
