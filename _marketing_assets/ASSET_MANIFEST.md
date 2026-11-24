# Inkfolk Clash 项目扫描与营销素材清单（Asset Manifest）

> 本文档记录基于真实游戏代码库扫描提取的美术资产、实机截图、音频资源与核心系统配置，所有资源已同步复制至 `_marketing_assets/raw_assets/` 以保证官网、图文脚本和视频脚本完全独立可移植并可直接提交 Git。

---

## 1. 原始美术原画（6 张高清手绘战果 CG）

| 资产编号 | 原始项目路径 | 独立副本路径 | 对应成就 / 场景说明 |
| :--- | :--- | :--- | :--- |
| CG-V1 | `src/assets/images/victory_banner_dawn_1795078405542.jpg` | `_marketing_assets/raw_assets/cgs/victory_banner_dawn.jpg` | **First Dawn · 破晓旌旗**（第 1–3 章常规胜利，晨曦城头与战旗） |
| CG-V2 | `src/assets/images/victory_swarm_surge_1795078403724.jpg` | `_marketing_assets/raw_assets/cgs/victory_swarm_surge.jpg` | **Tide of Vanguard · 铁骑破阵**（单局出动 10+ 皇家精锐胜利，人潮与巨像突进） |
| CG-V3 | `src/assets/images/victory_astral_crown_1795078445702.jpg` | `_marketing_assets/raw_assets/cgs/victory_astral_crown.jpg` | **Sovereign of the Spire · 星穹加冕**（第 4–5 章或进化至 Age III+ 胜利，星光尖塔与黄金巨像） |
| CG-D1 | `src/assets/images/defeat_rain_retreat_1795078407722.jpg` | `_marketing_assets/raw_assets/cgs/defeat_rain_retreat.jpg` | **Rain Before Dawn · 孤灯雨撤**（前期战败，雨夜举盾撤退与孤灯微光） |
| CG-D2 | `src/assets/images/defeat_inches_short_1795078407840.jpg` | `_marketing_assets/raw_assets/cgs/defeat_inches_short.jpg` | **One Stone Short · 功亏一篑**（敌城残血 ≤35% 惜败，裂纹城墙与残箭余烬） |
| CG-D3 | `src/assets/images/defeat_siege_eclipse_1795078407548.jpg` | `_marketing_assets/raw_assets/cgs/defeat_siege_eclipse.jpg` | **Bell of Defiance · 暗日战鼓**（后期苦战落败，黑铁巨像阴影与不屈鼓手） |

---

## 2. 实机高分竖屏截图（780×1688，2x 视网膜渲染）

| 截图编号 | 文件路径 | 画面内容 |
| :--- | :--- | :--- |
| SCR-01 | `_marketing_assets/raw_assets/screenshots/screen_01_title_age1.png` | 主界面首屏：双方城堡、领主王冠徽章、蓝金骑士与敌方重型机械巨像实时对阵 |
| SCR-02 | `_marketing_assets/raw_assets/screenshots/screen_02_battle_clash.png` | 激战拉锯实机：骑士挥剑横扫、游侠齐射、不规则手绘石路、左下角实时 Battle Log 战报 |
| SCR-03 | `_marketing_assets/raw_assets/screenshots/screen_03_prewave_alert.png` | 大波次来袭预警：全屏风暴变暗闪烁、号角倒计时横幅与敌军兵种侦察清单 |
| SCR-04 | `_marketing_assets/raw_assets/screenshots/screen_04_chapters_map.png` | 5 章节 15 关战役地图与无限时间线（Timeline）进度界面 |
| SCR-05 | `_marketing_assets/raw_assets/screenshots/screen_05_achievements_cg.png` | 战史成就馆（Awards 6/6）：6 张手绘 CG 解锁鉴赏与金币赏金领取 |
| SCR-06 | `_marketing_assets/raw_assets/screenshots/screen_06_age5_astral.png` | Age V 星穹时代展示：星光城堡、顶阶皇家精锐与 VIP 进阶状态 |

---

## 3. 音频与程序化音效资产

项目核心战斗音效由 `src/game/audio.ts` + `src/game/useBattleCollisionAudio.ts` 基于 Web Audio API 实时程序化合成（含 4 种刀剑交锋、3 种战鼓节奏、4 种战场呐喊、号角预警、巨人重踏与震地重击）。为便于宣传视频自动化合成，已同步生成 4 条同风格战鼓/号角/行军 `.wav` 配乐轨道：

| 音频路径 | 风格与时长 | 适用视频 |
| :--- | :--- | :--- |
| `_marketing_assets/raw_assets/audio/bgm_heroic_march.wav` | 108 BPM 史诗行军战鼓 + 号角（22s） | 概念 PV、核心玩法演示 |
| `_marketing_assets/raw_assets/audio/bgm_warhorn_siege.wav` | 124 BPM 攻城高燃急鼓 + 刀剑高频泛音（20s） | 巨像 Boss 挑战、爽点集锦 |
| `_marketing_assets/raw_assets/audio/bgm_chronicle_calm.wav` | 92 BPM 苍凉史诗铜管铺底（18s） | 5 时代进化与世界观展示 |
| `_marketing_assets/raw_assets/audio/bgm_countdown_hype.wav` | 136 BPM 强节奏预告鼓点（16s） | 发售预告 / 悬念冲刺片 |

---

## 4. 核心代码与数值来源索引

- **时代与兵种配置**：`src/game/content.ts`（5 大时代、15 关锯齿难度曲线、3 大波次节奏、无限 Timeline 倍率）
- **战斗引擎逻辑**：`src/game/engine.ts`（4 目标范围顺劈、3–5 目标穿透箭矢、42 粮草机械巨像霸体震地、波次全清后 `Final Charge` +80% 移速/+50% 攻城伤害）
- **手绘渲染引擎**：`src/game/renderer.ts`（水彩冷压纸纹理、双阵营 5 时代城堡与 60%/30% 战损裂纹、H1 蓝金头盔/游侠羽帽、25 块自然多面体路石、波次前变暗闪烁）
- **实时战报与成就**：`src/game/useBattleLog.ts`、`src/game/cgCatalog.ts`、`src/game/storage.ts`
- **移动原生封装**：`capacitor.config.ts`（`com.inkfolkclash.game`）、`android/`、`.github/workflows/build-android-apk.yml`
