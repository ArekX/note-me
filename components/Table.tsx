import { ComponentChildren } from "preact";

type RowCallback<RowType, OutputType> = (
    row: RowType,
    rowIndex: number,
    column: Column<RowType>,
    colIndex: number,
) => OutputType;

type RowContents = string | null | ComponentChildren;

interface Column<T> {
    name: RowContents;
    headerCellProps?:
        | object
        | ((column: Column<T>, colIndex: number) => object);
    cellProps?: object | RowCallback<T, object>;
    key?: keyof T;
    render?: RowCallback<T, RowContents>;
}

interface TableProps<T extends object> {
    columns: Column<T>[];
    rows: T[];
    headerRowProps?: object;
    bodyProps?: object;
    headerProps?: object;
    tableProps?: object;
    bodyRowProps?: object | ((row: T, rowIndex: number) => object);
}

export function Table<T extends object>(
    {
        columns,
        rows,
        headerRowProps,
        bodyRowProps,
        bodyProps,
        headerProps,
        tableProps = { class: "w-full" },
    }: TableProps<T>,
) {
    return (
        <table {...tableProps}>
            <thead {...headerProps}>
                <tr {...headerRowProps}>
                    {columns.map((column, index) => (
                        <th
                            key={index}
                            {...(
                                typeof column.headerCellProps === "function"
                                    ? column.headerCellProps(column, index)
                                    : column.headerCellProps
                            )}
                        >
                            {column.name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody {...bodyProps}>
                {rows.map((row, rowIndex) => (
                    <tr
                        key={rowIndex}
                        {...(
                            typeof bodyRowProps === "function"
                                ? bodyRowProps(row, rowIndex)
                                : bodyRowProps
                        )}
                    >
                        {columns.map((column, columnIndex) => (
                            <td
                                key={columnIndex}
                                {...(
                                    typeof column.cellProps === "function"
                                        ? column.cellProps(
                                            row,
                                            rowIndex,
                                            column,
                                            columnIndex,
                                        )
                                        : column.cellProps
                                )}
                            >
                                {column.key
                                    ? row[column.key] as RowContents
                                    : column.render?.(
                                        row,
                                        rowIndex,
                                        column,
                                        columnIndex,
                                    )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
