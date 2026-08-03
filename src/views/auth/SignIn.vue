<script setup>
/**
 * HALAMAN MASUK (Login).
 * Alur & endpoint identik dengan seleris-credit-cover:
 *   - auth/login untuk masuk
 *   - auth/send-email-forgot-password untuk lupa kata sandi
 * Setelah berhasil, diarahkan ke beranda (Home).
 */
import { ref } from "vue";
import { Eye, EyeOff, User, Lock } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useMeta } from "@/composables/useMeta";
import BaseButton from "@/components/ui/BaseButton.vue";
import Logo from "/assets/images/cc-logo.png";

useMeta({ title: "Masuk" });

const auth = useAuthStore();

const username = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);

/** Tampilkan notifikasi ringkas memakai SweetAlert2 (global window.Swal). */
function alert(icon, title) {
  window.Swal.fire({
    icon,
    title,
    padding: "2em",
    timer: icon === "success" ? 2000 : undefined,
  });
}

async function onLogin() {
  // Validasi sederhana di sisi klien (backend tetap memvalidasi lagi).
  if (!username.value && !password.value)
    return alert("error", "Email Pengguna & Kata Sandi Wajib Diisi");
  if (!username.value) return alert("error", "Email Pengguna Wajib Diisi");
  if (!password.value) return alert("error", "Kata Sandi Wajib Diisi");

  loading.value = true;
  const result = await auth.login(username.value, password.value);
  loading.value = false;

  if (result.ok) {
    // FULL page load ke beranda (bukan router.push) — persis SCC
    // (`window.open(url, "_self")`). Alasannya: setelah logout, localStorage
    // (partnerIdSelected dkk.) kosong; dengan navigasi SPA, dashboard/list
    // sempat fetch data SEBELUM loadPartners/ensureSelectedPartner mengisinya,
    // sehingga data tampil basi sampai user refresh manual. Full load menjamin
    // semua store & sesi terinisialisasi dari nol dengan urutan yang benar.
    window.location.assign("/");
  } else {
    alert("error", result.message);
  }
}

async function onForgotPassword() {
  if (!username.value)
    return alert("error", "Isi Email Pengguna dulu untuk reset kata sandi");
  try {
    const ok = await auth.forgotPassword(username.value);
    ok
      ? alert("success", "Silakan Periksa Email Anda")
      : alert("error", "Email Pengguna tidak ditemukan");
  } catch {
    alert("error", "Gagal mengirim email. Coba lagi.");
  }
}
</script>

<template>
  <div
    class="rounded-lg border border-slate-100 bg-white px-7 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900 sm:px-9 sm:py-10"
  >
    <div class="mb-6 flex h-auto w-full justify-center">
      <!-- Logo Seleris Credit Cover (aslinya satu berkas, tanpa varian gelap) -->
      <img
        :src="Logo"
        alt="Seleris Credit Cover"
        class="h-[80px] w-auto object-contain"
      />
    </div>

    <h1
      class="mb-2 text-center text-2xl font-semibold text-slate-800 dark:text-slate-100"
    >
      Masuk
    </h1>
    <p
      class="mb-7 border-b border-slate-100 pb-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400"
    >
      Gunakan akun backoffice Anda.
    </p>

    <form class="space-y-5 text-left" @submit.prevent="onLogin">
      <div>
        <label class="form-label uppercase" for="username"
          >Email Pengguna</label
        >
        <div class="relative">
          <User
            class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-input rounded-lg bg-slate-50/70 pl-10 focus:bg-white dark:bg-slate-950/60"
            placeholder="Email Pengguna"
            autocomplete="username"
          />
        </div>
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label class="form-label mb-0 uppercase" for="password"
            >Kata Sandi</label
          >
          <button
            type="button"
            class="text-xs font-medium text-primary-500 hover:underline"
            @click="onForgotPassword"
          >
            Lupa Kata Sandi?
          </button>
        </div>
        <div class="relative">
          <Lock
            class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="form-input rounded-lg bg-slate-50/70 px-10 focus:bg-white dark:bg-slate-950/60"
            placeholder="Kata Sandi"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            @click="showPassword = !showPassword"
            :aria-label="
              showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
            "
          >
            <EyeOff v-if="showPassword" class="h-5 w-5" />
            <Eye v-else class="h-5 w-5" />
          </button>
        </div>
      </div>

      <BaseButton
        type="submit"
        variant="primary"
        size="lg"
        :loading="loading"
        class="w-full"
      >
        Masuk
      </BaseButton>
    </form>
  </div>
</template>
