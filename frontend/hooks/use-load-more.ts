import { Signal } from "@preact/signals";
import { MutableRef, useEffect } from "preact/hooks";

export function useLoadMore<T extends HTMLElement | null>(
  onLoadMore: () => void,
  hasMore: Signal<boolean>,
  ref: MutableRef<T>,
) {
  let currentRef = ref;
  useEffect(() => {
    if (currentRef !== ref) {
      currentRef?.current?.removeEventListener("scroll", handleScroll);
      currentRef = ref;
    }

    currentRef?.current?.addEventListener("scroll", handleScroll);
  }, [ref]);

  function handleScroll(e: Event) {
    if (!hasMore.value) {
      return;
    }

    const target = e.target as HTMLElement;
    if (target.scrollHeight - target.scrollTop >= target.clientHeight) {
      onLoadMore();
    }
  }
}
