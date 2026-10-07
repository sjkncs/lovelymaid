import '@/assets/styles/reset.css'
import '@/assets/styles/main.css'
import '@/assets/icons/iconfont.css'

export { vSafeClick } from './modules/directives/safe-click'

export { default as Button } from './modules/components/Button'
export { default as Card } from './modules/components/Card'
export { default as CheckBox } from './modules/components/CheckBox'
export { default as ContentBar } from './modules/components/ContentBar'
export { default as FoldList } from './modules/components/FoldList.vue'
export { default as Form, type FormItem } from './modules/components/Form.vue'
export { default as Input } from './modules/components/Input'
export { default as Loading } from './modules/components/Loading'
export { default as MenuBar } from './modules/components/MenuBar.vue'
export { default as Modal } from './modules/components/Modal.vue'
export { default as Select } from './modules/components/Select.vue'
export { default as SideBar } from './modules/components/SideBar.vue'
export { default as TabBar } from './modules/components/TabBar.vue'
export {
  default as Table,
  type ColumnConfig,
  type SortConfig,
} from './modules/components/Table.vue'
export { default as TextArea } from './modules/components/TextArea'

import './modules/side-effects'
