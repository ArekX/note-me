import {
    InsertComponent,
    InsertComponentProps,
} from "$islands/notes/InsertDialog.tsx";
import { useSignal } from "@preact/signals";
import Input from "$components/Input.tsx";
import Icon from "$components/Icon.tsx";
import Button from "$components/Button.tsx";
import { useEffect } from "preact/hooks";

interface InsertTableData {
    rows: string[][];
}

const focusOnInput = (element: HTMLInputElement | null) => {
    if (!element) {
        return;
    }

    element.focus();
    element.scrollIntoView();
};

const Component = (
    { onInsertDataChange }: InsertComponentProps<InsertTableData>,
) => {
    const rows = useSignal<string[][]>([
        ["", ""],
    ]);

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
        } else if (event.key === "ArrowUp") {
            const target = event.target as HTMLInputElement;

            event.preventDefault();
            const tableCell = target?.closest("td");

            if (!tableCell) {
                return;
            }

            const tableRow = tableCell?.closest("tr")!;

            const cellIndex = Array.from(tableRow?.children).indexOf(
                tableCell,
            );

            focusOnInput(
                tableRow.previousElementSibling?.querySelector(
                    `td:nth-child(${cellIndex + 1}) input`,
                ) as HTMLInputElement,
            );
        } else if (event.key === "ArrowDown") {
            const target = event.target as HTMLInputElement;

            event.preventDefault();
            const tableCell = target?.closest("td");

            if (!tableCell) {
                return;
            }

            const tableRow = tableCell?.closest("tr")!;

            const cellIndex = Array.from(tableRow?.children).indexOf(
                tableCell,
            );

            focusOnInput(
                tableRow.nextElementSibling?.querySelector(
                    `td:nth-child(${cellIndex + 1}) input`,
                ) as HTMLInputElement,
            );
        } else if (event.key === "ArrowLeft") {
            const target = event.target as HTMLInputElement;

            if (target.selectionStart === 0 && target.selectionEnd === 0) {
                event.preventDefault();
                const tableCell = target?.closest("td");
                focusOnInput(
                    tableCell?.previousElementSibling?.querySelector(
                        "input",
                    ) as HTMLInputElement,
                );
            }
        } else if (event.key === "ArrowRight") {
            const target = event.target as HTMLInputElement;

            if (
                target.selectionEnd === target.value.length &&
                target.selectionStart === target.value.length
            ) {
                event.preventDefault();
                const tableCell = target?.closest("td");
                focusOnInput(
                    tableCell?.nextElementSibling?.querySelector(
                        "input",
                    ) as HTMLInputElement,
                );
            }
        }
    };

    const handleButtonKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Tab") {
            const target = event.target as HTMLButtonElement;

            const row = target.closest("tr");
            const lastRow = row?.parentElement?.querySelector(
                "tr:nth-last-child(2)",
            );

            if (lastRow === row) {
                event.preventDefault();

                handleAddRow();

                setTimeout(() => {
                    focusOnInput(
                        lastRow?.nextElementSibling
                            ?.querySelector(
                                "td:first-child input",
                            ) as HTMLInputElement,
                    );
                }, 100);
            } else {
                focusOnInput(
                    row?.nextElementSibling?.querySelector(
                        "td:first-child input",
                    ) as HTMLInputElement,
                );
            }

            event.preventDefault();
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            const tableCell = (event.currentTarget as HTMLButtonElement)
                ?.closest("td");
            focusOnInput(
                tableCell?.previousElementSibling?.querySelector(
                    "input",
                ) as HTMLInputElement,
            );
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
                    <tbody>
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
                        onClick={() => setRows([["", ""]])}
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
