import Icon from "$components/Icon.tsx";

interface PaginationProps {
    total: number;
    perPage: number;
    currentPage: number;
    onChange: (page: number) => void;
}

export default function Pagination({
    total,
    perPage,
    currentPage,
    onChange,
}: PaginationProps) {
    const pages = Math.ceil(total / perPage);

    const amountOfZeroes = pages.toString().length;

    let endPageStride = 4;
    if (currentPage <= 4) {
        endPageStride += 4 - currentPage + 1;
    }
    const endPage = Math.min(currentPage + endPageStride, pages);

    let startPageStride = 4;
    if (currentPage + 4 > endPage) {
        startPageStride += currentPage + 4 - endPage;
    }

    const startPage = Math.min(
        Math.max(1, currentPage - startPageStride),
        pages,
    );

    return (
        <>
            {total > perPage && (
                <div className="flex justify-center">
                    <button
                        className="p-2"
                        disabled={currentPage === 1}
                        onClick={() => onChange(currentPage - 1)}
                    >
                        <Icon name="chevron-left" />
                    </button>
                    <button
                        className="p-2"
                        disabled={currentPage === 1}
                        onClick={() => onChange(1)}
                    >
                        <Icon name="chevrons-left" />
                    </button>

                    {Array.from(
                        { length: endPage - startPage + 1 },
                        (_, index) => startPage + index,
                    ).map((page) => (
                        <button
                            key={page}
                            className={`pt-2 pb-2 pr-5 pl-5 rounded-md ${
                                currentPage === page
                                    ? "bg-blue-500 text-white"
                                    : ""
                            }`}
                            onClick={() => onChange(page)}
                        >
                            {page.toString().padStart(amountOfZeroes, "0")}
                        </button>
                    ))}

                    <button
                        className="p-2"
                        disabled={currentPage === pages}
                        onClick={() => onChange(pages)}
                    >
                        <Icon name="chevrons-right" />
                    </button>

                    <button
                        className="p-2"
                        disabled={currentPage === pages}
                        onClick={() => onChange(currentPage + 1)}
                    >
                        <Icon name="chevron-right" />
                    </button>
                </div>
            )}
        </>
    );
}
