<script setup>
/**
 * Komponen Icon — merender ikon dari 'lucide-vue-next' berdasarkan NAMA (string).
 *
 * Kenapa dibungkus? Supaya menu cukup menyebut nama ikon (mis. icon: 'Wallet')
 * sebagai data, tanpa mengimpor komponen ikon di banyak tempat.
 *
 * Menambah ikon baru: import di bawah lalu daftarkan ke objek `icons`.
 */
import {
  LayoutDashboard, Database, FileText, ClipboardList, RotateCcw, BarChart3,
  Wallet, Tag, TrendingUp, Layers, Activity, PieChart, Headphones, ShieldAlert,
  CalendarClock, FolderSearch, Calculator, BookOpen,
  // UI umum
  Menu, Search, Bell, Sun, Moon, Monitor, User, LogOut, Settings, ChevronDown,
  ChevronRight, X, Globe, KeyRound, Circle,
} from 'lucide-vue-next'

const icons = {
  LayoutDashboard, Database, FileText, ClipboardList, RotateCcw, BarChart3,
  Wallet, Tag, TrendingUp, Layers, Activity, PieChart, Headphones, ShieldAlert,
  CalendarClock, FolderSearch, Calculator, BookOpen,
  Menu, Search, Bell, Sun, Moon, Monitor, User, LogOut, Settings, ChevronDown,
  ChevronRight, X, Globe, KeyRound, Circle,
}

const props = defineProps({
  name: { type: String, required: true },
  // Ukuran mengikuti kelas Tailwind di pemakai (mis. class="h-5 w-5"),
  // jadi tidak perlu prop size.
})

// Kalau nama tidak dikenal, pakai ikon 'Circle' agar tidak error/blank.
const component = icons[props.name] || Circle
</script>

<template>
  <component :is="component" />
</template>
