import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager } from "./shared-types";


function updateHighlight(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext) {
	if (!editor) {
		console.error("No editor found in context", context);
		return;
	}

	const managers: Manager[] = ["state", "settings"];
	for (const manager of managers) {
		const identifiers = find.identifiersDestructuredFrom(manager, editor);
		const ranges = find.rangesMatching(identifiers, editor);
		decorate.identifiersIn(ranges, manager, editor);
	}
}

export function activate(context: vscode.ExtensionContext) {
	const activeEditor = vscode.window.activeTextEditor;

	context.subscriptions.push(
		vscode.commands.registerCommand("ixfx-highlight.highlight", () => {
			// vscode.window.showInformationMessage("The highlight function!");
			updateHighlight(activeEditor, context);
		}),
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }
