import { PageProps } from "$fresh/server.ts";
import { TabPanel } from "$components/TabPanel.tsx";

export default function Layout({ Component, route }: PageProps) {
  const settings = [
    {
      name: "General",
      link: "/app/settings",
    },
    {
      name: "Users",
      link: "/app/settings/users",
    },
    {
      name: "Tags",
      link: "/app/settings/tags",
    },
  ];

  return (
    <TabPanel
      links={settings}
      activeLink={route}
    >
      <Component />
    </TabPanel>
  );
}
