<script lang="ts">
	import type { MovieItem } from '#lib/types';
	import { Play, FolderOpen, Info, Star, Clock, Calendar, Shuffle } from 'lucide-svelte';

	interface Props {
		movie: MovieItem | null;
		onSelect: (movie: MovieItem) => void;
		onReveal: (path: string) => void;
		onPlay: (path: string) => void;
		onShuffle: () => void;
	}

	let { movie, onSelect, onReveal, onPlay, onShuffle }: Props = $props();

	let genresList = $derived.by(() => {
		if (!movie || !movie.genres) return [];
		try {
			return JSON.parse(movie.genres) as string[];
		} catch {
			return [];
		}
	});

	let firstVideoFile = $derived.by(() => {
		if (!movie || !movie.videoFiles) return null;
		try {
			const files = JSON.parse(movie.videoFiles);
			return files.length > 0 ? files[0] : null;
		} catch {
			return null;
		}
	});
</script>

{#if movie}
	<section class="relative overflow-hidden border-b border-slate-800 bg-slate-950">
		<!-- Backdrop Background with Gradient Overlays -->
		<div class="absolute inset-0 z-0">
			{#if movie.backdropUrl || movie.posterUrl}
				<img
					src={movie.backdropUrl || movie.posterUrl}
					alt={movie.title}
					class="h-full w-full object-cover object-center opacity-30 blur-xs transition duration-700"
				/>
			{:else}
				<div
					class="h-full w-full bg-linear-to-br from-indigo-950/40 via-slate-950 to-purple-950/30"
				></div>
			{/if}
			<!-- Gradient overlays for cinema look -->
			<div
				class="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/70 to-transparent"
			></div>
			<div
				class="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/60 to-transparent"
			></div>
		</div>

		<!-- Spotlight Content -->
		<div class="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
			<div class="max-w-3xl">
				<!-- Top Badges -->
				<div class="mb-4 flex flex-wrap items-center gap-2">
					<span
						class="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 backdrop-blur-xs"
					>
						<Star class="h-3.5 w-3.5 fill-amber-400" />
						{movie.rating ? movie.rating.toFixed(1) : 'Featured'}
					</span>

					{#if movie.releaseYear}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-xs"
						>
							<Calendar class="h-3 w-3 text-slate-400" />
							{movie.releaseYear}
						</span>
					{/if}

					{#if movie.runtime}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-xs"
						>
							<Clock class="h-3 w-3 text-slate-400" />
							{movie.runtime} min
						</span>
					{/if}

					{#if movie.contentRating}
						<span
							class="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-xs font-semibold text-slate-400"
						>
							{movie.contentRating}
						</span>
					{/if}
				</div>

				<!-- Movie Title -->
				<h1 class="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
					{movie.title}
				</h1>

				<!-- Genre Pills -->
				{#if genresList.length > 0}
					<div class="mt-3 flex flex-wrap gap-1.5">
						{#each genresList as genre (genre)}
							<span
								class="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300"
							>
								{genre}
							</span>
						{/each}
					</div>
				{/if}

				<!-- Plot Overview -->
				<p class="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-300 sm:text-base">
					{movie.overview || `Available on local hard disk in ${movie.folderName}`}
				</p>

				<!-- Action Buttons -->
				<div class="mt-6 flex flex-wrap items-center gap-3">
					{#if firstVideoFile}
						<button
							type="button"
							onclick={() => onPlay(firstVideoFile.fullPath)}
							class="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition hover:bg-slate-200 active:scale-95"
						>
							<Play class="h-4 w-4 fill-slate-950" />
							<span>Play Movie</span>
						</button>
					{/if}

					<button
						type="button"
						onclick={() => onSelect(movie)}
						class="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-xs transition hover:bg-slate-800"
					>
						<Info class="h-4 w-4 text-indigo-400" />
						<span>Movie Details</span>
					</button>

					<button
						type="button"
						onclick={() => onReveal(movie.folderPath)}
						class="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
						title="Open Folder in Windows Explorer"
					>
						<FolderOpen class="h-4 w-4 text-amber-400" />
						<span class="hidden sm:inline">Open in Explorer</span>
					</button>

					<button
						type="button"
						onclick={onShuffle}
						class="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
						title="Shuffle Featured Movie"
					>
						<Shuffle class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	</section>
{/if}
