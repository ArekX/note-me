import Button, { ButtonColors, ButtonSize } from "$components/Button.tsx";
import Icon, { IconSize } from "$components/Icon.tsx";
import { createRef, JSX } from "preact";
import { createPortal, Ref } from "preact/compat";
import {
    PopoverId,
    useSinglePopover,
} from "$frontend/hooks/use-single-popover.ts";
import { useWindowResize } from "$frontend/hooks/use-window-resize.ts";

export interface DropdownMenuItem {
    name: string;
    icon: string;
    onClick: () => void;
}

type MenuShowDirection = "right" | "bottom";
type DisplayType = "portal" | "inline";
type InlineDirection = "left" | "right" | "top";

interface DropdownMenuProps {
    popoverId: PopoverId;
    label?: string | JSX.Element;
    roundedButton?: boolean;
    buttonBorderClass?: string;
    icon?: string;
    iconSize?: IconSize;
    buttonSize?: ButtonSize;
    buttonColor?: ButtonColors;
    iconOnly?: boolean;
    inlineDirection?: InlineDirection;
    showDirection?: MenuShowDirection;
    displayType?: DisplayType;
    items: DropdownMenuItem[];
}

interface MenuItemProps {
    items: DropdownMenuItem[];
    menuRef: Ref<HTMLDivElement>;
    displayType: DisplayType;
    inlineDirection: InlineDirection;
    onClick: (item: DropdownMenuItem) => void;
}

const MenuItems = (
    { items, menuRef, displayType, inlineDirection, onClick }: MenuItemProps,
) => {
    let inlineDirectionClass = "top-full";

    if (displayType === "inline") {
        if (inlineDirection === "right") {
            inlineDirectionClass = "top-full right-0";
        } else if (inlineDirection === "top") {
            inlineDirectionClass = "bottom-full mb-2 right-0";
        }
    }

    return (
        <div
            ref={menuRef}
            class={`text-white absolute ${inlineDirectionClass} text-md mt-1 z-50 drop-shadow-lg 
                    bg-gray-800 border-gray-700 border border-b-0 rounded-lg shadow-black/80 shadow-sm 
                    whitespace-nowrap break-keep`}
        >
            {items.map((item, index) => (
                <div
                    key={index}
                    class="hover:bg-gray-700 hover:border-gray-600/90 border-t border-transparent cursor-pointer py-1 px-4 last:rounded-b-lg first:rounded-t-lg text-left"
                    onClick={() => onClick(item)}
                >
                    <Icon name={item.icon} /> {item.name}
                </div>
            ))}
        </div>
    );
};

export default function DropdownMenu(
    {
        items,
        popoverId,
        icon = "chevron-down",
        iconOnly = false,
        roundedButton = true,
        buttonBorderClass = "",
        iconSize = "md",
        buttonSize = "md",
        displayType = "inline",
        inlineDirection = "right",
        buttonColor = "primary",
        label = "",
        showDirection = "bottom",
    }: DropdownMenuProps,
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

    const handleItemClick = (item: DropdownMenuItem) => {
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
                            rounded={roundedButton}
                            borderClass={buttonBorderClass}
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
