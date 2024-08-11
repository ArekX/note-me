import { PageProps } from "$fresh/server.ts";
import TabPanel from "../../../islands/TabPanel.tsx";
import { AppState } from "$types";

export default function Layout(
    { Component, route }: PageProps<never, AppState>,
) {
    const settings = [
        {
            "name": "Profile",
            "link": "/app/profile",
        },
        {
            "name": "Files",
            "link": "/app/profile/files",
        },
        {
            "name": "Data",
            "link": "/app/profile/data",
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
