<script lang="ts">
	import type { FilterOptions } from '#lib/types';
	import { LayoutGrid, List, RotateCcw } from 'lucide-svelte';

	interface Props {
		filterOptions: FilterOptions;
		selectedGenre: string;
		selectedYear: string;
		selectedLanguage: string;
		selectedRating: string;
		selectedSort: string;
		viewMode: 'grid' | 'list';
		totalCount: number;
		onGenreSelect: (genre: string) => void;
		onYearSelect: (year: string) => void;
		onLanguageSelect: (language: string) => void;
		onRatingSelect: (rating: string) => void;
		onSortSelect: (sort: string) => void;
		onViewModeChange: (mode: 'grid' | 'list') => void;
		onResetFilters: () => void;
	}

	let {
		filterOptions,
		selectedGenre,
		selectedYear,
		selectedLanguage,
		selectedRating,
		selectedSort,
		viewMode,
		totalCount,
		onGenreSelect,
		onYearSelect,
		onLanguageSelect,
		onRatingSelect,
		onSortSelect,
		onViewModeChange,
		onResetFilters
	}: Props = $props();

	let hasActiveFilters = $derived(
		selectedGenre !== 'all' ||
			selectedYear !== 'all' ||
			selectedLanguage !== 'all' ||
			selectedRating !== ''
	);
</script>

<div class="border-b border-slate-800 bg-slate-950/60 backdrop-blur-xs">
	<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6">
		<!-- Top Row: Genre Pills Multi-line -->
		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				onclick={() => onGenreSelect('all')}
				class={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
					selectedGenre === 'all'
						? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
						: 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
				}`}
			>
				All Genres
			</button>

			{#each filterOptions.genres as genre (genre)}
				<button
					type="button"
					onclick={() => onGenreSelect(genre)}
					class={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
						selectedGenre === genre
							? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
							: 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
					}`}
				>
					{genre}
				</button>
			{/each}
		</div>

		<!-- Bottom Row: Dropdown Filters & Controls -->
		<div class="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 pt-3">
			<div class="flex flex-wrap items-center gap-2 sm:gap-3">
				<!-- Year Dropdown -->
				<div class="flex items-center gap-1.5">
					<label for="filter-year" class="text-xs text-slate-400">Year:</label>
					<select
						id="filter-year"
						value={selectedYear}
						onchange={(e) => onYearSelect((e.target as HTMLSelectElement).value)}
						class="rounded-lg border border-slate-800 bg-slate-900 py-1.5 pr-8 pl-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
					>
						<option value="all">All Years</option>
						{#each filterOptions.years as yr (yr)}
							<option value={String(yr)}>{yr}</option>
						{/each}
					</select>
				</div>

				<!-- Language Dropdown -->
				{#if filterOptions.languages.length > 1}
					<div class="flex items-center gap-1.5">
						<label for="filter-lang" class="text-xs text-slate-400">Lang:</label>
						<select
							id="filter-lang"
							value={selectedLanguage}
							onchange={(e) => onLanguageSelect((e.target as HTMLSelectElement).value)}
							class="rounded-lg border border-slate-800 bg-slate-900 py-1.5 pr-8 pl-2.5 text-xs text-slate-200 uppercase focus:border-indigo-500 focus:outline-none"
						>
							<option value="all">All</option>
							{#each filterOptions.languages as lang (lang)}
								<option value={lang}>{lang}</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Rating Filter -->
				<div class="flex items-center gap-1.5">
					<label for="filter-rating" class="text-xs text-slate-400">Rating:</label>
					<select
						id="filter-rating"
						value={selectedRating}
						onchange={(e) => onRatingSelect((e.target as HTMLSelectElement).value)}
						class="rounded-lg border border-slate-800 bg-slate-900 py-1.5 pr-8 pl-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
					>
						<option value="">Any</option>
						<option value="8">★ 8.0+</option>
						<option value="7">★ 7.0+</option>
						<option value="6">★ 6.0+</option>
					</select>
				</div>

				<!-- Reset Filters -->
				{#if hasActiveFilters}
					<button
						type="button"
						onclick={onResetFilters}
						class="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs text-indigo-400 transition hover:bg-slate-800 hover:text-indigo-300"
						title="Clear all filters"
					>
						<RotateCcw class="h-3 w-3" />
						<span>Reset</span>
					</button>
				{/if}
			</div>

			<!-- Right: Sorting & View Switcher -->
			<div class="flex items-center gap-3">
				<!-- Movie Count -->
				<span class="text-xs font-medium text-slate-400">
					<span class="font-semibold text-indigo-400">{totalCount}</span>
					{totalCount === 1 ? 'movie' : 'movies'}
				</span>

				<!-- Sort Dropdown -->
				<div class="flex items-center gap-1.5">
					<label for="filter-sort" class="hidden text-xs text-slate-400 sm:inline">Sort:</label>
					<select
						id="filter-sort"
						value={selectedSort}
						onchange={(e) => onSortSelect((e.target as HTMLSelectElement).value)}
						class="rounded-lg border border-slate-800 bg-slate-900 py-1.5 pr-8 pl-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
					>
						<option value="recent_added">Recently Added</option>
						<option value="title_asc">Title (A - Z)</option>
						<option value="year_desc">Year (Newest)</option>
						<option value="year_asc">Year (Oldest)</option>
						<option value="rating_desc">Rating (Highest)</option>
					</select>
				</div>

				<!-- View Mode Switch -->
				<div class="flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
					<button
						type="button"
						onclick={() => onViewModeChange('grid')}
						class={`rounded-md p-1 transition ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
						title="Grid View"
					>
						<LayoutGrid class="h-4 w-4" />
					</button>
					<button
						type="button"
						onclick={() => onViewModeChange('list')}
						class={`rounded-md p-1 transition ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
						title="List View"
					>
						<List class="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
