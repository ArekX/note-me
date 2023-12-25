import { MutableRef, useEffect } from "preact/hooks";

export function useLoadMore<T extends HTMLElement | null>(
  onLoadMore: () => void,
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
    const target = e.target as HTMLElement;
    if (target.scrollHeight - target.scrollTop >= target.clientHeight) {
      onLoadMore();
    }
  }
}
