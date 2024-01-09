import { Icon } from "$components/Icon.tsx";
import { useEffect } from "preact/hooks";
import { activeMenuRecordId, clearPopupOwner, setPopupOwner, windowSize } from "../frontend/stores/active-sidebar-item.ts";
import { createRef } from "preact";

export interface MenuItem {
    icon: string;
    name: string;
    onClick: () => void;
}

interface IconMenuProps {
    recordId: number;
    iconName?: string;
    menuItems: MenuItem[];
    showDirection?: "right" | "bottom"
}

export default function IconMenu({ recordId, iconName = "dots-horizontal-rounded", menuItems, showDirection = "right" }: IconMenuProps) {
    const menuRef = createRef<HTMLDivElement>();

    const repositionMenu = () => {
        if (!menuRef.current) {
            return;
        }

        const [_, height] = windowSize.value;
        const rect = menuRef.current.getBoundingClientRect();

        const bottomPosition = rect.top + rect.height;

        if (bottomPosition > height) {
            menuRef.current.style.top = `-${bottomPosition - height + 20}px`;
        } else {
            menuRef.current.style.top = '0';
        }
    };

    useEffect(() => {
        if (activeMenuRecordId.value !== recordId) {
            return;
        }
        repositionMenu();
    }, [activeMenuRecordId.value, windowSize.value]);

    return (
        <div class={`inline-block relative sh cursor-pointer icon-menu ${activeMenuRecordId.value === recordId ? 'show-items' : ''}`} onClick={(e) => {
            setPopupOwner(recordId);
            e.stopPropagation();
            repositionMenu();
        }}>
            <Icon name={iconName} />
            <div ref={menuRef} class={`icon-menu-items drop-shadow-lg absolute ${showDirection === "right" ? "top-2 left-full" : "top-0"} bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep`}>
                {menuItems.map((item) => (
                    <div class="hover:bg-gray-700 cursor-pointer pr-2 pl-2" onClick={(e) => {
                        item.onClick();
                        clearPopupOwner();
                        e.stopPropagation();
                    }}><Icon name={item.icon} /> {item.name}</div>
                ))}
            </div>
        </div>
    );
}
