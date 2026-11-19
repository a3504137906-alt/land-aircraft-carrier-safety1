# 小鹏汇天「陆地航母」(ARIDGE Land Aircraft Carrier) 全方位系统安全分析

> 《飞行汽车技术基础（2026）》课程作业-2 · 根目录 `index.html` · 截止时间：2026 年 11 月 26 日 18:00

## 项目结构

```text
land-aircraft-carrier-safety-analysis/
├── index.html          # 主安全分析报告网页（根目录入口，支持中英双语切换与打印/PDF）
├── assets/
│   ├── style.css       # 三栏学术工程排版样式、安全严酷度徽章、响应式与打印规则
│   └── app.js          # 双语切换、HARA/FHA 风险标定器、STPA 筛选、FTA 最小割集仿真器、GSN 门控核查
└── README.md           # 项目说明与 GitHub Pages 零命令行部署指南
```

## 核心方法论覆盖
1. **跨界系统定义与标准映射**：`ISO 26262`、`SAE ARP4754B/4761A`、`EASA SC-VTOL-01`、`CAAC CCAR-21-R5 (X3-F 专用条件)`。
2. **CAST 实证事故逆向剖析**：针对 2025-09-16 长春航展双机编队接触起火公开事件的四层控制链回溯。
3. **双域危险分析（FHA + HARA）**：含交互式 `ISO 26262 ASIL × ARP4761A DAL` 双域标定器。
4. **STPA 分层控制结构与 12 项 UCA 矩阵**。
5. **FTA 故障树、DFMEA 与 CCA（ZSA/PRA/CMA）**：含交互式六旋翼冗余最小割集概率仿真器。
6. **ISO 21448 SOTIF 与 ODD/ODC 边界** + **GB 38031-2025 热安全与追尾碰撞** + **ISO/SAE 21434 TARA** + **ISO 34502 V&V** + **GSN v3 安全论据与放行门控核查**。

## GitHub 推送与 GitHub Pages 部署步骤（无需命令行 Git）

> 提示：可将作业-2 推送到一个新的 Public 仓库（推荐，与作业-1 链接区分提交），或提交后在飞书收集表填写对应的网页 URL。

1. 登录你本人注册的 GitHub 账号，点击右上角 **`+` → `New repository`**。
2. 填写仓库名称（如 `land-aircraft-carrier-safety`），可见性选择 **`Public`**，点击 **`Create repository`**。
3. 点击 **`uploading an existing file`**（或进入仓库后点击 **`Add file` → `Upload files`**）。
4. 将本文件夹内的 **`index.html`**、**`assets/`** 文件夹（含 `style.css` 和 `app.js`）以及 **`README.md`** 整体拖拽上传（确保 `index.html` 位于仓库根目录），点击 **`Commit changes`**。
5. 进入仓库 **`Settings` → 左侧 `Pages`**：
   - **Source** 选择 **`Deploy from a branch`**；
   - **Branch** 选择 **`main`**、目录选择 **`/ (root)`**，点击 **`Save`**。
6. 等待约 1–2 分钟刷新页面，复制生成的公网链接 `https://<你的GitHub用户名>.github.io/<仓库名>/`，测试确认 `EN/中文` 切换及各交互工具运行正常后，填入课程飞书作业收集表（截止时间 **2026-11-26 18:00**）。
