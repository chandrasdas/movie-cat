<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { MovieItem, LibraryFolderItem, FilterOptions } from '#lib/types';
	import Navbar from '#lib/components/Navbar.svelte';
	import HeroSpotlight from '#lib/components/HeroSpotlight.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import MovieGrid from '#lib/components/MovieGrid.svelte';
	import MovieDetailModal from '#lib/components/MovieDetailModal.svelte';
	import FolderManagerModal from '#lib/components/FolderManagerModal.svelte';
	import ScanModal from '#lib/components/ScanModal.svelte';
	import SettingsModal from '#lib/components/SettingsModal.svelte';

	// App State
	let movies = $state<MovieItem[]>([]);
	let folders = $state<LibraryFolderItem[]>([]);
	let filterOptions = $state<FilterOptions>({
		genres: [],
		years: [],
		languages: [],
		totalMovies: 0
	});

	let searchQuery = $state('');
	let selectedGenre = $state('all');
	let selectedYear = $state('all');
	let selectedLanguage = $state('all');
	let selectedRating = $state('');
	let selectedSort = $state('recent_added');
	let viewMode = $state<'grid' | 'list'>('grid');
	let isLoading = $state(true);

	// Modals State
	let selectedMovie = $state<MovieItem | null>(null);
	let spotlightMovie = $state<MovieItem | null>(null);
	let isFoldersOpen = $state(false);
	let isScanOpen = $state(false);
	let isSettingsOpen = $state(false);

	// Live Scan State
	let scanTargetPath = $state('');
	let scanTargetFolderId = $state<string | null>(null);
	let isScanning = $state(false);
	let scanProgressCurrent = $state(0);
	let scanProgressTotal = $state(0);
	let scanProgressPercent = $state(0);
	let scanCurrentMovie = $state('');
	let scanSummary = $state<{ total: number; added: number; updated: number } | null>(null);
	let scanLogs = $state<
		Array<{
			id: string;
			type: 'info' | 'progress' | 'success' | 'error';
			message: string;
		}>
	>([]);

	// Derived folder statistics
	let activeFolderCount = $derived(folders.filter((f) => f.isEnabled).length);
	let totalFolderCount = $derived(folders.length);

	// Fetch movies with active filters
	async function loadMovies() {
		try {
			isLoading = true;
			const params = new SvelteURLSearchParams();
			if (searchQuery.trim()) params.set('search', searchQuery.trim());
			if (selectedGenre !== 'all') params.set('genre', selectedGenre);
			if (selectedYear !== 'all') params.set('year', selectedYear);
			if (selectedLanguage !== 'all') params.set('language', selectedLanguage);
			if (selectedRating) params.set('minRating', selectedRating);
			if (selectedSort) params.set('sort', selectedSort);

			const res = await fetch(`/api/movies?${params.toString()}`);
			const data = await res.json();
			if (data.success) {
				movies = data.movies;
				filterOptions = data.filterOptions;

				// Update spotlight banner movie if none or if current one is not in the list
				if (movies.length > 0) {
					if (!spotlightMovie || !movies.some((m) => m.id === spotlightMovie?.id)) {
						spotlightMovie = movies[0];
					}
				} else {
					spotlightMovie = null;
				}
			}
		} catch (err) {
			console.error('Failed to load movies:', err);
		} finally {
			isLoading = false;
		}
	}

	// Fetch registered library folders
	async function loadFolders() {
		try {
			const res = await fetch('/api/folders');
			const data = await res.json();
			if (data.success) {
				folders = data.folders;
			}
		} catch (err) {
			console.error('Failed to load folders:', err);
		}
	}

	// Toggle folder isEnabled (unticking instantly hides all movies under that folder)
	async function handleToggleFolder(folderId: string, isEnabled: boolean) {
		try {
			const res = await fetch(`/api/folders/${folderId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isEnabled })
			});
			const data = await res.json();
			if (data.success) {
				folders = folders.map((f) => (f.id === folderId ? { ...f, isEnabled } : f));
				// Instantly reload movies to update catalog view
				await loadMovies();
			}
		} catch (err) {
			console.error('Failed to toggle folder:', err);
		}
	}

	// Remove folder and its indexed movies
	async function handleRemoveFolder(folderId: string) {
		if (
			!confirm(
				'Are you sure you want to remove this folder from MovieCat? Its movies will be removed from your catalog.'
			)
		) {
			return;
		}
		try {
			const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				folders = folders.filter((f) => f.id !== folderId);
				await loadMovies();
			}
		} catch (err) {
			console.error('Failed to remove folder:', err);
		}
	}

	// Rescan a specific existing folder
	function handleRescanFolder(folderId: string) {
		const target = folders.find((f) => f.id === folderId);
		if (!target) return;
		scanTargetFolderId = folderId;
		scanTargetPath = target.path;
		isFoldersOpen = false;
		isScanOpen = true;
		startScan(target.path, folderId);
	}

	// Add a new folder and immediately start scan
	async function handleAddFolder(folderPath: string, folderName?: string): Promise<boolean> {
		try {
			const res = await fetch('/api/folders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: folderPath, name: folderName })
			});
			const data = await res.json();
			if (data.success && data.folder) {
				await loadFolders();
				isFoldersOpen = false;
				scanTargetFolderId = data.folder.id;
				scanTargetPath = data.folder.path;
				isScanOpen = true;
				startScan(data.folder.path, data.folder.id);
				return true;
			}
			return false;
		} catch (err) {
			console.error('Failed to add folder:', err);
			return false;
		}
	}

	// Start Live Scan using Server-Sent Events (SSE)
	async function startScan(folderPath: string, folderId: string | null) {
		isScanning = true;
		scanProgressCurrent = 0;
		scanProgressTotal = 0;
		scanProgressPercent = 0;
		scanCurrentMovie = '';
		scanSummary = null;
		scanLogs = [
			{
				id: String(Date.now()),
				type: 'info',
				message: `Connecting to scan engine for ${folderPath}...`
			}
		];

		try {
			const response = await fetch('/api/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: folderPath, folderId })
			});

			if (!response.body) {
				throw new Error('ReadableStream not supported by response');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n\n');
				buffer = lines.pop() || '';

				for (const block of lines) {
					if (!block.trim()) continue;
					const eventMatch = block.match(/event:\s*(.+)/);
					const dataMatch = block.match(/data:\s*(.+)/);

					if (eventMatch && dataMatch) {
						const eventType = eventMatch[1].trim();
						try {
							const payload = JSON.parse(dataMatch[1]);
							handleScanEvent(eventType, payload);
						} catch {
							// ignore parse errors
						}
					}
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Scan error';
			scanLogs = [
				...scanLogs,
				{ id: String(Date.now()), type: 'error', message: `Scan failed: ${msg}` }
			];
		} finally {
			isScanning = false;
			await loadFolders();
			await loadMovies();
		}
	}

	interface ScanEventData {
		message?: string;
		total?: number;
		current?: number;
		title?: string;
		year?: number | string;
		source?: string;
		added?: number;
		updated?: number;
	}

	function handleScanEvent(eventType: string, data: ScanEventData) {
		const timestamp = String(Date.now() + Math.random());
		const message = data.message ?? '';
		switch (eventType) {
			case 'start':
				scanLogs = [
					...scanLogs,
					{ id: timestamp, type: 'info', message: message || 'Scanning folder...' }
				];
				break;
			case 'discovery_progress':
				scanLogs = [
					...scanLogs,
					{ id: timestamp, type: 'info', message: `Discovered: ${message}` }
				];
				break;
			case 'discovery_complete':
				scanProgressTotal = data.total ?? 0;
				scanLogs = [...scanLogs, { id: timestamp, type: 'info', message }];
				break;
			case 'item_progress':
				scanProgressCurrent = data.current ?? 0;
				scanProgressTotal = data.total ?? 0;
				scanProgressPercent =
					(data.total ?? 0) > 0 ? Math.round(((data.current ?? 0) / (data.total ?? 1)) * 100) : 0;
				scanCurrentMovie = `${data.title ?? ''} (${data.year ?? ''})`;
				scanLogs = [
					...scanLogs.slice(-25),
					{
						id: timestamp,
						type: 'progress',
						message: `Resolving: ${data.title ?? ''} (${data.year ?? ''})`
					}
				];
				break;
			case 'item_completed':
				scanLogs = [
					...scanLogs.slice(-25),
					{
						id: timestamp,
						type: 'success',
						message: `Matched: ${data.title ?? ''} [${data.source ?? ''}]`
					}
				];
				break;
			case 'complete':
				scanProgressPercent = 100;
				scanSummary = {
					total: data.total ?? 0,
					added: data.added ?? 0,
					updated: data.updated ?? 0
				};
				scanLogs = [...scanLogs, { id: timestamp, type: 'success', message }];
				break;
			case 'error':
				scanLogs = [...scanLogs, { id: timestamp, type: 'error', message }];
				break;
		}
	}

	// System Actions
	async function handleReveal(targetPath: string) {
		try {
			await fetch('/api/system/reveal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: targetPath })
			});
		} catch (err) {
			console.error('Failed to reveal folder in Explorer:', err);
		}
	}

	async function handlePlay(targetPath: string) {
		try {
			await fetch('/api/system/play', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: targetPath })
			});
		} catch (err) {
			console.error('Failed to launch video in player:', err);
		}
	}

	function handleShuffleSpotlight() {
		if (movies.length <= 1) return;
		let randomMovie = movies[Math.floor(Math.random() * movies.length)];
		if (randomMovie.id === spotlightMovie?.id && movies.length > 1) {
			randomMovie = movies[(movies.indexOf(randomMovie) + 1) % movies.length];
		}
		spotlightMovie = randomMovie;
	}

	function handleResetFilters() {
		searchQuery = '';
		selectedGenre = 'all';
		selectedYear = 'all';
		selectedLanguage = 'all';
		selectedRating = '';
		selectedSort = 'recent_added';
		loadMovies();
	}

	// Re-trigger loadMovies when search/filters change
	function handleSearchChange(query: string) {
		searchQuery = query;
		loadMovies();
	}

	function handleGenreSelect(genre: string) {
		selectedGenre = genre;
		loadMovies();
	}

	function handleYearSelect(year: string) {
		selectedYear = year;
		loadMovies();
	}

	function handleLanguageSelect(lang: string) {
		selectedLanguage = lang;
		loadMovies();
	}

	function handleRatingSelect(rating: string) {
		selectedRating = rating;
		loadMovies();
	}

	function handleSortSelect(sort: string) {
		selectedSort = sort;
		loadMovies();
	}

	onMount(() => {
		loadFolders();
		loadMovies();
	});
</script>

<svelte:head>
	<title>MovieCat — Hard Disk Cinema Explorer</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white"
>
	<!-- Top Navigation Bar -->
	<Navbar
		{searchQuery}
		{activeFolderCount}
		totalFolders={totalFolderCount}
		onSearchChange={handleSearchChange}
		onOpenFolders={() => (isFoldersOpen = true)}
		onOpenScan={() => {
			scanTargetPath = '';
			scanTargetFolderId = null;
			scanSummary = null;
			isScanOpen = true;
		}}
		onOpenSettings={() => (isSettingsOpen = true)}
	/>

	<!-- Hero Spotlight (Shown when no search query and spotlight movie exists) -->
	{#if !searchQuery && spotlightMovie}
		<HeroSpotlight
			movie={spotlightMovie}
			onSelect={(m) => (selectedMovie = m)}
			onReveal={handleReveal}
			onPlay={handlePlay}
			onShuffle={handleShuffleSpotlight}
		/>
	{/if}

	<!-- Multi-Filter & Sort Toolbar -->
	<FilterBar
		{filterOptions}
		{selectedGenre}
		{selectedYear}
		{selectedLanguage}
		{selectedRating}
		{selectedSort}
		{viewMode}
		totalCount={movies.length}
		onGenreSelect={handleGenreSelect}
		onYearSelect={handleYearSelect}
		onLanguageSelect={handleLanguageSelect}
		onRatingSelect={handleRatingSelect}
		onSortSelect={handleSortSelect}
		onViewModeChange={(m) => (viewMode = m)}
		onResetFilters={handleResetFilters}
	/>

	<!-- Movie Catalog Grid/List -->
	<main class="flex-1">
		<MovieGrid
			{movies}
			{viewMode}
			{isLoading}
			onSelect={(m) => (selectedMovie = m)}
			onReveal={handleReveal}
			onPlay={handlePlay}
			onOpenScan={() => {
				scanTargetPath = '';
				scanTargetFolderId = null;
				scanSummary = null;
				isScanOpen = true;
			}}
		/>
	</main>

	<!-- Footer -->
	<footer class="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
		<div class="mx-auto max-w-7xl px-4">
			MovieCat — On-Demand Hard Disk Movie Library • Free iTunes & TMDB metadata integration
		</div>
	</footer>

	<!-- Movie Details Modal -->
	<MovieDetailModal
		movie={selectedMovie}
		onClose={() => (selectedMovie = null)}
		onReveal={handleReveal}
		onPlay={handlePlay}
	/>

	<!-- Library Sources & Multi-Folder Modal -->
	<FolderManagerModal
		isOpen={isFoldersOpen}
		{folders}
		onClose={() => (isFoldersOpen = false)}
		onToggleFolder={handleToggleFolder}
		onRescanFolder={handleRescanFolder}
		onRemoveFolder={handleRemoveFolder}
		onAddFolder={handleAddFolder}
	/>

	<!-- Live Scanning Modal -->
	<ScanModal
		isOpen={isScanOpen}
		targetPath={scanTargetPath}
		targetFolderId={scanTargetFolderId}
		{folders}
		{isScanning}
		progressCurrent={scanProgressCurrent}
		progressTotal={scanProgressTotal}
		progressPercent={scanProgressPercent}
		logItems={scanLogs}
		currentMovieTitle={scanCurrentMovie}
		{scanSummary}
		onClose={() => (isScanOpen = false)}
		onStartScan={startScan}
	/>

	<!-- Settings Modal -->
	<SettingsModal isOpen={isSettingsOpen} onClose={() => (isSettingsOpen = false)} />
</div>
