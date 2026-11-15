<script lang="ts">
	import { Film, Search, FolderKanban, Settings, Plus, X } from 'lucide-svelte';

	interface Props {
		searchQuery: string;
		activeFolderCount: number;
		totalFolders: number;
		onSearchChange: (query: string) => void;
		onOpenFolders: () => void;
		onOpenScan: () => void;
		onOpenSettings: () => void;
	}

	let {
		searchQuery,
		activeFolderCount,
		totalFolders,
		onSearchChange,
		onOpenFolders,
		onOpenScan,
		onOpenSettings
	}: Props = $props();

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onSearchChange(target.value);
	}

	function handleClear() {
		onSearchChange('');
	}
</script>

<header class="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
	<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
		<!-- Brand Logo -->
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
			>
				<Film class="h-5 w-5" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<span class="text-xl font-bold tracking-tight text-white">MovieCat</span>
					<span class="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs font-semibold text-indigo-400"
						>Local</span
					>
				</div>
				<p class="hidden text-xs text-slate-400 sm:block">Hard Disk Cinema Explorer</p>
			</div>
		</div>

		<!-- Search Bar -->
		<div class="relative max-w-md flex-1">
			<div
				class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"
			>
				<Search class="h-4 w-4" />
			</div>
			<input
				type="text"
				placeholder="Search titles, directors, plots..."
				value={searchQuery}
				oninput={handleInput}
				class="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2 pr-9 pl-9 text-sm text-slate-100 placeholder-slate-500 transition focus:border-indigo-500 focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
			/>
			{#if searchQuery}
				<button
					type="button"
					onclick={handleClear}
					class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white"
					title="Clear search"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2 sm:gap-3">
			<!-- Libraries / Sources Manager -->
			<button
				type="button"
				onclick={onOpenFolders}
				class="relative flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 sm:text-sm"
				title="Manage Hard Disk Folders"
			>
				<FolderKanban class="h-4 w-4 text-indigo-400" />
				<span class="hidden md:inline">Folders</span>
				{#if totalFolders > 0}
					<span
						class="flex h-5 items-center justify-center rounded-full bg-slate-800 px-1.5 text-xs font-semibold text-indigo-400"
					>
						{activeFolderCount}/{totalFolders}
					</span>
				{/if}
			</button>

			<!-- Settings -->
			<button
				type="button"
				onclick={onOpenSettings}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
				title="Settings"
			>
				<Settings class="h-4 w-4" />
			</button>

			<!-- Add & Scan Button -->
			<button
				type="button"
				onclick={onOpenScan}
				class="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:brightness-110 active:scale-95 sm:text-sm"
			>
				<Plus class="h-4 w-4" />
				<span>Scan Folder</span>
			</button>
		</div>
	</div>
</header>
