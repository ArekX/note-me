import { parseTableOfContents, TocItem } from "$frontend/table-of-contents.ts";

interface TableOfContentsProps {
    text: string;
}

interface ListProps {
    item: TocItem;
}

const List = ({ item }: ListProps) => (
    <>
        {item.text}
        {item.children.length > 0 && (
            <ul class="list-disc ml-4">
                {item.children.map((item, index) => (
                    <li key={index}>
                        <List item={item} />
                    </li>
                ))}
            </ul>
        )}
    </>
);

export default function TableOfContents({ text }: TableOfContentsProps) {
    const items = parseTableOfContents(text);
    return items.length > 0
        ? (
            <div>
                <ul class="list-disc ml-4">
                    {items.map((item, index) => (
                        <li key={index}>
                            <List item={item} />
                        </li>
                    ))}
                </ul>
            </div>
        )
        : (
            <div class="text-center p-4">
                No table of contents available.
            </div>
        );
}
