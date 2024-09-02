import Icon from "$components/Icon.tsx";
import { useHelp } from "$frontend/hooks/use-help.ts";
import { useResponsiveQuery } from "$frontend/hooks/use-responsive-query.ts";
import Button from "$components/Button.tsx";

export default function HelpButton() {
    const help = useHelp();

    const query = useResponsiveQuery();

    if (query.max("sm")) {
        return (
            <Button
                color="transparent"
                size="sm"
                title="Open Help"
                rounded={false}
                borderClass="border-b-0"
                onClick={() => help.open()}
            >
                <Icon name="help-circle" />
            </Button>
        );
    }

    return (
        <a
            class="hover:text-gray-300 cursor-pointer"
            title={"Open Help"}
            onClick={() => help.open()}
        >
            <Icon name="help-circle" />
        </a>
    );
}
