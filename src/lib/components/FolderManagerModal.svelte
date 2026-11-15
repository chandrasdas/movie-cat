<script lang="ts">
	import type { LibraryFolderItem } from '#lib/types';
	import { FolderKanban, FolderOpen, Plus, RefreshCw, Trash2, X, AlertCircle } from 'lucide-svelte';

	import FolderBrowserModal from './FolderBrowserModal.svelte';

	interface Props {
		isOpen: boolean;
		folders: LibraryFolderItem[];
		onClose: () => void;
		onToggleFolder: (folderId: string, isEnabled: boolean) => void;
		onRescanFolder: (folderId: string) => void;
		onRemoveFolder: (folderId: string) => void;
		onAddFolder: (folderPath: string, folderName?: string) => Promise<boolean>;
	}

	let {
		isOpen,
		folders,
		onClose,
		onToggleFolder,
		onRescanFolder,
		onRemoveFolder,
		onAddFolder
	}: Props = $props();

	let newPath = $state('');
	let newName = $state('');
	let isAdding = $state(false);
	let isFolderBrowserOpen = $state(false);
	let errorMessage = $state('');

	function handleFolderSelected(chosenPath: string) {
		newPath = chosenPath;
		if (!newName.trim()) {
			const segments = chosenPath.replace(/[\\/]+$/, '').split(/[\\/]/);
			const last = segments[segments.length - 1];
			if (last) {
				newName = last;
			}
		}
	}

	async function handleAdd() {
		if (!newPath.trim()) {
			errorMessage = 'Please enter a valid directory path.';
			return;
		}
		errorMessage = '';
		isAdding = true;
		try {
			const success = await onAddFolder(newPath.trim(), newName.trim() || undefined);
			if (success) {
				newPath = '';
				newName = '';
			} else {
				errorMessage = 'Could not add folder. Ensure the path exists on your hard drive.';
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Failed to add folder';
		} finally {
			isAdding = false;
		}
	}
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
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
			class="relative z-10 flex max-h-screen w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-800 px-6 py-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
					>
						<FolderKanban class="h-5 w-5" />
					</div>
					<div>
						<h2 class="text-lg font-bold text-white">Library Sources & Hard Disk Folders</h2>
						<p class="text-xs text-slate-400">
							Untick a folder to hide its movies from your catalog.
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

			<!-- Folder List Body -->
			<div class="flex-1 overflow-y-auto px-6 py-4">
				{#if folders.length === 0}
					<div
						class="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 text-center text-slate-400"
					>
						<p class="text-sm">No folders added yet. Add a movie folder below to begin scanning!</p>
					</div>
				{:else}
					<div class="flex flex-col gap-3">
						{#each folders as folder (folder.id)}
							<div
								class="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
							>
								<!-- Checkbox and Folder Details -->
								<div class="flex min-w-0 items-start gap-3">
									<input
										type="checkbox"
										id={`folder-${folder.id}`}
										checked={folder.isEnabled}
										onchange={(e) =>
											onToggleFolder(folder.id, (e.target as HTMLInputElement).checked)}
										class="mt-1 h-5 w-5 cursor-pointer rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
									/>
									<div class="min-w-0">
										<label
											for={`folder-${folder.id}`}
											class="block cursor-pointer font-semibold text-slate-200 hover:text-indigo-400"
										>
											{folder.name}
										</label>
										<p class="truncate font-mono text-xs text-slate-400" title={folder.path}>
											{folder.path}
										</p>
										<div class="mt-1 flex items-center gap-2 text-xs">
											<span
												class="rounded bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-300"
											>
												{folder.movieCount}
												{folder.movieCount === 1 ? 'movie' : 'movies'}
											</span>
											{#if !folder.isEnabled}
												<span
													class="rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-400"
												>
													Hidden
												</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Action Buttons -->
								<div class="flex shrink-0 items-center gap-1.5">
									<button
										type="button"
										onclick={() => onRescanFolder(folder.id)}
										class="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:bg-slate-800 hover:text-indigo-400"
										title="Rescan this folder"
									>
										<RefreshCw class="h-4 w-4" />
									</button>
									<button
										type="button"
										onclick={() => onRemoveFolder(folder.id)}
										class="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:border-red-900/60 hover:bg-red-950/40 hover:text-red-400"
										title="Remove folder and its movies"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Add New Folder Form -->
				<div class="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
					<h3 class="text-sm font-bold text-slate-200">Add Another Folder</h3>
					<p class="mt-0.5 text-xs text-slate-400">
						Enter the full directory path (e.g. <span class="font-mono text-indigo-300"
							>D:\Movies</span
						>) to scan recursively.
					</p>

					<div class="mt-3 flex flex-col gap-2 sm:flex-row">
						<div class="flex flex-1 gap-2">
							<input
								type="text"
								placeholder="e.g. D:\Movies or E:\Media\Films"
								bind:value={newPath}
								class="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
							/>
							<button
								type="button"
								onclick={() => (isFolderBrowserOpen = true)}
								class="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600/20 hover:text-white"
								title="Browse for folder"
							>
								<FolderOpen class="h-3.5 w-3.5 text-indigo-400" />
								<span>Browse</span>
							</button>
						</div>
						<input
							type="text"
							placeholder="Label (optional)"
							bind:value={newName}
							class="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none sm:w-36"
						/>
						<button
							type="button"
							onclick={handleAdd}
							disabled={isAdding}
							class="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
						>
							{#if isAdding}
								<RefreshCw class="h-4 w-4 animate-spin" />
								<span>Adding...</span>
							{:else}
								<Plus class="h-4 w-4" />
								<span>Add & Scan</span>
							{/if}
						</button>
					</div>

					{#if errorMessage}
						<div
							class="mt-2.5 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/40 p-2 text-xs text-red-300"
						>
							<AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
							<span>{errorMessage}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="flex justify-end border-t border-slate-800 bg-slate-950/40 px-6 py-3.5">
				<button
					type="button"
					onclick={onClose}
					class="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 sm:text-sm"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}

<FolderBrowserModal
	isOpen={isFolderBrowserOpen}
	initialPath={newPath}
	onClose={() => (isFolderBrowserOpen = false)}
	onSelect={handleFolderSelected}
/>
