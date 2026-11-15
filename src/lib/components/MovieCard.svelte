<script lang="ts">
	import type { MovieItem } from '#lib/types';
	import { Play, FolderOpen, Star, Film } from 'lucide-svelte';

	interface Props {
		movie: MovieItem;
		viewMode: 'grid' | 'list';
		onSelect: (movie: MovieItem) => void;
		onReveal: (path: string) => void;
		onPlay: (path: string) => void;
	}

	let { movie, viewMode, onSelect, onReveal, onPlay }: Props = $props();

	let genresList = $derived.by(() => {
		if (!movie.genres) return [];
		try {
			return JSON.parse(movie.genres) as string[];
		} catch {
			return [];
		}
	});

	let firstVideoFile = $derived.by(() => {
		if (!movie.videoFiles) return null;
		try {
			const files = JSON.parse(movie.videoFiles);
			return files.length > 0 ? files[0] : null;
		} catch {
			return null;
		}
	});
</script>

{#if viewMode === 'grid'}
	<!-- Grid Card -->
	<div
		role="button"
		tabindex="0"
		onclick={() => onSelect(movie)}
		onkeydown={(e) => e.key === 'Enter' && onSelect(movie)}
		class="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 transition duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10"
	>
		<!-- Poster Container -->
		<div class="poster-aspect relative w-full overflow-hidden bg-slate-950">
			{#if movie.posterUrl}
				<img
					src={movie.posterUrl}
					alt={movie.title}
					loading="lazy"
					class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
				/>
			{:else}
				<!-- Procedural Fallback Poster -->
				<div
					class="flex h-full w-full flex-col justify-between bg-linear-to-br from-slate-900 via-indigo-950 to-slate-950 p-4 text-center"
				>
					<div class="flex justify-end">
						<Film class="h-6 w-6 text-indigo-400/40" />
					</div>
					<div>
						<h3 class="line-clamp-3 text-base font-bold text-slate-100">{movie.title}</h3>
						{#if movie.releaseYear}
							<p class="mt-1 text-xs text-indigo-300">({movie.releaseYear})</p>
						{/if}
					</div>
					<div class="text-xs text-slate-500">Local Copy</div>
				</div>
			{/if}

			<!-- Top Badges -->
			<div
				class="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between gap-1"
			>
				{#if movie.releaseYear}
					<span
						class="rounded-md bg-slate-950/80 px-2 py-0.5 text-xs font-semibold text-slate-200 backdrop-blur-xs"
					>
						{movie.releaseYear}
					</span>
				{:else}
					<span></span>
				{/if}

				{#if movie.rating}
					<span
						class="flex items-center gap-0.5 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-xs font-bold text-slate-950 backdrop-blur-xs"
					>
						<Star class="h-3 w-3 fill-slate-950" />
						{movie.rating.toFixed(1)}
					</span>
				{/if}
			</div>

			<!-- Quick Hover Overlay Actions -->
			<div
				class="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/70 opacity-0 backdrop-blur-xs transition duration-300 group-hover:opacity-100"
			>
				{#if firstVideoFile}
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation();
							onPlay(firstVideoFile.fullPath);
						}}
						class="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg transition hover:scale-110 active:scale-95"
						title="Play Movie"
					>
						<Play class="ml-0.5 h-5 w-5 fill-slate-950" />
					</button>
				{/if}

				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						onReveal(movie.folderPath);
					}}
					class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 shadow-md transition hover:scale-110 hover:text-amber-400"
					title="Open in Windows Explorer"
				>
					<FolderOpen class="h-4 w-4" />
				</button>
			</div>
		</div>

		<!-- Info Footer -->
		<div class="flex flex-1 flex-col justify-between p-3">
			<div>
				<h3
					class="line-clamp-1 text-sm font-semibold text-slate-100 transition group-hover:text-indigo-400"
				>
					{movie.title}
				</h3>
				{#if genresList.length > 0}
					<p class="mt-1 line-clamp-1 text-xs text-slate-400">
						{genresList.slice(0, 2).join(' • ')}
					</p>
				{/if}
			</div>

			<div
				class="mt-2.5 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs text-slate-500"
			>
				<span class="line-clamp-1 text-slate-400" title={movie.folderNameSource || ''}>
					{movie.folderNameSource || 'Library'}
				</span>
				{#if movie.runtime}
					<span>{movie.runtime}m</span>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- List Row Item -->
	<div
		role="button"
		tabindex="0"
		onclick={() => onSelect(movie)}
		onkeydown={(e) => e.key === 'Enter' && onSelect(movie)}
		class="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 transition hover:border-indigo-500/50 hover:bg-slate-900"
	>
		<div class="flex min-w-0 items-center gap-4">
			<!-- Mini Poster -->
			<div class="poster-aspect h-16 shrink-0 overflow-hidden rounded-lg bg-slate-950">
				{#if movie.posterUrl}
					<img src={movie.posterUrl} alt={movie.title} class="h-full w-full object-cover" />
				{:else}
					<div class="flex h-full w-full items-center justify-center bg-indigo-950 text-indigo-400">
						<Film class="h-4 w-4" />
					</div>
				{/if}
			</div>

			<!-- Meta Details -->
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<h3 class="truncate text-base font-semibold text-slate-100 group-hover:text-indigo-400">
						{movie.title}
					</h3>
					{#if movie.releaseYear}
						<span class="text-xs font-medium text-slate-400">({movie.releaseYear})</span>
					{/if}
					{#if movie.rating}
						<span
							class="flex items-center gap-0.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-semibold text-amber-400"
						>
							<Star class="h-3 w-3 fill-amber-400" />
							{movie.rating.toFixed(1)}
						</span>
					{/if}
				</div>

				<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
					{#if genresList.length > 0}
						<span>{genresList.join(', ')}</span>
						<span>•</span>
					{/if}
					{#if movie.runtime}
						<span>{movie.runtime} min</span>
						<span>•</span>
					{/if}
					<span class="truncate text-slate-500">{movie.folderName}</span>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex shrink-0 items-center gap-2">
			{#if firstVideoFile}
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						onPlay(firstVideoFile.fullPath);
					}}
					class="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500"
				>
					<Play class="h-3.5 w-3.5 fill-white" />
					<span>Play</span>
				</button>
			{/if}

			<button
				type="button"
				onclick={(e) => {
					e.stopPropagation();
					onReveal(movie.folderPath);
				}}
				class="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
				title="Reveal in Explorer"
			>
				<FolderOpen class="h-4 w-4" />
			</button>
		</div>
	</div>
{/if}
