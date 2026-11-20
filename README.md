# Inkfolk Clash

> 一款基于 **React + Vite + Tailwind** 构建、由 **Capacitor 8** 封装成安卓 App 的竖屏水道拉锯战（Lane Tug-of-War）策略游戏：水墨风多角色阵容，登场战斗实时对阵。仓库本地名：`Inkfolk-Clash-s`。

---

## 核心特色

- **拉锯战对局**：竖屏分路对战，通过阵容与时机把战线推向对方一侧。
- **多角色阵容策略**：不同能力的角色搭配，形成克制与协同组合。
- **水墨美术风格**：水墨笔触的角色与场景表现，风格化视觉辨识度高。
- **主菜单 / 战斗双预览**：App 自带主菜单与实时战斗演示画面，边看边调。

---

## 技术栈与项目结构

- **Web 侧**：React + Vite + Tailwind（战斗逻辑与渲染全在 Web 侧）
- **原生壳**：@capacitor/core·android·cli `^8.6.2`，`android/` 工程提交进仓库
- **应用信息**：appId `com.inkfolkclash.game` / appName **Inkfolk Clash** / webDir `dist`
- **构建目标**：compileSdk 36 / targetSdk 36 / minSdk 24 / debug 自签名

```text
├── src/                      # 游戏本体（对局逻辑、角色、渲染、音效）
├── android/                  # Capacitor 生成的原生安卓工程
├── capacitor.config.ts       # appId / appName / webDir 配置
└── .github/workflows/
    └── build-android-apk.yml # lint → build → cap sync → assembleDebug → latest-apk
```

---

## 下载与安装 APK

每次 push 到 `main` 后，CI 自动把最新 debug APK 挂到 **latest-apk 滚动 Release**：

1. 仓库首页 → **Releases** → **`latest-apk`**（Tag 固定，构建自动覆盖更新）；
2. 下载 APK（形如 `InkfolkClash-v<b>.<b>-debug.apk`）；
3. 传至安卓手机，允许"未知来源"安装（debug 签名）。

也可在 **Actions → 最新 run → Artifacts** 下载（保留 14 天）。打包详情见 [`docs/android_apk_packaging_guide.md`](docs/android_apk_packaging_guide.md)（与同组织 Capacitor 仓库共用一套模板）。

---

## 本地构建

前置：Node 22+、JDK 21、Android SDK（platform 36 + build-tools 36）。

```bash
npm install --legacy-peer-deps
npm run android:sync      # tsc 类型检查 + vite build + cap sync android
cd android && ./gradlew assembleDebug   # Windows: gradlew.bat
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk`。

---

## 当前状态

早期可测试版本（已具备自动出包 + 最新 APK 可装）。玩法需要对战斗节奏、角色平衡与美术表现做真机体验后再优化。