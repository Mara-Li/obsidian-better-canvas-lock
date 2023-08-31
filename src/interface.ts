export interface BetterLockSettings {
	zoom: boolean;
	createFile: boolean;
	select: boolean;
	scroll: boolean;
	logs: boolean;
}
export const DEFAULT_SETTINGS: BetterLockSettings = {
	zoom: true,
	createFile: true,
	select: true,
	scroll: true,
	logs: false,
};
