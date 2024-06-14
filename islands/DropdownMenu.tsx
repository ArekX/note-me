import Button from "$components/Button.tsx";
import Icon, { IconSize } from "$components/Icon.tsx";
import { createRef } from "preact";
import { createPortal, Ref } from "preact/compat";
import {
    PopoverId,
    useSinglePopover,
} from "$frontend/hooks/use-single-popover.ts";
import { useWindowResize } from "$frontend/hooks/use-window-resize.ts";

export interface MoreMenuItem {
    name: string;
    icon: string;
    onClick: () => void;
}

type MenuShowDirection = "right" | "bottom";
type DisplayType = "portal" | "inline";
type InlineDirection = "left" | "right";

interface MoreMenuProps {
    popoverId: PopoverId;
    label?: string;
    icon?: string;
    iconSize?: IconSize;
    iconOnly?: boolean;
    inlineDirection?: InlineDirection;
    showDirection?: MenuShowDirection;
    displayType?: DisplayType;
    items: MoreMenuItem[];
}

interface MenuItemProps {
    items: MoreMenuItem[];
    menuRef: Ref<HTMLDivElement>;
    displayType: DisplayType;
    inlineDirection: InlineDirection;
}

const MenuItems = (
    { items, menuRef, displayType, inlineDirection }: MenuItemProps,
) => (
    <div
        ref={menuRef}
        class={`text-white absolute top-full ${
            displayType == "inline" && inlineDirection !== "left"
                ? "right-0"
                : ""
        } text-md mt-1 z-50 drop-shadow-lg bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep`}
    >
        {items.map(({ name, icon, onClick }, index) => (
            <div
                key={index}
                class="hover:bg-gray-700 cursor-pointer p-1 pl-2 pr-2"
                onClick={onClick}
            >
                <Icon name={icon} /> {name}
            </div>
        ))}
    </div>
);

export default function DropdownMenu(
    {
        items,
        popoverId,
        icon = "chevron-down",
        iconOnly = false,
        iconSize = "md",
        displayType = "inline",
        inlineDirection = "right",
        label = "",
        showDirection = "bottom",
    }: MoreMenuProps,
) {
    if (items.length === 0) {
        return null;
    }

    const menuRef = createRef<HTMLDivElement>();
    const buttonRef = createRef<HTMLDivElement>();

    const repositionMenu = (_width: number, height: number) => {
        if (
            displayType !== "portal" || !menuRef.current || !buttonRef.current
        ) {
            return;
        }

        const rect = menuRef.current.getBoundingClientRect();
        const iconRefRect = buttonRef.current!.getBoundingClientRect();

        const diff = Math.max(0, iconRefRect.top + rect.height - height);

        if (showDirection === "right") {
            menuRef.current.style.top = `${iconRefRect.top - diff}px`;
            menuRef.current.style.left = `${
                iconRefRect.left + iconRefRect.width
            }px`;
            return;
        }

        menuRef.current.style.top = `${iconRefRect.top + iconRefRect.height}px`;
        menuRef.current.style.left = `${iconRefRect.left}px`;
    };

    const { isOpen, open } = useSinglePopover(
        popoverId,
        menuRef,
        () => repositionMenu(innerWidth, innerHeight),
    );

    const handleOpenMenu = (e: Event) => {
        e.stopPropagation();
        open();
    };

    useWindowResize(menuRef, repositionMenu);

    const menuItemsComponent = (
        <MenuItems
            inlineDirection={inlineDirection}
            displayType={displayType}
            items={items}
            menuRef={menuRef}
        />
    );

    return (
        <div class="relative inline-block">
            {iconOnly
                ? (
                    <span
                        ref={buttonRef}
                        onClick={handleOpenMenu}
                        class="cursor-pointer"
                    >
                        <Icon name={icon} size="3xl" />
                    </span>
                )
                : (
                    <div ref={buttonRef}>
                        <Button
                            color="primary"
                            onClick={handleOpenMenu}
                            size="md"
                        >
                            {label} <Icon name={icon} size={iconSize} />
                        </Button>
                    </div>
                )}

            {isOpen && (displayType === "portal"
                ? createPortal(
                    menuItemsComponent,
                    document.getElementById("icon-menu")!,
                )
                : menuItemsComponent)}
        </div>
    );
}
