# Love Diary — 女友日记小程序 设计文档

**Date:** 2026-05-28
**Platform:** Web (纯浏览器端，零后端依赖)

## 功能概述

- 顶部显示"在一起的天数"（从用户设置的起始日期计算）
- 日历视图，有记录的日期打点标记
- 点击日期查看/编辑当天日记
- 每条日记支持文字、心情表情、照片（最多 4 张）
- 数据全部存储在浏览器本地（IndexedDB + localStorage）

## 数据模型

### 全局设置（localStorage，key: "love-diary-settings"）

```
{ startDate: "2024-01-15" }
```

### 日记条目（IndexedDB，database: "loveDiary"，store: "entries"）

```
{
  id: auto-increment,
  date: "2024-05-28",        // YYYY-MM-DD（索引字段）
  content: "今天一起去吃火锅...",
  photos: ["data:image/jpeg;base64,..."],
  mood: "happy",             // happy | love | excited | normal | sad | miss
  createdAt: "2024-05-28T20:30:00.000Z"
}
```

## UI 布局

三段式从上到下：

1. **顶部栏** — 大字号显示"我们已经在一起 XXX 天"，点击弹出起始日期设置
2. **日历** — 月视图，左右箭头切换月份。有日记的日期显示小圆点。今天高亮。点击日期切换下方内容
3. **日记卡片区** — 当天所有日记卡片（心情 + 文字 + 照片缩略图 + 编辑/删除按钮）。空状态引导添加

### 编辑面板（弹窗）

- 心情选择：6 个表情单选
- 文字输入：textarea
- 照片：上传组件，最多 4 张，Canvas 压缩到 800px/0.7 质量
- 保存按钮

## 交互细节

- 默认选中今天
- 首次使用未设起始日期 → 引导用户设置
- 某天无日记 → 显示"这天还没有记录" + 快捷添加
- 照片点击放大查看
- 删除日记需确认
- 照片存储总量估算，超 50MB 提示清理

## 文件结构

```
demo/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── storage.js   # IndexedDB + localStorage 封装
│   ├── calendar.js  # 日历渲染逻辑
│   ├── diary.js     # 日记卡片渲染、编辑面板
│   └── app.js       # 主入口
└── CLAUDE.md
```

## 技术选型

- 纯原生 HTML/CSS/JS，零构建依赖
- IndexedDB 存日记（含 base64 照片），localStorage 存设置
- 响应式设计，手机和桌面均可使用

## 边界情况

| 场景 | 处理 |
|---|---|
| 未设起始日期 | 提示点击设置 |
| 当天无日记 | 显示空状态 + 快捷添加按钮 |
| 单日多条日记 | 按时间倒序排列 |
| 照片存储过大 | 提示清理旧照片 |
| 删除日记 | 确认弹窗 + 清理关联照片 |
| 日期晚于今天 | 不允许选择未来日期 |
