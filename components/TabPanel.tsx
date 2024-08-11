import { ComponentChildren } from "preact";
import Panel from "$components/Panel.tsx";

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
            <div class="flex">
                <ul class="flex space-x-4 m-5">
                    {links.map((link) => (
                        <li
                            key={link.link}
                        >
                            <a
                                href={link.link}
                                class={`border ${
                                    link.link == activeLink
                                        ? "bg-sky-900 border-sky-600/50"
                                        : "bg-gray-800 border-gray-700/50"
                                } p-3 rounded-lg shadow-md`}
                            >
                                {link.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
            <div class="flex-grow">
                <Panel>
                    {children}
                </Panel>
            </div>
        </div>
    );
}
