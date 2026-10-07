# 使用指南

## 第一步：在入口文件中引入 CSS

在你的主入口文件（通常是 `main.js` 或 `main.ts`）**最顶部**添加以下导入语句：

```javascript
import 'lovelymaid/style.css'
```

**重要提示：** 确保此导入语句位于项目中**所有其他样式导入之前**。这样你的自定义样式才能覆盖组件库的默认样式。

示例 `main.js`：

```javascript
// main.js 或 main.ts
import 'lovelymaid/style.css'
import './your-own-styles.css'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

## 第二步：在任何 Vue 组件中使用组件

直接在 Vue 组件中导入并使用 lovelymaid 组件：

```vue
<script setup>
import { SideBar } from 'lovelymaid'
</script>

<template>
  <SideBar :visible="true"> 侧边栏内容 </SideBar>
</template>
```
