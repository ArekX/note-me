const renderClosestDisplaySize = (size: number) => {
    if (size < 1024) {
        return `${size} bytes`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else {
        return `${(size / 1024 / 1024).toFixed(2)} MB`;
    }
};

interface FileSizeProps {
    size: number;
}

export default function FileSize({ size }: FileSizeProps) {
    return <span title={`${size} bytes`}>{renderClosestDisplaySize(size)}
    </span>;
}
