import { TimingHandler } from "../timing-service.ts";

export const checkReminders: TimingHandler = {
  triggerEveryMinutes: 1,
  trigger: function (): Promise<void> {
    // TODO: Check reminder notes and send notifications.
    return Promise.resolve();
  },
};
