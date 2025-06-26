import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import "./style.css";
import App from "./App.vue";
import { StorageService } from "./services/storage";

const app = createApp(App);

// 使用Element Plus
app.use(ElementPlus);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 强制重置存储服务以确保环境检测正确
console.log("🚀 应用启动，强制重置存储服务");
StorageService.getInstance().forceReset();

app.mount("#app").$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on("main-process-message", (_event, message) => {
    console.log(message);
  });
});
