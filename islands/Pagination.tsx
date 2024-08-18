import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";

interface PaginationProps {
    total: number;
    perPage: number;
    currentPage: number;
    onChange: (page: number) => void;
    alignmentClass?: string;
}

export default function Pagination({
    total,
    perPage,
    currentPage,
    onChange,
    alignmentClass = "justify-center",
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
                <div className={`flex ${alignmentClass}`}>
                    <Button
                        addClass={currentPage === 1
                            ? "pointer-events-none opacity-20"
                            : ""}
                        disabled={currentPage === 1}
                        onClick={() => onChange(currentPage - 1)}
                        size="md"
                    >
                        <Icon name="chevron-left" />
                    </Button>
                    <Button
                        addClass={`ml-2 ${
                            currentPage === 1
                                ? "pointer-events-none opacity-20"
                                : ""
                        }`}
                        disabled={currentPage === 1}
                        onClick={() => onChange(1)}
                        size="md"
                    >
                        <Icon name="chevrons-left" />
                    </Button>

                    {Array.from(
                        { length: endPage - startPage + 1 },
                        (_, index) => startPage + index,
                    ).map((page) => (
                        <Button
                            addClass={`ml-2 ${
                                currentPage === page
                                    ? "pointer-events-none"
                                    : ""
                            }`}
                            color={currentPage === page ? "success" : "primary"}
                            disabled={currentPage === page}
                            onClick={() => onChange(page)}
                            size="md"
                        >
                            {page.toString().padStart(amountOfZeroes, "0")}
                        </Button>
                    ))}

                    <Button
                        addClass={`ml-2 ${
                            currentPage === pages
                                ? "pointer-events-none opacity-20"
                                : ""
                        }`}
                        disabled={currentPage === pages}
                        onClick={() => onChange(pages)}
                        size="md"
                    >
                        <Icon name="chevrons-right" />
                    </Button>

                    <Button
                        addClass={`ml-2 ${
                            currentPage === pages
                                ? "pointer-events-none opacity-20"
                                : ""
                        }`}
                        disabled={currentPage === pages}
                        onClick={() => onChange(currentPage + 1)}
                        size="md"
                    >
                        <Icon name="chevron-right" />
                    </Button>
                </div>
            )}
        </>
    );
}
