import { UserRecord } from "$backend/repository/user-repository.ts";
import { AppPermissions } from "$backend/rbac/permissions.ts";
import { unixToDate } from "$frontend/time.ts";

export type FrontendUserData =
    & Pick<
        UserRecord,
        "name" | "timezone"
    >
    & {
        id: number;
        permissions: AppPermissions[];
        csrfToken: string;
    };

class UserData {
    #data: FrontendUserData;
    #intlDate: Intl.DateTimeFormat;
    #intlTime: Intl.DateTimeFormat;
    #intlDateTime: Intl.DateTimeFormat;
    constructor(data: FrontendUserData) {
        this.#data = { ...data, timezone: "Europe/Belgrade" };
        const timeZoneData = { timeZone: this.#data.timezone };
        this.#intlDateTime = new Intl.DateTimeFormat(undefined, {
            timeStyle: "medium",
            dateStyle: "medium",
            ...timeZoneData,
        });
        this.#intlDate = new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            ...timeZoneData,
        });
        this.#intlTime = new Intl.DateTimeFormat(undefined, {
            timeStyle: "medium",
            ...timeZoneData,
        });
    }

    formatDate(date: Date | number): string {
        if (typeof date === "number") {
            date = unixToDate(date);
        }
        return this.#intlDate.format(date);
    }

    formatTime(date: Date | number): string {
        if (typeof date === "number") {
            date = unixToDate(date);
        }
        return this.#intlTime.format(date);
    }

    formatDateTime(date: Date | number): string {
        if (typeof date === "number") {
            date = unixToDate(date);
        }
        return this.#intlDateTime.format(date);
    }

    can(action: AppPermissions): boolean {
        return this.#data.permissions.includes(action);
    }

    get userId(): number {
        return +this.#data.id;
    }

    get csrfToken(): string {
        return this.#data.csrfToken;
    }
}

let userData: UserData | null = null;

export const setUserData = (data: FrontendUserData): void => {
    userData = new UserData(data);
};

export const getUserData = (): UserData => {
    if (!userData) {
        throw new Error("User data not set");
    }

    return userData;
};
