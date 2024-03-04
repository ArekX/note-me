import { ComponentChildren } from "preact";

interface Column<T> {
    name: string;
    key?: keyof T;
    render?: (row: T, rowIndex: number, column: Column<T>, colIndex: number) => string | null | ComponentChildren;
}

interface TableProps<T extends object> {
    columns: Column<T>[];
    rows: T[]
}

export function Table<T extends object>(
    {
        columns,
        rows
    }: TableProps<T>
) {
    return <table class="w-full">
        <thead>
            <tr>
                {columns.map((column, index) => <th key={index}>{column.name}</th>)}
            </tr>
        </thead>
        <tbody>
            {rows.map((row, rowIndex) =>
                <tr key={rowIndex}>
                    {columns.map((column, columnIndex) => (
                        <td key={columnIndex} class="text-center">
                            {column.key ? row[column.key] as string : column.render?.(
                                row,
                                rowIndex,
                                column,
                                columnIndex
                            )}
                        </td>
                    ))}
                </tr>
            )}
        </tbody>
    </table>
}