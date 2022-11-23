import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager, DecorationTypeManager } from "./shared-types";


// NOTE: It might be an idea to put `editor` in the state, as we pass it around to everything.
//       Dito maybe context?
//       Would have to maybe make things optional as well, with the fancy syntax etc
interface State {
    active: boolean;
    // context?: vscode.ExtensionContext;
    // editor?: vscode.TextEditor;
    decorationTypeManager: DecorationTypeManager;
    statusBarItem: vscode.StatusBarItem;
}

let state: State = Object.freeze({
    active: false,
    decorationTypeManager: decorate.makeDecorationTypeManager(),
    statusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100),
});

function updateState(newState: Partial<State>): void {
    state = Object.freeze({ ...state, ...newState });
}

function updateHighlight(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext): void {
    if (!editor) {
        console.error("No editor found in context", context);
        return;
    }

    const managers: Manager[] = ["state", "settings"];
    for (const manager of managers) {
        { // Decorate variables 
            const variables = find.variablesDestructuredFrom(manager, editor);
            const ranges = find.rangesMatching(variables, editor);
            decorate.identifiersIn(ranges, state.decorationTypeManager[manager].variable, manager, editor);
        }

        { // Decorate managers 
            const ranges = find.rangesMatching(find[manager], editor);
            decorate.identifiersIn(ranges, state.decorationTypeManager[manager].manager, manager, editor);
        }
    }
}

function triggerUpdateHighlight(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext): void {
    if (state.active) updateHighlight(editor, context);
}

function disableHighlights(): void {
    decorate.remove(state.decorationTypeManager);
    updateState({ active: false });
}

function enableHighlights(editor: vscode.TextEditor | undefined, context: vscode.ExtensionContext): void {
    if (!state.active) {
        updateState({
            decorationTypeManager: decorate.makeDecorationTypeManager(),  // NOTE: We are currently only making this at activation time, which means that we don't respond to colorTheme changes. There is probably an event we can listen to for that later.
            active: true,
        });
    }
    updateHighlight(editor, context);
}

function updateStatusBarItem(): void {
    state.statusBarItem.text = (state.active) ? `$(eye-closed) ixfx` : `$(eye) ixfx`;
    state.statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
    const activeEditor = vscode.window.activeTextEditor;

    { // Status bar item
        state.statusBarItem.command = "ixfx-highlight.toggle";
        context.subscriptions.push(state.statusBarItem);
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
            disableHighlights();
            updateStatusBarItem();
        }),

        vscode.commands.registerCommand("ixfx-highlight.toggle", () => {
            if (state.active) disableHighlights();
            else enableHighlights(activeEditor, context);

            updateStatusBarItem();
        }),

    );
}

// This method is called when your extension is deactivated
export function deactivate(): void {
    decorate.remove(state.decorationTypeManager);
    state.statusBarItem.hide();
}
