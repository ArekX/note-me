import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import Input from "$components/Input.tsx";
import { useSignal } from "@preact/signals";
import DropdownList from "$components/DropdownList.tsx";

interface InsertHeadingData {
    level: number;
    text: string;
}

const Component = (
    props: InsertComponentProps<InsertHeadingData>,
) => {
    const text = useSignal<string>("");
    const level = useSignal<number>(1);

    const setHeadingData = (data: { text?: string; level?: number }) => {
        text.value = data.text ?? text.value;
        level.value = data.level ?? level.value;

        props.onInsertDataChange({
            level: level.value,
            text: text.value,
        });
    };

    return (
        <div class="w-1/4">
            <div class="py-2">
                Insert a heading of a text paragraph
            </div>
            <div>
                <Input
                    label="Heading"
                    value={text.value}
                    onInput={(value) => setHeadingData({ text: value })}
                />
            </div>
            <div class="py-2">
                <DropdownList<number>
                    label="Size Level (lower is larger)"
                    value={level.value}
                    items={[
                        { value: 1, label: "Heading 1" },
                        { value: 2, label: "Heading 2" },
                        { value: 3, label: "Heading 3" },
                        { value: 4, label: "Heading 4" },
                        { value: 5, label: "Heading 5" },
                        { value: 6, label: "Heading 6" },
                    ]}
                    onInput={(value) => setHeadingData({ level: value })}
                />
            </div>
        </div>
    );
};

export const InsertHeadingDef: InsertComponent<
    "heading",
    "heading",
    InsertHeadingData
> = {
    id: "heading",
    name: "Heading",
    component: (props) => <Component {...props} />,
    icon: "font",
    description: "Insert a heading title",
    insertButtons: {
        heading: {
            name: "Insert",
            icon: "font",
            formatData: (data) => `${"#".repeat(data.level)} ${data.text}`,
        },
    },
};
