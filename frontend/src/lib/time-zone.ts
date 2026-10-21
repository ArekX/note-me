export const resolveTimeZone = (): string =>
    Intl.DateTimeFormat().resolvedOptions().timeZone;

export const supportedTimezones: string[] = Intl.supportedValuesOf("timeZone");

if (!supportedTimezones.includes("UTC")) {
    supportedTimezones.push("UTC");
}

export const supportedTimezoneList = supportedTimezones.map((zone) => ({
    label: zone.replace(/\//g, " - ").replace(/_/g, " "),
    value: zone,
}));
