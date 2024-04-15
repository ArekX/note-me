const wallpapersPerMonth = {
    1: "/wallpapers/winter1.jpg",
    2: "/wallpapers/winter1.jpg",
    3: "/wallpapers/spring1.jpg",
    4: "/wallpapers/spring1.jpg",
    5: "/wallpapers/spring1.jpg",
    6: "/wallpapers/summer1.jpg",
    7: "/wallpapers/summer1.jpg",
    8: "/wallpapers/summer1.jpg",
    9: "/wallpapers/autumn1.jpg",
    10: "/wallpapers/autumn1.jpg",
    11: "/wallpapers/autumn1.jpg",
    12: "/wallpapers/winter1.jpg",
};

export const getCurrentMonthWallpaper = () => {
    const month = new Date().getMonth() + 1 as keyof typeof wallpapersPerMonth;
    return wallpapersPerMonth[month];
};
