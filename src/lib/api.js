import axios from "axios";
import { getToken, clearSession } from "./auth";

/**
 * Instance axios TERPUSAT.
 *
 * Kenapa terpusat? Supaya token, base URL, dan penanganan error diatur di SATU
 * tempat. Junior cukup panggil `api.get('endpoint')` tanpa memikirkan token.
 *
 * PENTING: base URL & endpoint SAMA PERSIS dengan ehd-backoffice (VITE_API_URL).
 * Kode lama menulis `config = { headers: { Authorization: 'Bearer ' + token } }`
 * di setiap panggilan — sekarang itu ditambahkan otomatis oleh interceptor.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

let isTokenExpiredModalOpen = false;

function requestHasToken(responseOrError) {
  return Boolean(responseOrError?.config?.headers?.Authorization || getToken());
}

function isTokenExpired(responseOrError) {
  const response = responseOrError?.response || responseOrError;
  return (
    Number(response?.status) === 401 || Number(response?.data?.status) === 401
  );
}

function isSignInPage() {
  return window.location.pathname.includes("/sign-in");
}

function redirectToSignIn() {
  const signInUrl = window.location.origin + "/sign-in";
  window.open(signInUrl, "_self");
}

/**
 * Tampilkan modal token expired seperti di seleris-credit-cover.
 * Flag global mencegah beberapa request paralel membuka modal bertumpuk.
 */
function showTokenExpiredModal() {
  clearSession();

  if (isTokenExpiredModalOpen) return;
  isTokenExpiredModalOpen = true;

  if (!window.Swal?.fire) {
    redirectToSignIn();
    return;
  }

  window.Swal.fire({
    icon: "error",
    title: "Token Expired",
    text: "Your session has expired. Please login again.",
    padding: "2em",
  }).then(redirectToSignIn, redirectToSignIn);
}

function shouldHandleTokenExpired(responseOrError) {
  return (
    isTokenExpired(responseOrError) &&
    requestHasToken(responseOrError) &&
    !isSignInPage()
  );
}

// Request yang memicu token-expired sengaja ditahan sampai halaman berpindah.
// Dengan begitu catch lokal tidak menimpa modal ini dengan modal error generik.
function waitForSignInRedirect() {
  return new Promise(() => {});
}

// Interceptor REQUEST: tempelkan token ke setiap request sebelum dikirim.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor RESPONSE: kalau server balas 401 (token kedaluwarsa/tidak valid),
// bersihkan sesi lalu paksa kembali ke halaman login. Ini pertahanan keamanan
// supaya sesi mati tidak bisa terus dipakai.
api.interceptors.response.use(
  (response) => {
    if (shouldHandleTokenExpired(response)) {
      showTokenExpiredModal();
      return waitForSignInRedirect();
    }
    return response;
  },
  (error) => {
    if (shouldHandleTokenExpired(error)) {
      showTokenExpiredModal();
      return waitForSignInRedirect();
    }
    return Promise.reject(error);
  },
);

export default api;
