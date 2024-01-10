import { Icon } from "$components/Icon.tsx";
import { useEffect } from "preact/hooks";
import { activeMenuRecordId, clearPopupOwner, setPopupOwner, windowSize } from "../frontend/stores/active-sidebar-item.ts";
import { createRef } from "preact";
import { createPortal } from "preact/compat";
import { ContainerGroupRecord } from "$islands/groups/GroupItem.tsx";

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

export default function IconMenu({ recordId, iconName = "dots-horizontal-rounded", menuItems }: IconMenuProps) {
    const menuRef = createRef<HTMLDivElement>();
    const iconRef = createRef<HTMLSpanElement>();

    const repositionMenu = () => {
        if (!menuRef.current || !iconRef.current) {
            return;
        }

        const [_, height] = windowSize.value;
        const rect = menuRef.current.getBoundingClientRect();
        const iconRefRect = iconRef.current!.getBoundingClientRect();



        const diff = Math.max(0, iconRefRect.top + rect.height - height);

        menuRef.current.style.top = `${iconRefRect.top - diff}px`;
        menuRef.current.style.left = `${iconRefRect.left + iconRefRect.width}px`;
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
            <span ref={iconRef}><Icon name={iconName} /></span>
            {activeMenuRecordId.value === recordId && createPortal(<div ref={menuRef} class={`text-white icon-menu-items drop-shadow-lg fixed bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep`}>
                {menuItems.map((item) => (
                    <div class="hover:bg-gray-700 cursor-pointer pr-2 pl-2" onClick={(e) => {
                        item.onClick();
                        clearPopupOwner();
                        e.stopPropagation();
                    }}><Icon name={item.icon} /> {item.name}</div>
                ))}
            </div>, document.getElementById("icon-menu")!)}
        </div>
    );
}
