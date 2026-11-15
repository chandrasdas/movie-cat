import { exec, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

/**
 * Normalizes Windows file paths and drive roots
 */
export function normalizeWindowsPath(input: string): string {
	if (!input || !input.trim()) return 'C:\\';
	const clean = input.trim().replace(/\//g, '\\');
	const driveMatch = clean.match(/^([A-Za-z]):\\?$/);
	if (driveMatch) {
		return driveMatch[1].toUpperCase() + ':\\';
	}
	const resolved = path.resolve(clean);
	const resolvedDriveMatch = resolved.match(/^([A-Za-z]):\\?$/);
	if (resolvedDriveMatch) {
		return resolvedDriveMatch[1].toUpperCase() + ':\\';
	}
	return resolved;
}

/**
 * Discovers available Windows drive letters (C:\, D:\, etc.)
 */
export async function getWindowsDrives(): Promise<string[]> {
	const drives: string[] = [];
	for (let i = 65; i <= 90; i++) {
		const driveLetter = String.fromCharCode(i) + ':\\';
		try {
			await fs.access(driveLetter);
			drives.push(driveLetter);
		} catch {
			// Drive not mounted/accessible
		}
	}
	return drives;
}

export interface DirectoryBrowserResult {
	success: boolean;
	currentPath: string;
	parentPath: string | null;
	drives: string[];
	folders: Array<{ name: string; path: string }>;
	error?: string;
}

/**
 * Browses subdirectories within a given path for the in-app folder picker
 */
export async function browseDirectories(targetPath?: string): Promise<DirectoryBrowserResult> {
	const drives = await getWindowsDrives();
	const normalized = normalizeWindowsPath(targetPath || drives[0] || 'C:\\');

	try {
		const entries = await fs.readdir(normalized, { withFileTypes: true });
		const folders: Array<{ name: string; path: string }> = [];

		for (const entry of entries) {
			if (entry.isDirectory()) {
				// Hide Windows recycle bin and system volume info
				if (entry.name.startsWith('$') || entry.name === 'System Volume Information') continue;
				folders.push({
					name: entry.name,
					path: path.join(normalized, entry.name)
				});
			}
		}

		folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

		const isDriveRoot = /^[A-Za-z]:\\?$/.test(normalized);
		const parentPath = isDriveRoot ? null : path.dirname(normalized);

		return {
			success: true,
			currentPath: normalized,
			parentPath,
			drives,
			folders
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Failed to read directory';
		const isDriveRoot = /^[A-Za-z]:\\?$/.test(normalized);
		const parentPath = isDriveRoot ? null : path.dirname(normalized);

		return {
			success: false,
			error: message,
			currentPath: normalized,
			parentPath,
			drives,
			folders: []
		};
	}
}

/**
 * Reveals a folder or file in Windows File Explorer
 */
export async function revealInExplorer(targetPath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(targetPath);
		if (stat.isDirectory()) {
			await execAsync(`explorer.exe "${targetPath}"`);
		} else {
			await execAsync(`explorer.exe /select,"${targetPath}"`);
		}
		return true;
	} catch (err) {
		console.error('Error revealing in explorer:', err);
		return false;
	}
}

/**
 * Opens a media file in the user's default Windows player
 */
export async function playInDefaultPlayer(filePath: string): Promise<boolean> {
	try {
		await execAsync(`start "" "${filePath}"`);
		return true;
	} catch (err) {
		console.error('Error launching media player:', err);
		return false;
	}
}

/**
 * Opens a native Windows Folder Browser Dialog and returns the selected path.
 * Returns null if the user cancelled or if dialog could not be opened.
 */
export async function pickFolderDialog(): Promise<string | null> {
	const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Movie Folder'
$dialog.ShowNewFolderButton = $true
$dialog.AutoUpgradeEnabled = $true
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::WriteLine($dialog.SelectedPath)
}
`;

	try {
		const { stdout } = await execFileAsync(
			'powershell',
			['-NoProfile', '-STA', '-Command', psScript],
			{ timeout: 60000, encoding: 'utf8' }
		);
		const selectedPath = stdout.trim();
		return selectedPath.length > 0 ? selectedPath : null;
	} catch (err) {
		console.error('Error opening folder picker dialog:', err);
		return null;
	}
}
