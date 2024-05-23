import Icon from "$components/Icon.tsx";

export interface MenuItem {
    icon: string;
    name: string;
    link: string;
    activeRoutes?: string[];
}

interface NavProps {
    items: MenuItem[];
    activeRoute: string;
}

function isActiveItem(route: string, item: MenuItem): boolean {
    if (item.activeRoutes) {
        return item.activeRoutes.includes(route);
    }
    return route == item.link;
}

export default function Nav(props: NavProps) {
    return (
        <nav>
            <ul>
                {props.items.map((item) => (
                    <li>
                        <a
                            href={item.link}
                            class={`p-5 hover:bg-gray-600 block ${
                                isActiveItem(props.activeRoute, item)
                                    ? "bg-gray-500"
                                    : ""
                            }`}
                        >
                            <Icon name={item.icon} /> {item.name}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
