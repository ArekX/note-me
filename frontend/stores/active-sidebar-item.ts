// deno-lint-ignore-file no-window
import { signal } from "@preact/signals";
import { IS_BROWSER } from "$fresh/runtime.ts";

export type MenuItem = {
  name: string;
  onClick: () => void;
};

export const activeMenuRecordId = signal<number | null>(null);
export const windowSize = signal<[number, number]>([0, 0]);

if (IS_BROWSER) {
  document.body.addEventListener("click", () => {
    if (!activeMenuRecordId.value) {
      return;
    }

    clearPopupOwner();
  });

  addEventListener("resize", () => {
    if (!activeMenuRecordId.value) {
      return;
    }

    windowSize.value = [window.innerWidth, window.innerHeight];
  });

  windowSize.value = [window.innerWidth, window.innerHeight];
}

export const setPopupOwner = (owner: number) => {
  activeMenuRecordId.value = owner;
  windowSize.value = [window.innerWidth, window.innerHeight];
};

export const clearPopupOwner = () => {
  activeMenuRecordId.value = null;
};
