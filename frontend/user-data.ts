import { UserRecord } from "$backend/repository/user-repository.ts";

export type FrontendUserData = Pick<
  UserRecord,
  "name" | "default_group_id" | "timezone"
>;

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

  formatDate(date: Date): string {
    return this.#intlDate.format(date);
  }

  formatTime(date: Date): string {
    return this.#intlTime.format(date);
  }

  formatDateTime(date: Date): string {
    return this.#intlDateTime.format(date);
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
