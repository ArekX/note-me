import { parseTableOfContents, TocItem } from "$frontend/table-of-contents.ts";

interface TableOfContentsProps {
    text: string;
    noTocMessage?: string;
    disableLinks?: boolean;
}

interface ListProps {
    item: TocItem;
    disableLinks: boolean;
}

const getTitleLink = (text: string) => {
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
        /^-+|-+$/g,
        "",
    );
    return `#${slug}`;
};

const List = ({ item, disableLinks }: ListProps) => (
    <>
        {item.text.length > 0 && (
            (
                <a
                    href={disableLinks ? "#" : getTitleLink(item.text)}
                    class="text-blue-600 hover:underline"
                >
                    {item.text}
                </a>
            )
        )}
        {item.children.length > 0 && (
            <ul class="list-disc ml-4">
                {item.children.map((item, index) => (
                    <li key={index}>
                        <List item={item} disableLinks={disableLinks} />
                    </li>
                ))}
            </ul>
        )}
    </>
);

export default function TableOfContents(
    {
        text,
        disableLinks = false,
        noTocMessage = "No table of contents available.",
    }: TableOfContentsProps,
) {
    const items = parseTableOfContents(text);
    return items.length > 0
        ? (
            <div>
                <ul class="list-disc ml-4">
                    {items.map((item, index) => (
                        <li key={index}>
                            <List item={item} disableLinks={disableLinks} />
                        </li>
                    ))}
                </ul>
            </div>
        )
        : (
            <div class="text-center p-4 text-gray-400">
                {noTocMessage}
            </div>
        );
}
