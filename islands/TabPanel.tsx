import { ComponentChildren } from "preact";
import Panel from "$components/Panel.tsx";
import ButtonGroup from "$components/ButtonGroup.tsx";
import { redirectToUrl } from "$frontend/redirection-manager.ts";

export interface TabLink {
    name: string;
    link: string;
}

interface TabPanelProps {
    activeLink?: string;
    links: TabLink[];
    children: ComponentChildren;
}

export default function TabPanel(
    { links, children, activeLink }: TabPanelProps,
) {
    return (
        <div class="flex flex-col text-white">
            <div class="p-5">
                <ButtonGroup
                    activeItem={activeLink}
                    items={Object.fromEntries(
                        links.map((link) => [link.link, link.name]),
                    )}
                    onSelect={(item) => {
                        redirectToUrl(item as string);
                    }}
                />
            </div>
            <div class="flex-grow">
                <Panel>
                    {children}
                </Panel>
            </div>
        </div>
    );
}
