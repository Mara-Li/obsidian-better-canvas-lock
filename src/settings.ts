import { PluginSettingTab, App, Setting } from "obsidian";
import CameraLockCanvas from "./main";
import i18next from "i18next";
export class CameraLockCanvasSettingsTab extends PluginSettingTab {
	plugin: CameraLockCanvas;
	constructor(app: App, plugin: CameraLockCanvas) {
		super(app, plugin);
		this.plugin = plugin;
	}
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("p", { text: i18next.t("settings.warning"), cls: "warning"});

		new Setting(containerEl)
			.setName(i18next.t("settings.zoom"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.zoom)
					.onChange(async (value) => {
						this.plugin.settings.zoom = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName(i18next.t("settings.drag"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.createFile)
					.onChange(async (value) => {
						this.plugin.settings.createFile = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName(i18next.t("settings.select"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.select)
					.onChange(async (value) => {
						this.plugin.settings.select = value;
						await this.plugin.saveSettings();
					})
			);

	}
}
