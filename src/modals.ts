import { Modal, App } from "obsidian";
import i18next from "i18next";
export class CameraLockCanvasModals extends Modal {
	constructor(app: App) {
		super(app);
	}
	onOpen() {
		let { contentEl } = this;
		contentEl.setText("Woah!");
	}
	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
