import { Plugin, WorkspaceLeaf } from "obsidian";
import { around } from "monkey-around";
import { BetterLockSettings, DEFAULT_SETTINGS } from "./interface";
import { BetterLockSettingsTab } from "./settings";
import i18next from "i18next";
import { resources, translationLanguage } from "./i18n/i18next";


export default class BetterLock extends Plugin {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	activeMonkeys: Record<string, any> = {};
	settings: BetterLockSettings;

	logs(error: undefined | boolean, ...message: unknown[]) {
		if (this.settings.logs) {
			let callFunction = new Error().stack?.split("\n")[2].trim();
			callFunction = callFunction?.substring(callFunction.indexOf("at ") + 3, callFunction.lastIndexOf(" ("));
			callFunction = callFunction?.replace("Object.callback", "");
			callFunction = callFunction ? callFunction : "main";
			callFunction = callFunction.contains("eval") ? "main" : callFunction;
			if (error) {
				console.error(`[${this.manifestName()}] [${callFunction}]`, ...message);
			} else {
				console.log(`[${this.manifestName()}] [${callFunction}]`, ...message);
			}
			return;
		}
		return;
	}

	removeOriginalFunction(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		const reset = () => {return;};
		if (this.settings.select) {
			canvas.handleSelectionDrag = reset;
			canvas.handleDragToSelect = reset;
		}
		if (this.settings.zoom) {
			canvas.zoomBy = reset;
			this.disableButton(leaf);
		}
		if (this.settings.createFile) {
			canvas.createTextNode = reset;
			canvas.createFileNode = reset;
			canvas.createFileNodes = reset;
			canvas.dragTempNode = reset;
		}
		if (this.settings.scroll){
			canvas.isDragging = true;
			canvas.onTouchdown = reset;
		}
	}

	disableButton(leaf: WorkspaceLeaf) {
		const buttonPlus = leaf.view.containerEl.querySelector(".canvas-control-item:has(.lucide-plus)");
		const buttonMinus = leaf.view.containerEl.querySelector(".canvas-control-item:has(.lucide-minus)");
		const buttonRotate = leaf.view.containerEl.querySelector(".canvas-control-item:has(.lucide-rotate-cw)");
		if (buttonPlus) {
			buttonPlus.ariaDisabled = "true";
			buttonPlus.classList.add("is-disabled");
		}
		if (buttonMinus) {
			buttonMinus.ariaDisabled = "true";
			buttonMinus.classList.add("is-disabled");
		}
		if (buttonRotate) {
			buttonRotate.ariaDisabled = "true";
			buttonRotate.classList.add("is-disabled");
		}
		
		return;
	}

	enableButton(leaf: WorkspaceLeaf) {
		const buttonPlus = leaf.view.containerEl.querySelector(".canvas-control-item:has(.lucide-plus)");
		const buttonMinus = leaf.view.containerEl.querySelector(".canvas-control-item:has(.lucide-minus)");
		const buttonRotate = leaf.view.containerEl.querySelector(".canvas-control-item:has(.lucide-rotate-cw)");
		if (buttonPlus) {
			buttonPlus.ariaDisabled = "false";
			buttonPlus.classList.remove("is-disabled");
		}
		if (buttonMinus) {
			buttonMinus.ariaDisabled = "false";
			buttonMinus.classList.remove("is-disabled");
		}
		if (buttonRotate) {
			buttonRotate.ariaDisabled = "false";
			buttonRotate.classList.remove("is-disabled");
		}
		return;
	}

	restoreOriginalFunction(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		const prototype = Object.getPrototypeOf(canvas);
		if (this.settings.select) {
			canvas.handleSelectionDrag = prototype.handleSelectionDrag;
			canvas.handleDragToSelect = prototype.handleDragToSelect;
		}
		if (this.settings.zoom) {
			canvas.zoomBy = prototype.zoomBy;
			this.enableButton(leaf);
		}
		if (this.settings.createFile) {
			canvas.createFileNode = prototype.createFileNode;
			canvas.createTextNode = prototype.createTextNode;
			canvas.createFileNodes = prototype.createFileNodes;
			canvas.dragTempNode = prototype.dragTempNode;
		}
		if (this.settings.scroll) {
			canvas.isDragging = false;
			canvas.onTouchdown = prototype.onTouchdown;
		}
	}

	betterLock(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		try {
			return around(canvas, {
				setReadonly: (oldMethod) => {
					return (read_only: boolean) => {
						try {
							oldMethod?.apply(canvas, [read_only]);
							if (read_only) {
								//this.logs(undefined, "Camera locked");
								this.removeOriginalFunction(leaf);
							} else {
								this.logs(undefined, "Camera unlocked");
								this.restoreOriginalFunction(leaf);
							}
						} catch (e) {
							this.logs(true, e);
						}
					};
				}
			});
		} catch (e) {
			this.logs(true, e);
		}
	}

	async onload() {
		console.log(
			`${this.manifestName()} v.${this.manifest.version} loaded.`
		);

		i18next.init({
			lng: translationLanguage,
			fallbackLng: "en",
			resources,
			returnNull: false,
		});


		await this.loadSettings();
		this.addSettingTab(new BetterLockSettingsTab(this.app, this));
		
		this.registerEvent(this.app.workspace.on("active-leaf-change", async (leaf) => {
			if (!leaf) {
				this.logs(undefined, "No file opened, skipping");
				for (const monkey of Object.values(this.activeMonkeys)) {
					monkey();
				}
				this.activeMonkeys = {};
				return;
			}
			const typeLeaf = leaf.view.getViewType();
			if (typeLeaf !== "canvas") {
				this.logs(undefined, "Not a canvas, skipping");
				return;
			}
			//get active leaf
			//@ts-ignore
			const id = leaf.id;
			//@ts-ignore
			const canvas = leaf.view.canvas;
			this.activeMonkeys[id] = this.betterLock(leaf);
			if (canvas.readonly) {
				this.logs(undefined, "Camera locked");
				this.removeOriginalFunction(leaf);
			}
		}));
	}
	

	onunload() {
		console.log(
			`${this.manifestName()} v.${this.manifest.version} unloaded.`
		);
		for (const monkey of Object.values(this.activeMonkeys)) {
			monkey();
		}
		this.activeMonkeys = {};
		this.logs(undefined, "Internal data cleaned");
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Display the manifest name without spaces
	 * @returns string - manifest name without spaces
	 */
	manifestName() {
		return this.manifest.name.replaceAll(/\s+/g, "");
	}
	
}

