<script lang="ts">
	import {
		Folder,
		FolderOpen,
		HardDrive,
		ChevronRight,
		ArrowUp,
		Search,
		X,
		Check,
		Loader2,
		AlertCircle
	} from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		initialPath?: string;
		onClose: () => void;
		onSelect: (selectedPath: string) => void;
	}

	let { isOpen, initialPath = '', onClose, onSelect }: Props = $props();

	let currentPath = $state('');
	let parentPath = $state<string | null>(null);
	let drives = $state<string[]>([]);
	let folders = $state<Array<{ name: string; path: string }>>([]);
	let searchQuery = $state('');
	let isLoading = $state(false);
	let isOpeningNative = $state(false);
	let errorMessage = $state('');
	let selectedFolder = $state('');

	// Load directory contents
	async function loadDirectory(targetPath?: string) {
		isLoading = true;
		errorMessage = '';
		try {
			const query = targetPath ? `?path=${encodeURIComponent(targetPath)}` : '';
			const res = await fetch(`/api/system/browse-folder${query}`);
			const data = await res.json();

			if (data.success) {
				currentPath = data.currentPath;
				parentPath = data.parentPath;
				drives = data.drives || [];
				folders = data.folders || [];
				selectedFolder = data.currentPath;
			} else {
				errorMessage = data.error || 'Failed to open directory';
				if (data.drives) drives = data.drives;
				if (data.parentPath) parentPath = data.parentPath;
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Error accessing folder';
		} finally {
			isLoading = false;
		}
	}

	// Trigger native Windows Explorer dialog
	async function handleOpenNative() {
		isOpeningNative = true;
		errorMessage = '';
		try {
			const res = await fetch('/api/system/browse-folder', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ native: true })
			});
			const data = await res.json();
			if (data.success && data.path) {
				onSelect(data.path);
				onClose();
			} else if (data.error) {
				errorMessage = data.error;
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Failed to launch Windows picker';
		} finally {
			isOpeningNative = false;
		}
	}

	// Navigate to parent directory
	function handleGoUp() {
		if (parentPath) {
			loadDirectory(parentPath);
		}
	}

	// Click on a folder
	function handleFolderClick(folderPath: string) {
		selectedFolder = folderPath;
	}

	// Double click or enter a folder
	function handleFolderEnter(folderPath: string) {
		searchQuery = '';
		loadDirectory(folderPath);
	}

	// Confirm selection
	function handleConfirm() {
		if (selectedFolder) {
			onSelect(selectedFolder);
			onClose();
		}
	}

	// Reset and load on open
	$effect(() => {
		if (isOpen) {
			searchQuery = '';
			loadDirectory(initialPath || undefined);
		}
	});

	// Filter folders by search query
	let filteredFolders = $derived.by(() => {
		if (!searchQuery.trim()) return folders;
		const q = searchQuery.toLowerCase().trim();
		return folders.filter((f) => f.name.toLowerCase().includes(q));
	});

	// Path segments for breadcrumbs
	let breadcrumbSegments = $derived.by(() => {
		if (!currentPath) return [];
		const normalized = currentPath.replace(/[\\/]+$/, '');
		const parts = normalized.split(/[\\/]/);
		let accumulated = '';
		return parts.map((part, index) => {
			if (index === 0) {
				accumulated = part.endsWith(':') ? `${part}\\` : part;
			} else {
				accumulated = `${accumulated.replace(/\\$/, '')}\\${part}`;
			}
			return {
				name: part,
				path: accumulated
			};
		});
	});
</script>

{#if isOpen}
	<div class="fixed inset-0 z-60 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div
			role="button"
			tabindex="0"
			onclick={onClose}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
			class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
		></div>

		<!-- Dialog Modal Container -->
		<div
			class="relative z-10 flex h-160 max-h-screen w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-800 px-6 py-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
					>
						<FolderOpen class="h-5 w-5" />
					</div>
					<div>
						<h2 class="text-base font-bold text-white sm:text-lg">Select Folder</h2>
						<p class="text-xs text-slate-400">
							Choose your movie library directory from your hard drive
						</p>
					</div>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Drive Buttons Toolbar -->
			{#if drives.length > 0}
				<div
					class="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/80 bg-slate-950/40 px-6 py-2.5"
				>
					<span class="mr-1 text-xs font-semibold text-slate-400">Drives:</span>
					{#each drives as drive (drive)}
						<button
							type="button"
							onclick={() => loadDirectory(drive)}
							class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition {currentPath
								.toUpperCase()
								.startsWith(drive.toUpperCase())
								? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
								: 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200'}"
						>
							<HardDrive class="h-3.5 w-3.5" />
							<span>{drive}</span>
						</button>
					{/each}
				</div>
			{/if}

			<!-- Breadcrumbs and Up Navigation -->
			<div class="flex items-center gap-2 border-b border-slate-800 px-6 py-2.5">
				<button
					type="button"
					onclick={handleGoUp}
					disabled={!parentPath || isLoading}
					class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:border-slate-700 hover:text-white disabled:opacity-40"
					title="Go up one folder"
				>
					<ArrowUp class="h-4 w-4" />
				</button>

				<!-- Breadcrumb trail -->
				<div
					class="flex flex-1 items-center gap-1 overflow-x-auto font-mono text-xs text-slate-300"
				>
					{#each breadcrumbSegments as segment (segment.path)}
						<button
							type="button"
							onclick={() => loadDirectory(segment.path)}
							class="rounded px-1.5 py-0.5 transition hover:bg-slate-800 hover:text-indigo-300 {segment.path ===
							currentPath
								? 'font-bold text-white'
								: 'text-slate-400'}"
						>
							{segment.name}
						</button>
						<span class="text-slate-600">/</span>
					{/each}
				</div>
			</div>

			<!-- Search filter within directory -->
			<div class="border-b border-slate-800 px-6 py-2">
				<div class="relative">
					<Search class="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-500" />
					<input
						type="text"
						placeholder="Filter folders in this directory..."
						bind:value={searchQuery}
						class="w-full rounded-xl border border-slate-800 bg-slate-950 py-1.5 pr-3 pl-8 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
					/>
				</div>
			</div>

			<!-- Folder Listing Area -->
			<div class="flex-1 overflow-y-auto px-6 py-3">
				{#if isLoading}
					<div class="flex h-48 flex-col items-center justify-center gap-2 text-slate-400">
						<Loader2 class="h-6 w-6 animate-spin text-indigo-400" />
						<span class="text-xs">Reading directories...</span>
					</div>
				{:else if errorMessage}
					<div
						class="my-4 flex items-center gap-2 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300"
					>
						<AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
						<div class="flex-1">
							<p class="font-medium">{errorMessage}</p>
							{#if parentPath}
								<button
									type="button"
									onclick={handleGoUp}
									class="mt-1 text-xs text-indigo-400 underline hover:text-indigo-300"
								>
									Click here to return to parent folder
								</button>
							{/if}
						</div>
					</div>
				{:else if filteredFolders.length === 0}
					<div class="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
						<Folder class="h-8 w-8 text-slate-600" />
						<p class="text-xs">No subfolders found in this directory.</p>
					</div>
				{:else}
					<div class="flex flex-col gap-1">
						{#each filteredFolders as folder (folder.path)}
							<div
								role="button"
								tabindex="0"
								onclick={() => handleFolderClick(folder.path)}
								ondblclick={() => handleFolderEnter(folder.path)}
								onkeydown={(e) => {
									if (e.key === 'Enter') handleFolderEnter(folder.path);
								}}
								class="flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs transition select-none {selectedFolder ===
								folder.path
									? 'border-indigo-500 bg-indigo-600/15 text-white'
									: 'border-transparent bg-slate-950/40 text-slate-300 hover:border-slate-800 hover:bg-slate-800/60'}"
							>
								<div class="flex items-center gap-2.5 truncate">
									<Folder class="h-4 w-4 shrink-0 text-indigo-400" />
									<span class="truncate font-medium">{folder.name}</span>
								</div>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										handleFolderEnter(folder.path);
									}}
									class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-400 transition hover:border-indigo-500/40 hover:bg-indigo-600/20 hover:text-indigo-300"
									title="Open subfolder"
								>
									<span>Open</span>
									<ChevronRight class="h-3 w-3" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div
				class="flex flex-col gap-3 border-t border-slate-800 bg-slate-950/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
			>
				<div class="truncate text-xs">
					<span class="text-slate-400">Target: </span>
					<span class="truncate font-mono font-medium text-indigo-300"
						>{selectedFolder || currentPath}</span
					>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={handleOpenNative}
						disabled={isOpeningNative}
						class="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
						title="Open standard Windows File Explorer folder picker"
					>
						{#if isOpeningNative}
							<Loader2 class="h-3.5 w-3.5 animate-spin text-indigo-400" />
							<span>Opening...</span>
						{:else}
							<span>Windows Dialog</span>
						{/if}
					</button>

					<button
						type="button"
						onclick={onClose}
						class="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
					>
						Cancel
					</button>

					<button
						type="button"
						onclick={handleConfirm}
						disabled={!selectedFolder}
						class="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:brightness-110 disabled:opacity-50"
					>
						<Check class="h-3.5 w-3.5" />
						<span>Select Folder</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
