import { Plugin, WorkspaceLeaf } from "obsidian";
import { around } from "monkey-around";
import { BetterLockSettings, DEFAULT_SETTINGS } from "./interface";
import { BetterLockSettingsTab } from "./settings";
import i18next from "i18next";
import { resources, translationLanguage } from "./i18n/i18next";


export default class BetterLock extends Plugin {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	activeMonkeys: Record<string, any> = {};
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	originalFunction: Record<string, any> = {};
	settings: BetterLockSettings;

	logs(error: undefined | boolean, ...message: unknown[]) {
		if (this.settings.logs) {
			let callFunction = new Error().stack?.split("\n")[2].trim();
			callFunction = callFunction?.substring(callFunction.indexOf("at ") + 3, callFunction.lastIndexOf(" ("));
			callFunction = callFunction?.replace("Object.callback", "");
			callFunction = callFunction ? callFunction : "main";
			callFunction = callFunction === "eval" ? "main" : callFunction;
			if (error) {
				console.error(`[${this.manifest.name}] [${callFunction}]`, ...message);
			} else {
				console.log(`[${this.manifest.name}] [${callFunction}]`, ...message);
			}
		}
		return;
	}

	removeOriginalFunction(leaf: WorkspaceLeaf) {
		/**
		 * Remove only if the function is not already overwritten
		 */
		const isAlreadyOverwritten = this.checkCanvasMethods(leaf);
		if (isAlreadyOverwritten) {
			this.logs(undefined, "Function already overwritten, skipping");
			return;
		}
		//@ts-ignore
		const canvas = leaf.view.canvas;
		const reset = () => {return;};
		if (this.settings.select) {
			canvas.handleSelectionDrag = reset;
			canvas.handleDragToSelect = reset;
		}
		if (this.settings.zoom) {
			canvas.zoomBy = reset;
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

	restoreOriginalFunction(leaf: WorkspaceLeaf) {
		const isAlreadyOverwritten = this.checkCanvasMethods(leaf);
		if (!isAlreadyOverwritten) {
			this.logs(undefined, "Function not overwritten, no need to restore");
			return;
		}
		//@ts-ignore
		const canvas = leaf.view.canvas;
		if (this.settings.select) {
			canvas.handleSelectionDrag = this.originalFunction.handleSelectionDrag;
			canvas.handleDragToSelect = this.originalFunction.handleDragToSelect;
		}
		if (this.settings.zoom) {
			canvas.zoomBy = this.originalFunction.zoomBy;
		}
		if (this.settings.createFile) {
			canvas.createFileNode = this.originalFunction.createFileNode;
			canvas.createTextNode = this.originalFunction.createTextNode;
			canvas.createFileNodes = this.originalFunction.createFileNodes;
			canvas.dragTempNode = this.originalFunction.dragTempNode;
		}
		if (this.settings.scroll) {
			canvas.isDragging = false;
			canvas.onTouchdown = this.originalFunction.onTouchdown;
		}
	}

	saveOriginalFunction(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		
		const isAlreadyOverwritten = this.checkCanvasMethods(leaf);
		const prototype = Object.getPrototypeOf(canvas);
		
		if (!isAlreadyOverwritten) {
			this.logs(undefined, "Saving original function");
			if (this.settings.select) {
				this.originalFunction.handleSelectionDrag = prototype.handleSelectionDrag;
				this.originalFunction.handleDragToSelect = prototype.handleDragToSelect;
			}
			if (this.settings.zoom) {
				this.originalFunction.zoomBy = prototype.zoomBy;
			}
			if (this.settings.createFile) {
				this.originalFunction.createFileNode = prototype.createFileNode;
				this.originalFunction.createTextNode = prototype.createTextNode;
				this.originalFunction.createFileNodes = prototype.createFileNodes;
				this.originalFunction.dragTempNode = prototype.dragTempNode;
			}
			if (this.settings.scroll) {
				this.originalFunction.onTouchdown = prototype.onTouchdown;
			}
		}
		return;
	}

	checkCanvasMethods(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		const canvasMethods = {
			handleSelectionDrag: canvas.handleSelectionDrag,
			handleDragToSelect: canvas.handleDragToSelect,
			zoomBy: canvas.zoomBy,
			createFileNode: canvas.createFileNode,
			createTextNode: canvas.createTextNode,
			createFileNodes: canvas.createFileNodes,
			dragTempNode: canvas.dragTempNode,
		};
		const isAlreadyOverwritten= Object.values(canvasMethods).some((value) => { return value.toString().replaceAll(" ", "").replaceAll("\n", "") === "()=>{return;}"; });
		this.logs(undefined, "Methods are already overwritten ?", isAlreadyOverwritten);
		return isAlreadyOverwritten;
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
								this.logs(undefined, "Camera locked");
								this.saveOriginalFunction(leaf);
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
			`CameraLockCanvas v.${this.manifest.version} loaded.`
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
				this.saveOriginalFunction(leaf);
				this.removeOriginalFunction(leaf);
			}
		}));
	}
	

	onunload() {
		console.log(
			`CameraLockCanvas v.${this.manifest.version} unloaded.`
		);
		for (const monkey of Object.values(this.activeMonkeys)) {
			monkey();
		}
		this.activeMonkeys = {};
		this.originalFunction = {};
		this.logs(undefined, "Internal data cleaned");
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
}
