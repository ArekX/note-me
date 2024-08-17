import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import { useSignal } from "@preact/signals";
import Input from "$components/Input.tsx";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";
import { useEffect } from "preact/hooks";
import { createRef } from "preact";

interface InsertTableData {
    rows: string[][];
}

const Component = (
    { onInsertDataChange }: InsertComponentProps<InsertTableData>,
) => {
    const rows = useSignal<string[][]>([
        [" ", " "],
    ]);

    const tbodyRef = createRef<HTMLTableSectionElement>();

    const setRows = (newRows: string[][]) => {
        rows.value = newRows;
        onInsertDataChange({
            rows: rows.value,
        });
    };

    const handleRowInput = (
        value: string,
        rowIndex: number,
        cellIndex: number,
    ) => {
        const newRows = [...rows.value];
        newRows[rowIndex][cellIndex] = value;
        setRows(newRows);
    };

    const handleAddColumn = () => {
        const newRows = [...rows.value];

        for (const row of newRows) {
            row.push("");
        }

        setRows(newRows);
    };

    const handleAddRow = () => {
        const newRows = [...rows.value];

        if (newRows.length === 0) {
            newRows.push([""]);
        } else {
            newRows.push(newRows[0].map(() => ""));
        }

        setRows(newRows);
    };

    const handleRemoveColumn = (columnIndex: number) => {
        const newRows = [...rows.value];

        for (const row of newRows) {
            row.splice(columnIndex, 1);
        }

        setRows(newRows);
    };

    const handleRemoveRow = (rowIndex: number) => {
        const newRows = [...rows.value];
        newRows.splice(rowIndex, 1);

        setRows(newRows);
    };

    const handleTableKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Enter") {
            handleAddRow();
        }
    };

    const handleButtonKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Tab") {
            handleAddRow();

            setTimeout(() => {
                if (tbodyRef.current) {
                    const lastRow = tbodyRef.current.querySelector(
                        "tr:last-child td:first-child input",
                    ) as HTMLInputElement | null;
                    if (lastRow) {
                        lastRow.focus();
                    }
                }
            }, 100);
        }
    };

    useEffect(() => {
        onInsertDataChange({
            rows: rows.value,
        });
    }, []);

    return (
        <>
            <div class="py-2">
                Insert a table by providing the rows and columns.
            </div>
            <div class="py-2">
                <table>
                    <tbody ref={tbodyRef}>
                        <tr>
                            {rows.value.length > 0 && (
                                <>
                                    {rows.value[0].map((_, index) => (
                                        <td key={index} class="text-center">
                                            <Button
                                                color="danger"
                                                size="sm"
                                                onClick={() =>
                                                    handleRemoveColumn(index)}
                                            >
                                                <Icon name="minus" size="sm" />
                                                {" "}
                                            </Button>
                                        </td>
                                    ))}
                                    <td>
                                        <Button
                                            color="success"
                                            size="sm"
                                            title="Add column"
                                            onClick={handleAddColumn}
                                        >
                                            <Icon name="plus" size="sm" />
                                            {" "}
                                        </Button>
                                    </td>
                                </>
                            )}
                        </tr>
                        {rows.value.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>
                                        <Input
                                            value={cell}
                                            onInput={(value) => {
                                                handleRowInput(
                                                    value,
                                                    rowIndex,
                                                    cellIndex,
                                                );
                                            }}
                                            onKeydown={handleTableKeyDown}
                                        />
                                    </td>
                                ))}
                                <td>
                                    <Button
                                        color="danger"
                                        size="sm"
                                        title="Remove row"
                                        onClick={() =>
                                            handleRemoveRow(rowIndex)}
                                        onKeyDown={handleButtonKeyDown}
                                    >
                                        <Icon name="minus" size="sm" />
                                        {" "}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td
                                colSpan={rows.value.length > 0
                                    ? rows.value[0].length + 1
                                    : 1}
                                class="text-center"
                            >
                                <Button
                                    color="success"
                                    size="sm"
                                    title="Add row"
                                    onClick={handleAddRow}
                                >
                                    <Icon name="plus" size="sm" />
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="pt-5">
                    <Button
                        color="danger"
                        onClick={() => setRows([[" ", " "]])}
                    >
                        Reset table
                    </Button>
                </div>
            </div>
        </>
    );
};

export const InsertTableDef: InsertComponent<
    "table",
    "table",
    InsertTableData
> = {
    id: "table",
    name: "Table",
    component: (props) => <Component {...props} />,
    icon: "table",
    description: "Insert a table",
    insertButtons: {
        table: {
            name: "Insert",
            icon: "table",
            formatData: ({ rows }) => {
                if (rows.length === 0) {
                    return "";
                }

                let longestString = 0;

                for (const row of rows) {
                    for (const cell of row) {
                        if (cell.length > longestString) {
                            longestString = cell.length;
                        }
                    }
                }

                const separator = rows[0].map(() => "-".repeat(longestString));

                const rowLines = [];

                const firstRow: string[] = rows.shift()!;

                rowLines.push(
                    `| ${
                        firstRow.map((cell) => cell.padEnd(longestString)).join(
                            " | ",
                        )
                    } |`,
                    `| ${separator.join(" | ")} |`,
                );

                for (const row of rows) {
                    rowLines.push(
                        `| ${
                            row.map((cell) => cell.padEnd(longestString)).join(
                                " | ",
                            )
                        } |`,
                    );
                }

                return rowLines.join("\n");
            },
        },
    },
};
