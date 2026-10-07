import { DateItem } from '@/modules/components/types/item'

// 格式化时间
export function formatDate(date: number | Date): DateItem {
  const d = typeof date === 'number' ? new Date(date) : date
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
}

// 验证 DateItem 是否合法
export function verifyDate(date: DateItem): boolean {
  // 闰年判断
  function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  }
  const [year, month, day] = date
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || month > 12) return false
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= daysInMonth[month - 1]
}
