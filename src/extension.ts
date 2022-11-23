import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager, DecorationTypeManager } from "./shared-types";

interface State {
    active: boolean;
    editor?: vscode.TextEditor;
    context?: vscode.ExtensionContext;
    decorationTypeManager: DecorationTypeManager;
    statusBarItem: vscode.StatusBarItem;
}

let state: State = Object.freeze({
    active: false,
    colorTheme: vscode.window.activeColorTheme.kind,
    decorationTypeManager: decorate.makeDecorationTypeManager(),
    statusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100),
});

function updateState(newState: Partial<State>): void {
    state = Object.freeze({ ...state, ...newState });
}

function updateHighlight(): void {
    const { editor, context, decorationTypeManager } = state;
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
            decorate.identifiersIn(ranges, decorationTypeManager[manager].manager, manager, editor);
        }
    }
}

function triggerUpdateHighlight(): void {
    if (state.active) updateHighlight();
}

function disableHighlights(): void {
    decorate.remove(state.decorationTypeManager);
    updateState({ active: false });
}

function enableHighlights(): void {
    if (!state.active) updateState({ active: true, decorationTypeManager: decorate.makeDecorationTypeManager() });
    updateHighlight();
}

function updateStatusBarItem(): void {
    const { statusBarItem } = state;
    statusBarItem.text = (state.active) ? `$(eye-closed) ixfx` : `$(eye) ixfx`;
    statusBarItem.show();
}

export function activate(context: vscode.ExtensionContext) {
    updateState({ context: context, editor: vscode.window.activeTextEditor });

    { // Status bar item
        state.statusBarItem.command = "ixfx-highlight.toggle";
        context.subscriptions.push(state.statusBarItem);
        updateStatusBarItem();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) updateState({ editor: editor });
        triggerUpdateHighlight();
    }, null, context.subscriptions);

    vscode.window.onDidChangeActiveColorTheme(() => {
        updateState({ decorationTypeManager: decorate.makeDecorationTypeManager() });
        triggerUpdateHighlight();
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (state.editor && event.document === state.editor.document) {
            triggerUpdateHighlight();
        }
    }, null, context.subscriptions);

    context.subscriptions.push(

        vscode.commands.registerCommand("ixfx-highlight.enable", () => {
            enableHighlights();
            updateStatusBarItem();
        }),

        vscode.commands.registerCommand("ixfx-highlight.disable", () => {
            disableHighlights();
            updateStatusBarItem();
        }),

        vscode.commands.registerCommand("ixfx-highlight.toggle", () => {
            state.active ? disableHighlights() : enableHighlights();
            updateStatusBarItem();
        }),
    );
}

export function deactivate(): void {
    const { statusBarItem, decorationTypeManager } = state;
    decorate.remove(decorationTypeManager);
    statusBarItem.hide();
}
