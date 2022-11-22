import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager, DecorationTypeManager } from "./shared-types";

let decorationTypeManager: DecorationTypeManager;
let active = false; // Refactor this into something transcational/a centralised state
let statusBarItem: vscode.StatusBarItem;

function updateHighlight(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext, decorationTypeManager: DecorationTypeManager) {
	if (!editor) {
		console.error("No editor found in context", context);
		return;
	}

	const managers: Manager[] = ["state", "settings"];
	for (const manager of managers) {
		{ // Decorate variables 
			const variables = find.variablesDestructuredFrom(manager, editor);
			const ranges = find.rangesMatching(variables, editor);
			decorate.identifiersIn(ranges, decorationTypeManager[manager].variable, manager, editor);
		}

		{ // Decorate managers 
			const ranges = find.rangesMatching(find[manager], editor);
			console.log(manager, ranges);
			decorate.identifiersIn(ranges, decorationTypeManager[manager].manager, manager, editor);
		}
	}
}

function triggerUpdateHighlight(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext) {
	if (active) updateHighlight(editor, context, decorationTypeManager);
}

function disableHighlights(decorationTypeManager: DecorationTypeManager) {
	decorate.remove(decorationTypeManager);
	active = false;
}

function enableHighlights(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext) {
	if (!active) {
		decorationTypeManager = decorate.makeDecorationTypeManager(); // NOTE: We are currently only making this at activation time, which means that we don't respond to colorTheme changes. There is probably an event we can listen to for that later.
		active = true;
	}
	updateHighlight(editor, context, decorationTypeManager);
}

function updateStatusBarItem() {
	if (active) {
		statusBarItem.text = `$(eye-closed) ixfx`;
	} else {
		statusBarItem.text = `$(eye) ixfx`;
	}

	statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
	const activeEditor = vscode.window.activeTextEditor;

	{ // Status bar item
		statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
		statusBarItem.command = "ixfx-highlight.toggle";
		context.subscriptions.push(statusBarItem);
		updateStatusBarItem();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		triggerUpdateHighlight(editor, context);
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateHighlight(activeEditor, context);
		}
	}, null, context.subscriptions);

	context.subscriptions.push(

		vscode.commands.registerCommand("ixfx-highlight.enable", () => {
			enableHighlights(activeEditor, context);
			updateStatusBarItem();
		}),

		vscode.commands.registerCommand("ixfx-highlight.disable", () => {
			disableHighlights(decorationTypeManager);
			updateStatusBarItem();
		}),

		vscode.commands.
			registerCommand("ixfx-highlight.toggle", () => {
				if (active) {
					disableHighlights(decorationTypeManager);
				} else {
					enableHighlights(activeEditor, context);
				}

				updateStatusBarItem();
			}),

	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	decorate.remove(decorationTypeManager);
	statusBarItem.hide();
}
