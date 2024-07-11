import { ComponentChildren, createRef } from "preact";
import { useEffect } from "preact/hooks";
import Loader from "$islands/Loader.tsx";

interface LoadMoreWrapperProps {
    onLoadMore: () => void;
    addCss?: string;
    hasMore: boolean;
    children: ComponentChildren;
}

const option = {
    root: null,
    rootMargin: "20px",
    threshold: 1,
};

export default function LoadMoreWrapper({
    onLoadMore,
    hasMore,
    children,
    addCss = "",
}: LoadMoreWrapperProps) {
    const loadNextRef = createRef<HTMLDivElement>();

    const handleObserver: IntersectionObserverCallback = (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore) {
            onLoadMore();
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, option);

        if (loadNextRef.current) {
            observer.observe(loadNextRef.current);
        }

        return () => {
            if (loadNextRef.current) {
                observer.disconnect();
            }
        };
    }, [loadNextRef]);

    return (
        <div class={`overflow-auto ${addCss}`}>
            {children}
            {hasMore && (
                <div ref={loadNextRef}>
                    <Loader color="white" />
                </div>
            )}
        </div>
    );
}
