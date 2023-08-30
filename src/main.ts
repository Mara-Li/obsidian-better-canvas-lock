import { Plugin } from "obsidian";
import { CameraLockCanvasSettingsTab } from "./settings";
import { CameraLockCanvasSettings, DEFAULT_SETTINGS } from "./interface";
import { CameraLockCanvasModals } from "./modals";
import i18next from "i18next";
import { resources, translationLanguage } from "./i18n/i18next";
export default class CameraLockCanvas extends Plugin {
	settings: CameraLockCanvasSettings;
	async onload() {
		console.log(
			`CameraLockCanvas v.${this.manifest.version} (lang: ${translationLanguage}) loaded.`
		);
		i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources: resources,
			returnNull: false,
		});
		await this.loadSettings();
		this.addSettingTab(new CameraLockCanvasSettingsTab(this.app, this));
		this.addCommand({
			id: "open-CameraLockCanvas-modal",
			name: "Open CameraLockCanvas Modal",
			callback: () => {
				new CameraLockCanvasModals(this.app, this).open();
			},
		});
	}
	onunload() {
		console.log(
			`CameraLockCanvas v.${this.manifest.version} (lang: ${translationLanguage}) unloaded.`
		);
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
