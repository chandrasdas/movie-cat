<script lang="ts">
	import type { MovieItem } from '#lib/types';
	import MovieCard from './MovieCard.svelte';
	import { Film, FolderPlus } from 'lucide-svelte';

	interface Props {
		movies: MovieItem[];
		viewMode: 'grid' | 'list';
		isLoading: boolean;
		onSelect: (movie: MovieItem) => void;
		onReveal: (path: string) => void;
		onPlay: (path: string) => void;
		onOpenScan: () => void;
	}

	let { movies, viewMode, isLoading, onSelect, onReveal, onPlay, onOpenScan }: Props = $props();
</script>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
	{#if isLoading}
		<!-- Loading Skeleton -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{#each [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as skeletonId (skeletonId)}
				<div class="flex animate-pulse flex-col gap-2">
					<div class="poster-aspect w-full rounded-2xl bg-slate-800/60"></div>
					<div class="h-4 w-3/4 rounded bg-slate-800"></div>
					<div class="h-3 w-1/2 rounded bg-slate-800/40"></div>
				</div>
			{/each}
		</div>
	{:else if movies.length === 0}
		<!-- Empty State -->
		<div
			class="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center"
		>
			<div
				class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400"
			>
				<Film class="h-8 w-8" />
			</div>
			<h3 class="mt-4 text-lg font-bold text-slate-100">No movies found</h3>
			<p class="mt-1 max-w-md text-sm text-slate-400">
				Scan a hard disk folder containing movie subfolders (e.g. <span
					class="font-mono text-xs text-indigo-300">Dune (2021)</span
				>) or adjust your active filters.
			</p>
			<button
				type="button"
				onclick={onOpenScan}
				class="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-95"
			>
				<FolderPlus class="h-4 w-4" />
				<span>Scan Movies Folder</span>
			</button>
		</div>
	{:else if viewMode === 'grid'}
		<!-- Responsive Grid with explicit keyed loop (movie.id) -->
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
			{#each movies as movie (movie.id)}
				<MovieCard {movie} {viewMode} {onSelect} {onReveal} {onPlay} />
			{/each}
		</div>
	{:else}
		<!-- List View with explicit keyed loop (movie.id) -->
		<div class="flex flex-col gap-2.5">
			{#each movies as movie (movie.id)}
				<MovieCard {movie} {viewMode} {onSelect} {onReveal} {onPlay} />
			{/each}
		</div>
	{/if}
</div>
