import Button, { ButtonColors, ButtonSize } from "$components/Button.tsx";
import Icon, { IconSize } from "$components/Icon.tsx";
import { createRef, JSX } from "preact";
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
    label?: string | JSX.Element;
    icon?: string;
    iconSize?: IconSize;
    buttonSize?: ButtonSize;
    buttonColor?: ButtonColors;
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
    onClick: (item: MoreMenuItem) => void;
}

const MenuItems = (
    { items, menuRef, displayType, inlineDirection, onClick }: MenuItemProps,
) => (
    <div
        ref={menuRef}
        class={`text-white absolute top-full ${
            displayType == "inline" && inlineDirection !== "left"
                ? "right-0"
                : ""
        } text-md mt-1 z-50 drop-shadow-lg bg-gray-800 rounded-lg shadow-lg p-2 whitespace-nowrap break-keep`}
    >
        {items.map((item, index) => (
            <div
                key={index}
                class="hover:bg-gray-700 cursor-pointer p-1 pl-2 pr-2"
                onClick={() => onClick(item)}
            >
                <Icon name={item.icon} /> {item.name}
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
        buttonSize = "md",
        displayType = "inline",
        inlineDirection = "right",
        buttonColor = "primary",
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

    const { isOpen, open, close } = useSinglePopover(
        popoverId,
        menuRef,
        () => repositionMenu(innerWidth, innerHeight),
    );

    const handleOpenMenu = (e: Event) => {
        e.stopPropagation();
        open();
    };

    const handleItemClick = (item: MoreMenuItem) => {
        item.onClick();
        close();
    };

    useWindowResize(menuRef, repositionMenu);

    const menuItemsComponent = (
        <MenuItems
            inlineDirection={inlineDirection}
            displayType={displayType}
            items={items}
            menuRef={menuRef}
            onClick={handleItemClick}
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
                            color={buttonColor}
                            onClick={handleOpenMenu}
                            size={buttonSize}
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
