<script lang="ts">
	import type { MovieItem, VideoFileDetail } from '#lib/types';
	import { X, Play, FolderOpen, Star, Film, Copy, Check, Video } from 'lucide-svelte';

	interface Props {
		movie: MovieItem | null;
		onClose: () => void;
		onReveal: (path: string) => void;
		onPlay: (path: string) => void;
	}

	let { movie, onClose, onReveal, onPlay }: Props = $props();

	let copiedPath = $state(false);

	let genresList = $derived.by(() => {
		if (!movie || !movie.genres) return [];
		try {
			return JSON.parse(movie.genres) as string[];
		} catch {
			return [];
		}
	});

	let videoFilesList = $derived.by(() => {
		if (!movie || !movie.videoFiles) return [];
		try {
			return JSON.parse(movie.videoFiles) as VideoFileDetail[];
		} catch {
			return [];
		}
	});

	function formatBytes(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function handleCopyPath() {
		if (!movie) return;
		navigator.clipboard.writeText(movie.folderPath);
		copiedPath = true;
		setTimeout(() => {
			copiedPath = false;
		}, 2000);
	}
</script>

{#if movie}
	<div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
		<!-- Backdrop -->
		<div
			role="button"
			tabindex="0"
			onclick={onClose}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
			class="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
		></div>

		<!-- Dialog Modal Container -->
		<div
			class="relative z-10 my-auto flex max-h-screen w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
		>
			<!-- Close Button Top Right -->
			<button
				type="button"
				onclick={onClose}
				class="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-slate-300 backdrop-blur-xs transition hover:bg-slate-900 hover:text-white"
			>
				<X class="h-5 w-5" />
			</button>

			<!-- Backdrop Banner Header -->
			<div class="relative h-64 w-full overflow-hidden bg-slate-950 sm:h-80">
				{#if movie.backdropUrl || movie.posterUrl}
					<img
						src={movie.backdropUrl || movie.posterUrl}
						alt={movie.title}
						class="h-full w-full object-cover object-center opacity-40 blur-xs"
					/>
				{:else}
					<div
						class="h-full w-full bg-linear-to-br from-indigo-950 via-slate-950 to-purple-950/50"
					></div>
				{/if}
				<div
					class="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/60 to-transparent"
				></div>

				<!-- Floating Poster and Header Info -->
				<div class="absolute inset-x-6 bottom-4 flex items-end gap-5">
					<!-- Movie Poster Thumbnail -->
					<div
						class="poster-aspect hidden w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 shadow-2xl sm:block"
					>
						{#if movie.posterUrl}
							<img src={movie.posterUrl} alt={movie.title} class="h-full w-full object-cover" />
						{:else}
							<div
								class="flex h-full w-full items-center justify-center bg-indigo-950 text-indigo-400"
							>
								<Film class="h-8 w-8" />
							</div>
						{/if}
					</div>

					<div class="flex-1">
						<!-- Badges -->
						<div class="flex flex-wrap items-center gap-2">
							{#if movie.rating}
								<span
									class="flex items-center gap-1 rounded-md bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-400"
								>
									<Star class="h-3.5 w-3.5 fill-amber-400" />
									{movie.rating.toFixed(1)}
								</span>
							{/if}
							{#if movie.releaseYear}
								<span
									class="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300"
								>
									{movie.releaseYear}
								</span>
							{/if}
							{#if movie.runtime}
								<span
									class="rounded-md bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300"
								>
									{movie.runtime} min
								</span>
							{/if}
							{#if movie.contentRating}
								<span
									class="rounded-md border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-xs font-semibold text-slate-300"
								>
									{movie.contentRating}
								</span>
							{/if}
						</div>

						<h2 class="mt-2 text-2xl font-black text-white sm:text-3xl">
							{movie.title}
						</h2>

						{#if genresList.length > 0}
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each genresList as genre (genre)}
									<span
										class="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300"
									>
										{genre}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Modal Body -->
			<div class="flex-1 overflow-y-auto px-6 py-6">
				<!-- Plot Overview -->
				<div class="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
					<h3 class="text-xs font-bold tracking-wider text-slate-400 uppercase">Synopsis</h3>
					<p class="mt-2 text-sm leading-relaxed text-slate-200">
						{movie.overview || 'No plot summary available for this title.'}
					</p>
				</div>

				<!-- Local File Details & Path -->
				<div class="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
					<div class="flex items-center justify-between">
						<h3 class="text-xs font-bold tracking-wider text-slate-400 uppercase">
							Local Hard Disk Location
						</h3>
						<span class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
							{movie.folderNameSource || 'Hard Disk'}
						</span>
					</div>

					<div
						class="mt-2 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2.5"
					>
						<span class="truncate font-mono text-xs text-slate-300" title={movie.folderPath}>
							{movie.folderPath}
						</span>
						<div class="flex shrink-0 items-center gap-1.5">
							<button
								type="button"
								onclick={handleCopyPath}
								class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
								title="Copy Path"
							>
								{#if copiedPath}
									<Check class="h-4 w-4 text-emerald-400" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</button>

							<button
								type="button"
								onclick={() => onReveal(movie.folderPath)}
								class="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
								title="Reveal in Windows Explorer"
							>
								<FolderOpen class="h-3.5 w-3.5 text-amber-400" />
								<span>Open in Explorer</span>
							</button>
						</div>
					</div>

					<!-- Detected Video Files -->
					{#if videoFilesList.length > 0}
						<div class="mt-4">
							<h4 class="text-xs font-semibold text-slate-400">
								Video Files ({videoFilesList.length})
							</h4>
							<div class="mt-2 flex flex-col gap-2">
								{#each videoFilesList as file (file.name)}
									<div
										class="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5"
									>
										<div class="flex min-w-0 items-center gap-2">
											<Video class="h-4 w-4 shrink-0 text-indigo-400" />
											<span class="truncate font-mono text-xs text-slate-200">{file.name}</span>
											<span
												class="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400"
											>
												{formatBytes(file.sizeBytes)}
											</span>
										</div>

										<button
											type="button"
											onclick={() => onPlay(file.fullPath)}
											class="flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500"
										>
											<Play class="h-3 w-3 fill-white" />
											<span>Play</span>
										</button>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<!-- Trailer Video Preview (if available) -->
				{#if movie.trailerUrl}
					<div class="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
						<h3 class="text-xs font-bold tracking-wider text-slate-400 uppercase">
							Official Preview Clip
						</h3>
						<div class="mt-2 overflow-hidden rounded-xl bg-slate-950">
							<video controls src={movie.trailerUrl} class="max-h-72 w-full rounded-xl">
								<track kind="captions" />
							</video>
						</div>
					</div>
				{/if}
			</div>

			<!-- Footer Actions -->
			<div
				class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 px-6 py-4"
			>
				<div class="flex items-center gap-2 text-xs text-slate-500">
					<span>Source: {movie.metadataSource || 'local'}</span>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => onReveal(movie.folderPath)}
						class="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
					>
						<FolderOpen class="h-4 w-4 text-amber-400" />
						<span>Reveal in Explorer</span>
					</button>

					{#if videoFilesList.length > 0}
						<button
							type="button"
							onclick={() => onPlay(videoFilesList[0].fullPath)}
							class="flex items-center gap-1.5 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:brightness-110"
						>
							<Play class="h-4 w-4 fill-white" />
							<span>Play Movie</span>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
