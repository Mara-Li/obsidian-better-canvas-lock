import { ItemView, Plugin, WorkspaceLeaf } from "obsidian";
import { around } from "monkey-around";

export default class CameraLockCanvas extends Plugin {
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	active_monkeys: Record<string, any> = {};
	//eslint-disable-next-line @typescript-eslint/no-explicit-any
	originalFunction: Record<string, any> = {};
	saved: boolean;

	removeHandle(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		canvas.handleSelectionDrag = () => {return;};
		canvas.handleDragToSelect = () => {return;};
	}

	restoreHandle(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		canvas.handleSelectionDrag = this.originalFunction.handleSelectionDrag;
		canvas.handleDragToSelect = this.originalFunction.handleDragToSelect;
	}

	saveHandle(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		if (!this.saved) {
			this.originalFunction.handleSelectionDrag = canvas.handleSelectionDrag;
			this.originalFunction.handleDragToSelect = canvas.handleDragToSelect;
			this.saved = true;
		}

	}

	removeCamera(leaf: WorkspaceLeaf) {
		//@ts-ignore
		const canvas = leaf.view.canvas;
		console.log(canvas);
		try {
			return around(canvas, {
				setReadonly: (oldMethod) => {
					return (read_only: boolean) => {
						try {
							oldMethod?.apply(canvas, [read_only]);
							if (read_only) {
								console.log("Camera locked");
								this.saveHandle(leaf);
								this.removeHandle(leaf);
							} else {
								console.log("Camera unlocked");
								this.restoreHandle(leaf);
							}
						} catch (e) {
							//ignore
						}
					};
				}
			});
		} catch (e) {
			console.log(e);
		}
	}

	async onload() {
		console.log(
			`CameraLockCanvas v.${this.manifest.version} loaded.`
		);
		
		this.registerEvent(this.app.workspace.on("file-open", (file) => {
			if (!file) {
				for (const monkey of Object.values(this.active_monkeys)) {
					monkey();
				}
				this.active_monkeys = {};
				return;
			}
			if (file.extension !== "canvas") {
				return;
			}
			//get active leaf
			const activeView = this.app.workspace.getActiveViewOfType(ItemView);
			if (activeView && activeView?.getViewType() === "canvas") {
				//@ts-ignore
				const id = activeView.leaf.id;
				//@ts-ignore
				const canvas = activeView.leaf.view.canvas;
				this.active_monkeys[id] = this.removeCamera(activeView.leaf);
				if (canvas.readonly) {
					this.saveHandle(activeView.leaf);
					this.removeHandle(activeView.leaf);
				} 
			}
		}));

		
		
	}
	onunload() {
		console.log(
			`CameraLockCanvas v.${this.manifest.version} unloaded.`
		);
		for (const monkey of Object.values(this.active_monkeys)) {
			monkey();
		}
		this.active_monkeys = {};
	}

	
}
