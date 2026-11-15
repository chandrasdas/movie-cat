import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFolderName, type ParsedFolderInfo } from './metadata';

const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v', '.webm', '.flv']);

export interface VideoFileInfo {
	name: string;
	relativePath: string;
	fullPath: string;
	sizeBytes: number;
	extension: string;
}

export interface DiscoveredMovieFolder {
	folderPath: string;
	folderName: string;
	parsedInfo: ParsedFolderInfo;
	videoFiles: VideoFileInfo[];
}

/**
 * Checks if a directory contains video files and returns their info
 */
async function inspectVideoFiles(dirPath: string): Promise<VideoFileInfo[]> {
	const videoFiles: VideoFileInfo[] = [];
	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				if (VIDEO_EXTENSIONS.has(ext)) {
					const fullPath = path.join(dirPath, entry.name);
					try {
						const stat = await fs.stat(fullPath);
						videoFiles.push({
							name: entry.name,
							relativePath: entry.name,
							fullPath,
							sizeBytes: stat.size,
							extension: ext.replace('.', '')
						});
					} catch {
						videoFiles.push({
							name: entry.name,
							relativePath: entry.name,
							fullPath,
							sizeBytes: 0,
							extension: ext.replace('.', '')
						});
					}
				}
			}
		}
	} catch (err) {
		console.error(`Failed to read folder files in ${dirPath}:`, err);
	}
	return videoFiles;
}

/**
 * Recursively scans directory for movie folders matching 'Title (Year)'.
 * Category folders (not matching 'Title (Year)') are traversed deeper.
 */
export async function scanDirectoryForMovies(
	rootPath: string,
	onProgress?: (status: { message: string; count: number }) => void
): Promise<DiscoveredMovieFolder[]> {
	const discovered: DiscoveredMovieFolder[] = [];
	const visitedDirs = new Set<string>();

	async function traverse(currentDir: string, depth = 0) {
		// Prevent infinite loops and deep recursion limit
		if (depth > 8 || visitedDirs.has(currentDir)) return;
		visitedDirs.add(currentDir);

		let entries;
		try {
			entries = await fs.readdir(currentDir, { withFileTypes: true });
		} catch (err) {
			console.warn(`Could not read directory ${currentDir}:`, err);
			return;
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			// Skip hidden / system folders
			if (
				entry.name.startsWith('.') ||
				entry.name.startsWith('$') ||
				entry.name.toLowerCase() === 'system volume information'
			) {
				continue;
			}

			const fullChildPath = path.join(currentDir, entry.name);
			const parsed = parseFolderName(entry.name);

			// If folder matches 'Title (Year)', treat it as a movie candidate!
			if (parsed.parsedYear !== null) {
				const videoFiles = await inspectVideoFiles(fullChildPath);
				discovered.push({
					folderPath: fullChildPath,
					folderName: entry.name,
					parsedInfo: parsed,
					videoFiles
				});

				if (onProgress) {
					onProgress({
						message: `Found ${entry.name}`,
						count: discovered.length
					});
				}
				// Don't recurse deeper into this specific movie folder
				continue;
			}

			// Otherwise, treat as a category or subfolder (e.g. 'Sci-Fi' or 'Action') and traverse deeper
			await traverse(fullChildPath, depth + 1);
		}
	}

	await traverse(rootPath, 0);
	return discovered;
}
