<script lang="ts">
	import { Settings, Key, Check, AlertCircle, X, ExternalLink } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	let tmdbApiKey = $state('');
	let isLoading = $state(false);
	let isSaved = $state(false);
	let errorMessage = $state('');

	$effect(() => {
		if (isOpen) {
			loadSettings();
		}
	});

	async function loadSettings() {
		try {
			isLoading = true;
			const res = await fetch('/api/settings');
			const data = await res.json();
			if (data.success && data.settings) {
				tmdbApiKey = data.settings.tmdbApiKey || '';
			}
		} catch {
			// ignore load error
		} finally {
			isLoading = false;
		}
	}

	async function handleSave() {
		try {
			isLoading = true;
			errorMessage = '';
			const res = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tmdbApiKey: tmdbApiKey.trim() })
			});
			const data = await res.json();
			if (data.success) {
				isSaved = true;
				setTimeout(() => {
					isSaved = false;
				}, 2500);
			} else {
				errorMessage = data.error || 'Failed to save settings';
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
		} finally {
			isLoading = false;
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
			class="relative z-10 flex max-h-screen w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-800 px-6 py-4">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
					>
						<Settings class="h-5 w-5" />
					</div>
					<div>
						<h2 class="text-lg font-bold text-white">App Settings</h2>
						<p class="text-xs text-slate-400">Configure metadata providers & preferences</p>
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

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-6 py-5">
				<!-- Default Provider Notice -->
				<div class="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4">
					<h3 class="text-xs font-bold tracking-wider text-indigo-400 uppercase">
						Zero-Config Active
					</h3>
					<p class="mt-1 text-xs leading-relaxed text-slate-300">
						Apple iTunes Public Movie Search is active as your primary metadata provider. It
						automatically provides high-resolution official posters, plots, and genres without
						needing any account or API key!
					</p>
				</div>

				<!-- Optional TMDB Key -->
				<div class="mt-5">
					<label
						for="tmdb-key-input"
						class="flex items-center gap-1.5 text-xs font-semibold text-slate-200"
					>
						<Key class="h-3.5 w-3.5 text-indigo-400" />
						<span>TMDB API Key (Optional)</span>
					</label>
					<p class="mt-0.5 text-xs text-slate-400">
						If you ever create a free TMDB account, you can paste your key here for additional
						backdrops and ratings.
					</p>

					<div class="mt-2">
						<input
							id="tmdb-key-input"
							type="password"
							placeholder="Enter TMDB API key..."
							bind:value={tmdbApiKey}
							class="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
						/>
					</div>

					<div class="mt-2 flex items-center justify-between text-xs text-slate-500">
						<span>Leave blank to continue using public iTunes metadata.</span>
						<a
							href="https://www.themoviedb.org/settings/api"
							target="_blank"
							rel="noreferrer"
							class="flex items-center gap-1 text-indigo-400 hover:underline"
						>
							<span>Get TMDB key</span>
							<ExternalLink class="h-3 w-3" />
						</a>
					</div>
				</div>

				{#if errorMessage}
					<div
						class="mt-4 flex items-center gap-2 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300"
					>
						<AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
						<span>{errorMessage}</span>
					</div>
				{/if}

				{#if isSaved}
					<div
						class="mt-4 flex items-center gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/40 p-3 text-xs text-emerald-300"
					>
						<Check class="h-4 w-4 shrink-0 text-emerald-400" />
						<span>Settings saved successfully!</span>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-2 border-t border-slate-800 bg-slate-950/40 px-6 py-3.5">
				<button
					type="button"
					onclick={onClose}
					class="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 sm:text-sm"
				>
					Close
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={isLoading}
					class="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 sm:text-sm"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}
