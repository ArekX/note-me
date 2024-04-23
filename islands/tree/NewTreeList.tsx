import { ComponentChild } from "preact";
import { useRecordTree } from "$islands/tree/record-container.ts";
import { useEffect } from "preact/hooks";

interface TreeListProps {
    searchQuery: string;
    switcherComponent: ComponentChild;
}

export const NewTreeList = ({
    switcherComponent,
    searchQuery,
}: TreeListProps) => {
    const tree = useRecordTree();

    useEffect(() => {
        tree.loadChildren(tree.root);
    }, []);

    return (
        <div>
            <div>New Tree List</div>

            <ul>
                {tree.root.children.map((child) => (
                    <li>
                        {child.name}
                        {child.children.length > 0 && (
                            <ul>
                                {child.children.map((subChild) => (
                                    <li>{subChild.name}</li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};
