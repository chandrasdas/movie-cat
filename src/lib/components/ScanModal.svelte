<script lang="ts">
	import type { LibraryFolderItem } from '#lib/types';
	import {
		FolderSearch,
		FolderOpen,
		CheckCircle2,
		AlertCircle,
		X,
		Sparkles,
		Loader2
	} from 'lucide-svelte';

	export interface LogEntry {
		id: string;
		type: 'info' | 'progress' | 'success' | 'error';
		message: string;
		title?: string;
		year?: number | null;
		posterUrl?: string | null;
	}

	import FolderBrowserModal from './FolderBrowserModal.svelte';

	interface Props {
		isOpen: boolean;
		targetPath: string;
		targetFolderId: string | null;
		folders?: LibraryFolderItem[];
		isScanning: boolean;
		progressCurrent: number;
		progressTotal: number;
		progressPercent: number;
		logItems: LogEntry[];
		currentMovieTitle: string;
		scanSummary: { total: number; added: number; updated: number } | null;
		onClose: () => void;
		onStartScan: (path: string, folderId: string | null) => void;
	}

	let {
		isOpen,
		targetPath,
		targetFolderId,
		folders = [],
		isScanning,
		progressCurrent = 0,
		progressTotal = 0,
		progressPercent = 0,
		logItems = [],
		currentMovieTitle = '',
		scanSummary = null,
		onClose,
		onStartScan
	}: Props = $props();

	let inputPath = $state('');
	let activeFolderId = $state<string | null>(null);
	let isFolderBrowserOpen = $state(false);

	$effect(() => {
		if (targetPath) {
			inputPath = targetPath;
		}
		activeFolderId = targetFolderId;
	});

	function handleFolderSelected(chosenPath: string) {
		inputPath = chosenPath;
		const matched = folders.find((f) => f.path.toLowerCase() === chosenPath.toLowerCase());
		activeFolderId = matched ? matched.id : null;
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div
			role="button"
			tabindex="0"
			onclick={() => !isScanning && onClose()}
			onkeydown={(e) => e.key === 'Escape' && !isScanning && onClose()}
			class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
		></div>

		<!-- Dialog Modal Container -->
		<div
			class="relative z-10 flex max-h-screen w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-800 px-6 py-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
					>
						<FolderSearch class="h-5 w-5" />
					</div>
					<div>
						<h2 class="text-lg font-bold text-white">Live Movie Folder Scanner</h2>
						<p class="text-xs text-slate-400">
							Scans subdirectories for "Title (Year)" & enriches metadata
						</p>
					</div>
				</div>
				{#if !isScanning}
					<button
						type="button"
						onclick={onClose}
						class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
					>
						<X class="h-5 w-5" />
					</button>
				{/if}
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-6 py-5">
				{#if !isScanning && !scanSummary}
					<!-- Prompt to Pick/Input Folder -->
					<div class="flex flex-col gap-4">
						<div>
							<label for="scan-input-path" class="block text-xs font-semibold text-slate-300">
								Directory Path to Scan
							</label>
							<p class="mt-0.5 text-xs text-slate-500">
								All subfolders named like <span class="font-mono text-indigo-400">Dune (2021)</span>
								or <span class="font-mono text-indigo-400">Inception (2010)</span> will be indexed.
							</p>
							<div class="mt-2 flex gap-2">
								<input
									id="scan-input-path"
									type="text"
									placeholder="e.g. D:\Movies or E:\Films"
									bind:value={inputPath}
									class="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
								/>
								<button
									type="button"
									onclick={() => (isFolderBrowserOpen = true)}
									class="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-3.5 py-2.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600/20 hover:text-white active:scale-95"
									title="Browse folders on your hard drive"
								>
									<FolderOpen class="h-4 w-4 text-indigo-400" />
									<span>Browse...</span>
								</button>
							</div>

							{#if folders.length > 0}
								<div class="mt-3">
									<p class="mb-1.5 text-xs font-medium text-slate-400">
										Or pick from an existing library source:
									</p>
									<div class="flex flex-wrap gap-1.5">
										{#each folders as folder (folder.id)}
											<button
												type="button"
												onclick={() => {
													inputPath = folder.path;
													activeFolderId = folder.id;
												}}
												class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition {inputPath ===
												folder.path
													? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
													: 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'}"
											>
												<FolderSearch class="h-3.5 w-3.5 text-indigo-400" />
												<span>{folder.name}</span>
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>

						<div
							class="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3.5 text-xs text-slate-400"
						>
							<span class="font-semibold text-slate-300">Tip:</span> You can scan multiple folders sequentially.
							Each folder can be turned on or off independently from the Libraries menu.
						</div>

						<button
							type="button"
							onclick={() => onStartScan(inputPath.trim(), activeFolderId)}
							disabled={!inputPath.trim()}
							class="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:brightness-110 disabled:opacity-50"
						>
							<Sparkles class="h-4 w-4" />
							<span>Start Live Scan</span>
						</button>
					</div>
				{:else if isScanning}
					<!-- Live Scanning Progress State -->
					<div class="flex flex-col gap-4">
						<!-- Progress Percentage Bar -->
						<div>
							<div class="flex items-center justify-between text-xs font-medium text-slate-300">
								<span>Processing Collection...</span>
								<span class="font-bold text-indigo-400">{progressPercent}%</span>
							</div>
							<div class="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
								<div
									class="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-300"
									style={`width: ${progressPercent}%;`}
								></div>
							</div>
							<div class="mt-1.5 flex justify-between text-xs text-slate-500">
								<span>{progressCurrent} of {progressTotal} folders processed</span>
								<span class="max-w-xs truncate"
									>{currentMovieTitle || 'Searching directories...'}</span
								>
							</div>
						</div>

						<!-- Activity Feed Box -->
						<div>
							<span class="text-xs font-semibold text-slate-400">Live Activity Feed</span>
							<div
								class="mt-1.5 flex max-h-56 flex-col gap-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-3"
							>
								{#each logItems as item (item.id)}
									<div class="flex items-center gap-2.5 text-xs text-slate-300">
										{#if item.type === 'success'}
											<CheckCircle2 class="h-4 w-4 shrink-0 text-emerald-400" />
										{:else if item.type === 'error'}
											<AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
										{:else}
											<Loader2 class="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-400" />
										{/if}
										<span class="truncate">{item.message}</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				{:else if scanSummary}
					<!-- Scan Finished Summary -->
					<div class="flex flex-col items-center py-4 text-center">
						<div
							class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400"
						>
							<CheckCircle2 class="h-8 w-8" />
						</div>
						<h3 class="mt-3 text-lg font-bold text-white">Scan Completed!</h3>
						<p class="mt-1 text-sm text-slate-400">Your local movie library is up to date.</p>

						<div class="mt-5 grid w-full max-w-sm grid-cols-3 gap-3">
							<div class="rounded-xl border border-slate-800 bg-slate-950 p-3">
								<div class="text-lg font-bold text-white">{scanSummary.total}</div>
								<div class="text-xs text-slate-400">Discovered</div>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950 p-3">
								<div class="text-lg font-bold text-emerald-400">{scanSummary.added}</div>
								<div class="text-xs text-slate-400">New Added</div>
							</div>
							<div class="rounded-xl border border-slate-800 bg-slate-950 p-3">
								<div class="text-lg font-bold text-indigo-400">{scanSummary.updated}</div>
								<div class="text-xs text-slate-400">Refreshed</div>
							</div>
						</div>

						<button
							type="button"
							onclick={onClose}
							class="mt-6 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500"
						>
							View Updated Library
						</button>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			{#if !isScanning && !scanSummary}
				<div class="flex justify-end border-t border-slate-800 bg-slate-950/40 px-6 py-3">
					<button
						type="button"
						onclick={onClose}
						class="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
					>
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<FolderBrowserModal
	isOpen={isFolderBrowserOpen}
	initialPath={inputPath}
	onClose={() => (isFolderBrowserOpen = false)}
	onSelect={handleFolderSelected}
/>
