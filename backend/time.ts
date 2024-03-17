export const getCurrentUnixTimestamp = () => Math.floor(Date.now() / 1000);

export const supportedTimezones = Intl.supportedValuesOf("timeZone");

export const supportedTimezoneList = supportedTimezones
    .map((zone) => ({
        label: zone.replace(/\//g, " - ").replace(/\_/g, " "),
        value: zone,
    }));
