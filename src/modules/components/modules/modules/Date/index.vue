<script setup lang="ts">
import { ref, computed } from 'vue'

import type { ListItem, DateItem } from '@/modules/components/types/item.js'
import { formatDate } from '@/modules/components/utils/date.js'

import Card from '../modules/Card.vue'
import Scroll from '../modules/Scroll.vue'

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 位置 */
  position: [number, number]
  /** z-index */
  zIndex?: number
  /** 日期点击事件 */
  onDateClick?: () => void
}
const props = withDefaults(defineProps<Props>(), {
  zIndex: 0,
})
/** 日期 */
const date = defineModel<DateItem>('date', { default: () => formatDate(Date.now()) })

// 初始化
const today = formatDate(Date.now())
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const months: ListItem[] = Array(12)
  .fill(null)
  .map((_, index) => ({ id: index + 1, name: `${index + 1}月` }))
const years: ListItem[] = Array(200)
  .fill(null)
  .map((_, index) => ({ id: 1900 + index, name: `${1900 + index}年` }))

// 年月切换
const year = ref<number>(today[0])
const month = ref<number>(today[1])
const scrollIsOpen = ref<boolean>(false)
const activeIds = computed<[string | number, string | number]>({
  get: () => [year.value, month.value] as [string | number, string | number],
  set: ([newYearId, newMonthId]: [string | number, string | number]) => {
    year.value = Number(newYearId)
    month.value = Number(newMonthId)
  },
})
const decreaseMonth = () => {
  month.value = month.value - 1 >= 1 ? month.value - 1 : 12
  year.value = month.value === 12 ? year.value - 1 : year.value
}
const increaseMonth = () => {
  month.value = month.value + 1 > 12 ? 1 : month.value + 1
  year.value = month.value === 1 ? year.value + 1 : year.value
}

// 日历网格
const calendarDays = computed<string[]>(() => {
  const firstDay = (new Date(year.value, month.value - 1, 1).getDay() + 6) % 7
  const totalDays = new Date(year.value, month.value, 0).getDate()
  const totalCells = Math.ceil((firstDay + totalDays) / 7) * 7
  const days: string[] = new Array(totalCells).fill('')
  for (let d = 1; d <= totalDays; d++) {
    days[firstDay + d - 1] = String(d)
  }
  return days
})
const onDayClick = (e: MouseEvent) => {
  const targetEl = (e.target as HTMLElement).closest('[data-day]') as HTMLElement | null
  if (!targetEl) return
  date.value = [year.value, month.value, Number(targetEl.dataset.day)]
  props.onDateClick?.()
}

// 暴露日历
const dateRef = ref<HTMLElement | null>(null)
export type DateInstance = {
  root: HTMLElement | null
  props: Props
}
defineExpose<DateInstance>({
  get root() {
    return dateRef.value
  },
  props,
})
</script>

<template>
  <teleport to="body">
    <transition name="lovelymai-fade-leave">
      <Card
        :class="$style.dateContainer"
        :ref="(ins) => (dateRef = (ins as InstanceType<typeof Card> | null)?.$el ?? null)"
        v-if="props.visible"
        :style="{
          left: `${props.position[0]}px`,
          top: `${props.position[1]}px`,
          zIndex: props.zIndex,
        }"
      >
        <div :class="$style.header">
          <h5 :class="$style.date" @click.stop="() => (scrollIsOpen = !scrollIsOpen)">
            <span :style="{ color: scrollIsOpen ? 'var(--lovelymai-color-blue-300)' : '' }">{{
              `${year} 年 ${month} 月`
            }}</span>
            <span
              :class="['lovelymai', 'lovely-right-arrow', $style.arrow]"
              :style="{
                transform: scrollIsOpen
                  ? 'translateY(1px) rotate(90deg)'
                  : 'translateY(1px) rotate(0deg)',
              }"
            ></span>
          </h5>
          <div :class="$style.button">
            <span
              :class="['lovelymai', 'lovely-left-arrow', $style.arrow]"
              @click.stop="() => decreaseMonth()"
            ></span>
            <span
              :class="['lovelymai', 'lovely-right-arrow', $style.arrow]"
              @click.stop="() => increaseMonth()"
            ></span>
          </div>
        </div>
        <transition name="lovelymai-fade" mode="out-in">
          <Scroll v-if="scrollIsOpen" :lists="[years, months]" v-model:active-ids="activeIds" />
          <div :class="$style.days" v-else>
            <ul :class="$style.weekdays">
              <li v-for="weekday in weekDays">{{ weekday }}</li>
            </ul>
            <ul :class="$style.monthDays" @click.stop="onDayClick">
              <li v-for="(day, index) in calendarDays" :key="index" :class="$style.dayCell">
                <span
                  :class="[
                    $style.day,
                    {
                      [$style.today]:
                        year === today[0] && month === today[1] && Number(day) === today[2],
                      [$style.active]:
                        year === date[0] && month === date[1] && Number(day) === date[2],
                    },
                  ]"
                  v-if="day"
                  :data-day="day"
                  >{{ day }}</span
                >
              </li>
            </ul>
          </div>
        </transition>
      </Card>
    </transition>
  </teleport>
</template>

<style module>
.dateContainer {
  position: absolute;
  z-index: 0;
  width: 250px;
  padding: 14px;
  border-radius: 16px;
  user-select: none;
  -webkit-user-select: none;
}

.header {
  display: flex;
  justify-content: space-between;
  height: 24px;
  margin-bottom: 14px;
}

.header .date {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.header .date .arrow {
  font-size: 14px;
  transition: transform 0.5s;
}

.header .button {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header .button .arrow {
  font-size: 20px;
}

.days .weekdays {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--lovelymai-color-gray-300);
}

.days .monthDays {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;
}

.days .dayCell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% / 7);
  height: 32px;
}

.days .day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  font-weight: 450;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s;
}

.days .day.today {
  color: var(--lovelymai-color-blue-200);
}

.days .day.active {
  background-color: var(--lovelymai-color-blue-200);
  color: #fff;
}
</style>
<style scoped>
.lovelymai {
  font-weight: 600;
  color: var(--lovelymai-color-blue-300);
  transform: translateY(1px);
  cursor: pointer;
}
</style>
