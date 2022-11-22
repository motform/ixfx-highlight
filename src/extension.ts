import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager, DecorationTypeManager } from "./shared-types";

let decorationTypeManager: DecorationTypeManager;

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

export function activate(context: vscode.ExtensionContext) {
	const activeEditor = vscode.window.activeTextEditor;
	decorationTypeManager = decorate.makeDecorationTypeManager(); // NOTE: We are currently only making this at activation time, which means that we don't respond to colorTheme changes. There is probably an event we can listen to for that later.

	if (activeEditor) {
		updateHighlight(activeEditor, context, decorationTypeManager);
	}

	vscode.window.onDidChangeActiveTextEditor(editor => updateHighlight(editor, context, decorationTypeManager), null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			updateHighlight(activeEditor, context, decorationTypeManager);
		}
	}, null, context.subscriptions);

	context.subscriptions.push(
		vscode.commands.registerCommand("ixfx-highlight.highlight", () => {
			// vscode.window.showInformationMessage("The highlight function!");
			updateHighlight(activeEditor, context, decorationTypeManager);
		}),
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	decorate.remove(decorationTypeManager);
}
