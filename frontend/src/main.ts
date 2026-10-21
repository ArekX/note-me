import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import { router } from "./router";

import "boxicons/css/boxicons.min.css";
import "./assets/styles.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount("#app");

if (import.meta.env.PROD && "serviceWorker" in navigator) {
    // The worker only makes the app installable and its shell load offline;
    // the app works the same without it.
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}
