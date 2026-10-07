<script setup lang="ts">
import { ref } from 'vue'

import {
  Button,
  Card,
  ContentBar,
  FoldList,
  Form,
  type FormItem,
  Input,
  TabBar,
  MenuBar,
  Modal,
  Select,
  SideBar,
  Table,
  type ColumnConfig,
  type SortConfig,
  TextArea,
} from '@/index'

// 侧边栏
const sidebarIsOpen = ref<boolean>(false)

// 折叠列表
const listIsOpen = ref<boolean>(true)
const listActiveId = ref<number>()

// 标签栏
const activeId = ref<number>(1)
const searchValue = ref('')

// 表单
const formItems = ref<FormItem[]>([
  { id: 1, name: '姓名', type: 'text', value: '麦麦' },
  {
    id: 2,
    name: '性别',
    type: 'radio',
    value: '',
    options: [
      {
        id: 1,
        name: '男孩子',
        options: [
          { id: 1, name: '麦麦1号' },
          { id: 2, name: '麦麦2号' },
        ],
      },
      { id: 2, name: '女孩子' },
    ],
  },
  { id: 3, name: '年龄', type: 'number', value: '' },
  {
    id: 4,
    name: '机构',
    type: 'checkbox',
    value: [],
    options: [
      {
        id: 1,
        name: '杭州',
        options: [
          {
            id: 1,
            name: '上城区',
            options: [
              { id: 1, name: '上城区第一人民医院' },
              { id: 2, name: '杭州市第二人民医院' },
            ],
          },
          { id: 2, name: '上城总院' },
        ],
      },
      { id: 2, name: '苏州第一人民医院' },
    ],
    filter: true,
  },
  { id: 5, name: '描述', type: 'textarea', value: '' },
  { id: 6, name: '日期', type: 'date', value: '' },
])
const textareaValue = ref<string>('')
const files = ref([])

// 表格
const columns = ref<ColumnConfig[]>([
  { id: 1, name: '名称', prop: 'name' },
  { id: 2, name: '上次打开日期', prop: 'lastOpenDate' },
  { id: 3, name: '大小', prop: 'size', width: '1000px' },
])
const rows = ref([
  { id: 1, name: '简历2.pdf', lastOpenDate: '2026/7/1', size: '1 MB' },
  { id: 2, name: '简历10.pdf', lastOpenDate: '2026/7/2', size: '2 MB' },
  { id: 3, name: '简历3.pdf', lastOpenDate: '2026/7/3', size: '3 MB' },
  { id: 4, name: '简历4.pdf', lastOpenDate: '2026/7/4', size: '4 MB' },
])
const activeIds = ref<Set<number>>(new Set())
const sortConfig = ref<SortConfig>({ id: 1, order: 'asc' })

// 弹窗
const modalIsVisible = ref<boolean>(false)
const inputValue = ref<string>('')
</script>

<template>
  <SideBar class="SideBar" v-model:open="sidebarIsOpen" :loading="true">
    <template #title>侧边栏</template>
  </SideBar>
  <Card class="Card">
    <FoldList
      class="FoldList"
      :list="formItems"
      v-model:open="listIsOpen"
      v-model:active-id="listActiveId"
    />
    <TabBar
      class="TabBar"
      :tabs="formItems"
      v-model:active-id="activeId"
      :show-search="true"
      v-model:value="searchValue"
      v-slot="{ tab, index }"
    >
      <span class="lovelymai lovely-search"></span>
      <span class="text">{{ tab.name }}</span>
    </TabBar>
  </Card>
  <Card class="Card">
    <Form v-model:items="formItems" />
    <Button class="Button" type="glass" :on-click="() => (modalIsVisible = true)">打开</Button>
    <TextArea v-model:value="textareaValue" paste-file v-model:files="files" style="max-height: 150px;">
      <div style="height: 50px">111</div>
    </TextArea>
    <Select :options="formItems" style="width: 60px;height: 30px;font-size: 20px;"></Select>
  </Card>
  <Table
    class="Table"
    :columns="columns"
    :rows="rows"
    v-model:active-ids="activeIds"
    v-model:sort="sortConfig"
  />
  <Modal v-model:visible="modalIsVisible">
    <template #header>标题</template>
    <template #center>
      <Input class="Input" v-model:value="inputValue">
        <span class="lovelymai lovely-search"></span>
      </Input>
    </template>
  </Modal>
</template>

<style scoped>
.Card {
  padding: 20px;
  margin: 20px;
  border-radius: 20px;
}

.SideBar {
  position: fixed;
  left: 20px;
  z-index: 1;
  width: 200px;
  height: 90dvh;
}

.TabBar .lovelymai {
  font-size: 22px;
}

.TabBar .text {
  font-size: 10px;
}

.MenuBar {
  width: 100px;
  height: 40px;
}

.Table {
  margin: 20px;
}

.Button {
  width: 50px;
}
</style>
