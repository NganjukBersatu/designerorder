<template>
  <div class="w-full space-y-6">
    <!-- Kategori pengaturan -->
    <div>
      <div
        class="inline-flex p-1 rounded-xl bg-cream-100 border border-ink-100"
        role="tablist"
        aria-label="Kategori pengaturan"
      >
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          role="tab"
          :id="`tab-${tab.key}`"
          :aria-selected="activeTab === tab.key"
          :aria-controls="`panel-${tab.key}`"
          @click="activeTab = tab.key"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition',
            activeTab === tab.key
              ? 'bg-white text-ink-900 shadow-sm'
              : 'text-ink-500 hover:text-ink-800'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
      <p class="text-[13px] text-ink-500 mt-2.5">{{ activeTabInfo }}</p>
    </div>

    <!-- ==================== KATEGORI: PILIHAN DROPDOWN (Order & Produk) ==================== -->
    <div
      v-show="activeTab === 'dropdown-produk'"
      :id="`panel-${activeTab}`"
      role="tabpanel"
      :aria-labelledby="`tab-${activeTab}`"
      class="fx-grid fx-cap [--fx-min:22rem] [--fx-cap:36rem] gap-5"
    >
      <!-- Salin pengaturan dari tim lain (owner/admin saja) -->
      <section v-if="canCopy" class="fx-full bg-white rounded-card shadow-card border border-ink-100 p-5 space-y-3">
        <div>
          <h3 class="text-[15px] font-semibold text-ink-900">Salin pengaturan dari tim lain</h3>
          <p class="text-[13px] text-ink-500">Cocok untuk tim baru. Pilihan dropdown digabung (yang sudah ada tidak hilang), kurs dan mata uang tampilan ditimpa. Nama aplikasi, produk, dan order tidak ikut.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <select v-model="copyFrom" aria-label="Tim sumber" class="px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-sm outline-none focus:border-brand-400 min-w-[12rem]">
            <option value="">Pilih tim sumber</option>
            <option v-for="t in copyTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <label class="inline-flex items-center gap-2 text-sm text-ink-700"><input v-model="copyOptions" type="checkbox" class="w-4 h-4 accent-brand-500" /> Pilihan dropdown</label>
          <label class="inline-flex items-center gap-2 text-sm text-ink-700"><input v-model="copyCurrency" type="checkbox" class="w-4 h-4 accent-brand-500" /> Mata uang &amp; kurs</label>
          <button type="button" :disabled="!copyFrom || copying || (!copyOptions && !copyCurrency)" class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition disabled:opacity-50" @click="submitCopy">
            {{ copying ? 'Menyalin…' : 'Salin ke tim ini' }}
          </button>
        </div>
        <p v-if="copyMsg.text" :class="['text-sm', copyMsg.ok ? 'text-ok-700' : 'text-danger-600']">{{ copyMsg.text }}</p>
      </section>

      <section
        v-for="group in currentGroups"
        :key="group.id"
        :class="[
          'relative flex flex-col bg-white rounded-card shadow-card border border-ink-100 overflow-hidden',
          ''
        ]"
      >
        <span class="absolute left-0 top-0 bottom-0 w-1" :class="TONES[group.id]"></span>

        <div class="pl-6 pr-5 pt-4 pb-3 border-b border-ink-100">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-ink-900">{{ group.label }}</h2>
            <span class="text-xs text-ink-400 tabular-nums">{{ optionsOf(group.key).length }} pilihan</span>
          </div>
          <p class="text-[13px] text-ink-500 mt-0.5">{{ group.description }}</p>
          <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span class="text-xs text-ink-400">Dipakai di</span>
            <span
              v-for="use in group.usedIn"
              :key="use"
              class="inline-flex items-center px-2 py-0.5 rounded-full bg-cream-100 text-ink-600 text-[11px] font-medium"
            >
              {{ use }}
            </span>
          </div>
        </div>

        <div class="flex-1 pl-6 pr-5 py-4">
          <div class="flex flex-wrap gap-2 mb-3">
            <span
              v-for="opt in optionsOf(group.key)"
              :key="opt"
              class="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-cream-100 text-ink-700 text-sm"
            >
              {{ opt }}
              <button
                type="button"
                @click="removeOption(group.key, opt)"
                class="p-0.5 rounded-full hover:bg-ink-100 text-ink-500 transition"
                :aria-label="`Hapus ${opt}`"
                :title="`Hapus ${opt}`"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            <span v-if="!optionsOf(group.key).length" class="text-sm text-ink-400">Belum ada pilihan.</span>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="newOption[group.id]"
              type="text"
              @keydown.enter.prevent="submitOption(group)"
              class="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              :placeholder="`Tambah ${group.label.toLowerCase()} baru`"
            />
            <button
              type="button"
              @click="submitOption(group)"
              class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
            >
              Tambah
            </button>
          </div>

          <p
            v-if="optionMsg.id === group.id && optionMsg.text"
            :class="['text-xs mt-2', optionMsg.ok ? 'text-ok-700' : 'text-danger-600']"
            role="status"
          >
            {{ optionMsg.text }}
          </p>
        </div>

        <div class="flex items-center justify-between gap-3 pl-6 pr-5 py-3 border-t border-ink-100 bg-cream-50 text-xs">
          <button
            v-if="group.scope === 'produk'"
            type="button"
            @click="importFromProducts(group)"
            class="font-medium text-brand-600 hover:underline"
          >
            Ambil dari produk
          </button>
          <span v-else></span>
          <button
            type="button"
            @click="resetGroup(group)"
            class="text-ink-500 hover:text-ink-800 transition"
          >
            Kosongkan
          </button>
        </div>
      </section>
    </div>

    <!-- ==================== KATEGORI: AKUN / PROFIL ==================== -->
    <div
      v-show="activeTab === 'akun'"
      id="panel-akun"
      role="tabpanel"
      aria-labelledby="tab-akun"
      class="fx-grid [--fx-min:26rem] gap-6 items-start"
    >
      <!-- Kartu profil -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></span>

        <div class="pl-6 pr-5 py-5">
          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div class="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-xl font-bold shadow-sm shrink-0 overflow-hidden">
              <img v-if="profile.photo" :src="profile.photo" alt="Foto profil" class="w-full h-full object-cover" />
              <span v-else>{{ userInitials }}</span>
            </div>

            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-ink-900 truncate">{{ displayNameOrUsername || '—' }}</h2>
              <p class="text-sm text-ink-500 mt-0.5">
                {{ roleLabel(role) }}
                <span v-if="teamName"> · Tim {{ teamName }}</span>
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full bg-cream-100 text-ink-600 text-[11px] font-medium">
                  {{ roleLabel(role) }}
                </span>
                <span v-if="teamName" class="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium">
                  {{ teamName }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="pl-6 pr-5 pt-4 pb-5 border-t border-ink-100 space-y-4">
          <div
            v-if="profileMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              profileMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ profileMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Foto Profil</label>
            <div class="flex flex-wrap items-center gap-2">
              <label class="inline-flex items-center px-3.5 py-2 rounded-xl border border-ink-200 text-ink-700 hover:bg-ink-50 text-sm font-medium transition cursor-pointer">
                {{ profile.photo ? 'Ganti Foto' : 'Unggah Foto' }}
                <input type="file" accept="image/*" class="hidden" @change="onPickProfilePhoto" />
              </label>
              <button
                v-if="profile.photo"
                type="button"
                @click="removeProfilePhoto"
                class="px-3.5 py-2 rounded-xl text-danger-600 hover:bg-danger-50 text-sm font-medium transition"
              >
                Hapus Foto
              </button>
            </div>
            <p class="text-xs text-ink-400 mt-1.5">JPG, PNG, atau WEBP. Hanya tersimpan di browser ini.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Tampilan</label>
            <input
              v-model="displayNameForm"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              :placeholder="user"
            />
            <p class="text-xs text-ink-400 mt-1.5">Tampil di header & dropdown profil. Username login tetap {{ user }}.</p>
          </div>
        </div>

        <div class="flex justify-end pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="submitProfile"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
          >
            Simpan Profil
          </button>
        </div>
      </section>

      <!-- Nama Aplikasi -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-gold-500"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Nama Aplikasi</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Nama dan tagline yang tampil di sidebar serta judul tab browser.
          </p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-4">
          <div
            v-if="appSettingsMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              appSettingsMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ appSettingsMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Nama Aplikasi</label>
            <input
              v-model="appSettingsForm.appName"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="mis. Designer Orders"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Tagline</label>
            <input
              v-model="appSettingsForm.appTagline"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="mis. Ruang kerja produksi"
            />
            <p class="text-xs text-ink-400 mt-1.5">Tampil di bawah nama aplikasi, di sidebar.</p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="resetAppName"
            class="text-xs text-ink-500 hover:text-ink-800 transition"
          >
            Reset ke bawaan
          </button>
          <button
            type="button"
            @click="submitAppSettings"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm"
          >
            Simpan Nama Aplikasi
          </button>
        </div>
      </section>

      <!-- Username -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-brand-400"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Username</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Username yang dipakai untuk masuk. Saat ini:
            <span class="font-medium text-ink-700">{{ user }}</span>
          </p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-4">
          <div
            v-if="usernameMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              usernameMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ usernameMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Username baru</label>
            <input
              v-model="usernameForm.username"
              type="text"
              autocomplete="username"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="Minimal 3 karakter"
            />
            <p class="text-xs text-ink-400 mt-1.5">Huruf, angka, titik, garis bawah, dan strip.</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Kata sandi saat ini</label>
            <PasswordInput
              v-model="usernameForm.password"
              autocomplete="current-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="Untuk konfirmasi perubahan"
            />
          </div>
        </div>

        <div class="flex justify-end pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="submitUsername"
            :disabled="usernameLoading"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition shadow-sm"
          >
            {{ usernameLoading ? 'Menyimpan...' : 'Simpan Username' }}
          </button>
        </div>
      </section>

      <!-- Kata sandi -->
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-warn-400"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">Kata sandi</h2>
          <p class="text-[13px] text-ink-500 mt-0.5">Ganti kata sandi yang dipakai untuk masuk.</p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-4">
          <div
            v-if="passwordMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              passwordMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ passwordMsg.text }}
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Kata sandi saat ini</label>
            <PasswordInput
              v-model="passwordForm.current"
              autocomplete="current-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Kata sandi baru</label>
            <PasswordInput
              v-model="passwordForm.next"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
              placeholder="Minimal 8 karakter"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Ulangi kata sandi baru</label>
            <PasswordInput
              v-model="passwordForm.confirm"
              autocomplete="new-password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition"
            />
          </div>
        </div>

        <div class="flex justify-end pl-6 pr-5 py-4 border-t border-ink-100 bg-cream-50">
          <button
            type="button"
            @click="submitPassword"
            :disabled="passwordLoading"
            class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition shadow-sm"
          >
            {{ passwordLoading ? 'Menyimpan...' : 'Ubah Kata Sandi' }}
          </button>
        </div>
      </section>
    </div>

    <!-- ==================== KATEGORI: MATA UANG ==================== -->
    <div
      v-show="activeTab === 'mata-uang'"
      id="panel-mata-uang"
      role="tabpanel"
      aria-labelledby="tab-mata-uang"
      class="space-y-4"
    >
      <section class="bg-white rounded-card shadow-card border border-ink-100 p-5 space-y-5 max-w-2xl">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Mata uang tampilan Ringkasan</label>
          <select
            v-model="currencyDraft.displayCurrency"
            class="w-full sm:w-56 px-3 py-2.5 rounded-xl border border-ink-200 bg-white text-sm outline-none focus:border-brand-400"
          >
            <option v-for="c in currencies" :key="c" :value="c">{{ c }}</option>
          </select>
          <p class="text-xs text-ink-400 mt-1">Semua total di Ringkasan dan daftar Kategori dikonversi ke mata uang ini.</p>
        </div>

        <div>
          <p class="text-sm font-medium text-ink-700 mb-1.5">Kurs terhadap 1 USD</p>
          <div class="fx-grid [--fx-min:14rem] gap-3">
            <label v-for="c in otherCurrencies" :key="c" class="flex items-center gap-2 text-sm text-ink-600">
              <span class="w-16 shrink-0">1 USD =</span>
              <input
                v-model="currencyDraft.rates[c]"
                type="number"
                min="0"
                step="any"
                :aria-label="`Kurs ${c}`"
                placeholder="belum diisi"
                class="w-full min-w-0 px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm outline-none focus:border-brand-400"
              />
              <span class="w-10 shrink-0 font-medium text-ink-800">{{ c }}</span>
            </label>
          </div>
          <p class="text-xs text-ink-400 mt-2">Kurs yang kosong berarti nilai mata uang itu belum ikut dihitung di Ringkasan.</p>
        </div>

        <p v-if="currencyError" class="text-sm text-danger-600">{{ currencyError }}</p>
        <p v-if="currencyMsg" class="text-sm text-ok-700">{{ currencyMsg }}</p>
        <button
          type="button"
          :disabled="currencySaving"
          class="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition shadow-sm disabled:opacity-60"
          @click="submitCurrency"
        >
          {{ currencySaving ? 'Menyimpan…' : 'Simpan' }}
        </button>
      </section>
    </div>

    <!-- ==================== KATEGORI: ANGGOTA TIM ==================== -->
    <div
      v-show="activeTab === 'tim'"
      id="panel-tim"
      role="tabpanel"
      aria-labelledby="tab-tim"
      class="fx-grid [--fx-min:26rem] gap-6 items-start"
    >
      <section class="relative bg-white rounded-card shadow-card border border-ink-100 overflow-hidden">
        <span class="absolute left-0 top-0 bottom-0 w-1 bg-[#14A38B]"></span>

        <div class="pl-6 pr-5 py-4 border-b border-ink-100">
          <h2 class="text-base font-semibold text-ink-900">
            Tim {{ teamName }}
          </h2>
          <p class="text-[13px] text-ink-500 mt-0.5">
            Semua anggota di sini berbagi produk & pesanan yang sama, apa pun rolenya.
            <span v-if="role === 'member'">Hanya owner/admin yang bisa menambah/menghapus anggota.</span>
            <router-link v-else to="/tim" class="text-brand-600 hover:underline">Kelola semua tim dan akun →</router-link>
          </p>
        </div>

        <div class="pl-6 pr-5 py-5 space-y-3">
          <div
            v-if="membersMsg.text"
            :class="[
              'px-3 py-2.5 rounded-xl text-sm',
              membersMsg.ok ? 'bg-ok-100 text-ok-700' : 'bg-danger-50 text-danger-600'
            ]"
            role="alert"
          >
            {{ membersMsg.text }}
          </div>

          <div
            v-for="m in members"
            :key="m.id"
            class="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-cream-50 hover:bg-cream-100 transition cursor-pointer"
            @click="router.push(`/anggota/${m.id}`)"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-ink-800 truncate">
                {{ m.username }}
                <span v-if="m.username === user" class="text-ink-400 font-normal">(kamu)</span>
              </p>
              <p class="text-[12px] text-ink-500">{{ roleLabel(m.role) }}</p>
            </div>
            <button
              v-if="m.username !== user && canManage(m.role)"
              type="button"
              @click.stop="removeMember(m)"
              class="p-2 rounded-lg hover:bg-danger-50 text-danger-600 transition shrink-0"
              title="Hapus anggota"
              aria-label="Hapus anggota"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <p v-if="!members.length" class="text-sm text-ink-400">Belum ada anggota.</p>
        </div>

        <div v-if="role === 'owner' || role === 'admin'" class="pl-6 pr-5 py-5 border-t border-ink-100 bg-cream-50 space-y-3">
          <h3 class="text-sm font-semibold text-ink-800">Tambah anggota</h3>
          <div class="fx-grid [--fx-min:12rem] gap-3">
            <input
              v-model="newMember.username"
              type="text"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition bg-white"
              placeholder="Username"
            />
            <PasswordInput
              v-model="newMember.password"
              class="w-full px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition bg-white"
              placeholder="Kata sandi (min. 8 karakter)"
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <select
              v-if="role === 'owner' || role === 'admin'"
              v-model="newMember.role"
              class="px-3 py-2.5 rounded-xl border border-ink-200 focus:border-brand-400 outline-none text-sm transition bg-white"
            >
              <option value="member">Biasa</option>
              <option value="admin">Admin</option>
              <option v-if="role === 'owner'" value="owner">Owner</option>
            </select>
            <button
              type="button"
              @click="addMember"
              :disabled="addMemberLoading"
              class="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm"
            >
              {{ addMemberLoading ? 'Menambahkan...' : 'Tambah Anggota' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useOptions, OPTION_GROUPS, fetchOptions } from '../composables/useOptions'
import { useProducts } from '../composables/useProducts'
import { useAppSettings } from '../composables/useAppSettings'
import { useProfile } from '../composables/useProfile'
import { splitPlatforms } from '../utils/platforms'
import { api } from '../utils/api.js'
import PasswordInput from '../components/PasswordInput.vue'
import { useCurrency, fetchCurrency } from '../composables/useCurrency'

const route = useRoute()
const router = useRouter()
const { user, role, teamName, changeUsername, changePassword } = useAuth()

// ========== KATEGORI PENGATURAN ==========
const TABS = [
  {
    key: 'dropdown-produk',
    label: 'Pilihan Dropdown',
    info: 'Atur pilihan yang muncul di form order, form produk, filter list, dan Catat Penjualan.'
  },
  {
    key: 'mata-uang',
    label: 'Mata Uang',
    info: 'Atur mata uang tampilan Ringkasan dan kurs terhadap USD. Harga tiap produk tetap memakai mata uangnya sendiri.'
  },
  {
    key: 'akun',
    label: 'Akun',
    info: 'Profil akun, nama aplikasi, username, dan kata sandi untuk masuk ke dashboard.'
  },
  {
    key: 'tim',
    label: 'Anggota Tim',
    info: 'Kelola siapa saja yang bisa akses produk & pesanan tim ini.'
  }
]

const activeTab = ref('dropdown-produk')
const activeTabInfo = computed(() => TABS.find(t => t.key === activeTab.value)?.info || '')

// Buka tab dari query ?tab=akun (dari dropdown profil di header)
watch(
  () => route.query.tab,
  (tab) => {
    if (typeof tab === 'string' && TABS.some(t => t.key === tab)) {
      activeTab.value = tab
    }
  },
  { immediate: true }
)

// Sync tab ke URL biar bisa di-bookmark / dibuka dari header
watch(activeTab, (tab) => {
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab } })
  }
})

// ========== PROFIL (foto + nama tampilan) ==========
const { profile, displayNameOrUsername, updateDisplayName, updatePhoto, removePhoto } = useProfile()

// Inisial untuk avatar (dari nama tampilan kalau ada, kalau tidak dari username)
const userInitials = computed(() => {
  const name = (displayNameOrUsername.value || '').trim()
  if (!name) return 'AK'
  const parts = name.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const displayNameForm = ref(profile.value.displayName)
const profileMsg = ref({ ok: false, text: '' })

watch(
  () => profile.value.displayName,
  (val) => {
    displayNameForm.value = val
  }
)

async function onPickProfilePhoto(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  profileMsg.value = await updatePhoto(file)
}

async function removeProfilePhoto() {
  profileMsg.value = await removePhoto()
}

async function submitProfile() {
  profileMsg.value = await updateDisplayName(displayNameForm.value)
}

const TONES = {
  kategori: 'bg-[#8B5CF6]',
  style: 'bg-[#8B5CF6]',
  substyle: 'bg-[#3B82F6]',
  productionStatus: 'bg-[#E0A21B]',
  platform: 'bg-[#F0782B]'
}

// ========== PILIHAN DROPDOWN ==========
const { optionsOf, addOption, removeOption, resetOptions } = useOptions()

// ========== SALIN PENGATURAN DARI TIM LAIN ==========
const canCopy = computed(() => role.value === 'owner' || role.value === 'admin')
const copyTeams = ref([])
const copyFrom = ref('')
const copyOptions = ref(true)
const copyCurrency = ref(true)
const copying = ref(false)
const copyMsg = ref({ ok: false, text: '' })

onMounted(async () => {
  if (!canCopy.value) return
  try {
    copyTeams.value = ((await api.get('/admin/teams')).data || []).filter((t) => !t.current)
  } catch {
    copyTeams.value = []
  }
})

async function submitCopy() {
  const team = copyTeams.value.find((t) => t.id === copyFrom.value)
  if (!team) return
  if (!confirm(`Salin pengaturan dari "${team.name}" ke tim ini?${copyCurrency.value ? ' Kurs dan mata uang tampilan tim ini akan ditimpa.' : ''}`)) return
  copying.value = true
  copyMsg.value = { ok: false, text: '' }
  try {
    await api.post('/admin/copy-settings', { fromTeamId: copyFrom.value, options: copyOptions.value, currency: copyCurrency.value })
    await Promise.all([fetchOptions(), fetchCurrency()])
    copyMsg.value = { ok: true, text: `Pengaturan dari "${team.name}" berhasil disalin` }
  } catch (err) {
    copyMsg.value = { ok: false, text: err.message }
  } finally {
    copying.value = false
  }
}

// ========== MATA UANG & KURS ==========
const { currencies, displayCurrency, rates, saveCurrency } = useCurrency()
const currencyDraft = ref({ displayCurrency: 'USD', rates: {} })
const currencySaving = ref(false)
const currencyMsg = ref('')
const currencyError = ref('')
const otherCurrencies = computed(() => currencies.value.filter((c) => c !== 'USD'))

// Isi formulir dari data server (juga saat data baru selesai dimuat)
watch(
  [displayCurrency, rates],
  () => {
    currencyDraft.value = {
      displayCurrency: displayCurrency.value,
      rates: Object.fromEntries(otherCurrencies.value.map((c) => [c, rates.value[c] ?? ''])),
    }
  },
  { immediate: true, deep: true }
)

async function submitCurrency() {
  currencyMsg.value = ''
  currencyError.value = ''
  const payloadRates = {}
  for (const [code, value] of Object.entries(currencyDraft.value.rates)) {
    if (value === '' || value === null) continue // kosong = belum diisi
    if (!(Number(value) > 0)) {
      currencyError.value = `Kurs ${code} harus angka lebih dari 0`
      return
    }
    payloadRates[code] = Number(value)
  }
  currencySaving.value = true
  try {
    await saveCurrency({ displayCurrency: currencyDraft.value.displayCurrency, rates: payloadRates })
    currencyMsg.value = 'Pengaturan mata uang tersimpan'
  } catch (err) {
    currencyError.value = err.message
  } finally {
    currencySaving.value = false
  }
}
const { products } = useProducts()

const currentGroups = computed(() => OPTION_GROUPS)

const newOption = ref(Object.fromEntries(OPTION_GROUPS.map(g => [g.id, ''])))
const optionMsg = ref({ id: '', ok: false, text: '' })

function submitOption(group) {
  const result = addOption(group.key, newOption.value[group.id])
  optionMsg.value = { id: group.id, ok: result.ok, text: result.message }
  if (result.ok) newOption.value[group.id] = ''
}

function importFromProducts(group) {
  const key = group.key
  const found = []
  for (const p of products.value) {
    const values = key === 'platform' ? splitPlatforms(p.platform) : [p[key]]
    for (const v of values) {
      if (v && String(v).trim()) found.push(String(v).trim())
    }
  }

  let added = 0
  for (const v of found) {
    if (addOption(key, v).ok) added++
  }

  optionMsg.value = {
    id: group.id,
    ok: true,
    text: added
      ? `${added} pilihan ditambahkan dari data produk`
      : 'Tidak ada pilihan baru di data produk'
  }
}

function resetGroup(group) {
  if (!confirm(`Kosongkan semua pilihan ${group.label}?`)) return
  resetOptions(group.key)
  optionMsg.value = { id: group.id, ok: true, text: 'Pilihan dikosongkan' }
}

// ========== NAMA APLIKASI ==========
const { settings, updateAppSettings, resetAppSettings } = useAppSettings()

const appSettingsForm = ref({
  appName: settings.value.appName,
  appTagline: settings.value.appTagline
})
const appSettingsMsg = ref({ ok: false, text: '' })
// Isi ulang form begitu data tim selesai dimuat dari server
watch(settings, (s) => { appSettingsForm.value = { appName: s.appName, appTagline: s.appTagline } }, { deep: true })

async function submitAppSettings() {
  const result = await updateAppSettings(appSettingsForm.value)
  appSettingsMsg.value = result
  if (result.ok) {
    appSettingsForm.value = {
      appName: settings.value.appName,
      appTagline: settings.value.appTagline
    }
  }
}

async function resetAppName() {
  if (!confirm('Kembalikan nama & tagline aplikasi ke bawaan?')) return
  const result = await resetAppSettings()
  appSettingsForm.value = {
    appName: settings.value.appName,
    appTagline: settings.value.appTagline
  }
  appSettingsMsg.value = result
}

// ========== USERNAME ==========
const usernameForm = ref({ username: '', password: '' })
const usernameMsg = ref({ ok: false, text: '' })
const usernameLoading = ref(false)

onMounted(() => {
  usernameForm.value.username = user.value || ''
})

async function submitUsername() {
  usernameMsg.value = { ok: false, text: '' }

  if (usernameForm.value.username.trim() === user.value) {
    usernameMsg.value = { ok: false, text: 'Username belum berubah' }
    return
  }
  if (!usernameForm.value.password) {
    usernameMsg.value = { ok: false, text: 'Isi kata sandi saat ini untuk konfirmasi' }
    return
  }

  usernameLoading.value = true
  const result = await changeUsername(usernameForm.value.username, usernameForm.value.password)
  usernameLoading.value = false

  usernameMsg.value = { ok: result.ok, text: result.message }
  if (result.ok) {
    usernameForm.value = { username: user.value, password: '' }
  }
}

// ========== KATA SANDI ==========
const passwordForm = ref({ current: '', next: '', confirm: '' })
const passwordMsg = ref({ ok: false, text: '' })
const passwordLoading = ref(false)

async function submitPassword() {
  passwordMsg.value = { ok: false, text: '' }

  if (!passwordForm.value.current) {
    passwordMsg.value = { ok: false, text: 'Isi kata sandi saat ini' }
    return
  }
  if (passwordForm.value.next !== passwordForm.value.confirm) {
    passwordMsg.value = { ok: false, text: 'Konfirmasi kata sandi baru tidak cocok' }
    return
  }

  passwordLoading.value = true
  const result = await changePassword(passwordForm.value.current, passwordForm.value.next)
  passwordLoading.value = false

  passwordMsg.value = { ok: result.ok, text: result.message }
  if (result.ok) {
    passwordForm.value = { current: '', next: '', confirm: '' }
  }
}

// ========== ANGGOTA TIM ==========
const members = ref([])
const membersMsg = ref({ ok: false, text: '' })
const newMember = ref({ username: '', password: '', role: 'member' })
const addMemberLoading = ref(false)

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Biasa' }
function roleLabel(r) {
  return ROLE_LABELS[r] || r || '—'
}

// Owner dan admin setara: boleh mengelola siapa saja di timnya
function canManage(targetRole) {
  if (targetRole === 'owner' && role.value !== 'owner') return false // akun Owner hanya disentuh Owner
  return role.value === 'owner' || role.value === 'admin'
}

async function loadMembers() {
  try {
    const res = await api.get('/team/members')
    members.value = res.data
  } catch (err) {
    membersMsg.value = { ok: false, text: err.message }
  }
}

async function addMember() {
  membersMsg.value = { ok: false, text: '' }
  if (!newMember.value.username.trim() || !newMember.value.password) {
    membersMsg.value = { ok: false, text: 'Isi username dan kata sandi' }
    return
  }

  addMemberLoading.value = true
  try {
    await api.post('/team/members', {
      username: newMember.value.username.trim(),
      password: newMember.value.password,
      role: newMember.value.role,
    })
    newMember.value = { username: '', password: '', role: 'member' }
    membersMsg.value = { ok: true, text: 'Anggota berhasil ditambahkan' }
    await loadMembers()
  } catch (err) {
    membersMsg.value = { ok: false, text: err.message }
  } finally {
    addMemberLoading.value = false
  }
}

async function removeMember(member) {
  if (!confirm(`Hapus anggota "${member.username}" dari tim?`)) return
  try {
    await api.delete(`/team/members/${member.id}`)
    await loadMembers()
  } catch (err) {
    membersMsg.value = { ok: false, text: err.message }
  }
}

onMounted(loadMembers)
</script>