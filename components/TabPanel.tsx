import { ComponentChildren } from "preact";

export interface TabLink {
  name: string;
  link: string;
}

interface TabPanelProps {
  activeLink?: string;
  links: TabLink[];
  children: ComponentChildren;
}

export function TabPanel({ links, children, activeLink }: TabPanelProps) {
  return (
    <div class="flex flex-col">
      <div class="flex">
        <ul class="flex space-x-4 m-5">
          {links.map((link) => (
            <li
              key={link.link}
            >
              <a
                href={link.link}
                class={`${
                  link.link == activeLink
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 hover:bg-gray-600 hover:text-white"
                } p-3 rounded-lg`}
              >
                {link.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div class="flex-grow rounded-lg bg-gray-200 shadow-md mr-5 ml-5 mb-5 p-5">
        {children}
      </div>
    </div>
  );
}
