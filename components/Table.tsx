import { ComponentChildren } from "preact";
import Loader, { LoaderProps } from "$islands/Loader.tsx";

type RowCallback<RowType, OutputType> = (
    row: RowType,
    rowIndex: number,
    column: Column<RowType>,
    colIndex: number,
) => OutputType;

type CellCallback<T> =
    | object
    | ((column: Column<T>, colIndex: number) => object);

type RowContents = string | null | ComponentChildren;

interface Column<T> {
    name: RowContents;
    filter?: RowContents;
    filterProps?: CellCallback<T>;
    headerCellProps?: CellCallback<T>;
    cellProps?: object | RowCallback<T, object>;
    key?: keyof T;
    render?: RowCallback<T, RowContents>;
}

interface TableProps<T extends object> {
    columns: Column<T>[];
    rows: T[];
    noRowsRow?: RowContents;
    isLoading?: boolean;
    loaderProps?: LoaderProps;
    headerRowProps?: object;
    bodyProps?: object;
    headerProps?: object;
    tableProps?: object;
    bodyRowProps?: object | ((row: T, rowIndex: number) => object);
}

export default function Table<T extends object>(
    {
        columns,
        rows,
        noRowsRow,
        headerRowProps,
        bodyRowProps,
        loaderProps,
        isLoading = false,
        bodyProps,
        headerProps,
        tableProps = { class: "w-full" },
    }: TableProps<T>,
) {
    const hasAnyFilters = columns.some((column) => column.filter);
    return (
        <div class="max-md:w-full max-md:overflow-x-auto">
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
                    {hasAnyFilters && (
                        <tr class="filters">
                            {columns.map((column, index) => (
                                <td
                                    key={index}
                                    {...(
                                        typeof column.filterProps === "function"
                                            ? column.filterProps(column, index)
                                            : column.filterProps
                                    )}
                                >
                                    {column.filter}
                                </td>
                            ))}
                        </tr>
                    )}
                </thead>
                <tbody {...bodyProps}>
                    {isLoading && (
                        <tr>
                            <td
                                colSpan={columns.length}
                                class="text-center p-2"
                            >
                                <Loader {...loaderProps} />
                            </td>
                        </tr>
                    )}
                    {!isLoading && rows.map((row, rowIndex) => (
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
                    {!isLoading && rows.length === 0 && noRowsRow}
                </tbody>
            </table>
        </div>
    );
}
