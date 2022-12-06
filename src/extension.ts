import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager, DecorationTypeManager, DecorationConfiguration } from "./shared-types";

interface State {
    enabled: boolean;
    editor?: vscode.TextEditor;
    context?: vscode.ExtensionContext;
    decorationConfiguration: DecorationConfiguration;
    decorationTypeManager: DecorationTypeManager;
    statusBarItem: vscode.StatusBarItem;
}

let state: State = Object.freeze({
    enabled: false,
    decorationTypeManager: decorate.makeDecorationTypeManagerWith(vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration), // TODO: This is a bit hacky/ugly and should probably be done in activate()
    statusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 25),
    decorationConfiguration: vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration, // This means we are dealing with a proxy object, which I'm not all to familiar with, but I'm sure there is some quirk somewhere that I'm blissfully (?) unaware off.
});

interface Settings {
    allowedLangauges: Set<string>;
}

const settings: Readonly<Settings> = {
    allowedLangauges: new Set(["javascript", "javascriptreact", "typescript", "typescriptreact"]),
};

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

function enableHighlights(): void {
    const { enabled, decorationConfiguration } = state;

    if (enabled) return;

    updateState({ enabled: true, decorationTypeManager: decorate.makeDecorationTypeManagerWith(decorationConfiguration) });
    updateHighlight();
    updateStatusBarItem();
}

function disableHighlights(): void {
    updateState({ enabled: false });
    decorate.remove(state.decorationTypeManager);
    updateStatusBarItem();
}

function updateStatusBarItem(): void {
    const { statusBarItem, enabled } = state;
    statusBarItem.text = enabled ? `$(eye-closed) ixfx` : `$(eye) ixfx`;
}

function showStatusBarItem(): void {
    const { statusBarItem } = state;
    statusBarItem.show();
}

function hideStatusBarItem(): void {
    const { statusBarItem } = state;
    statusBarItem.hide();
}

function supportedLangauge(): boolean {
    const { editor } = state;
    const { allowedLangauges } = settings;
    return allowedLangauges.has(editor?.document.languageId ?? "");
}

function showNotSupportedError(): void {
    vscode.window.showErrorMessage(`${state.editor?.document.languageId} is not supported by ixfx highlight.`);
}

export function activate(context: vscode.ExtensionContext) {
    // We update the state first so that functions that run during setup 
    // that rely on the state get an up-to-date view of the the world.
    updateState({ context: context, editor: vscode.window.activeTextEditor });


    { // Create the status bar item.
        const { statusBarItem } = state;

        statusBarItem.command = "ixfx-highlight.toggle";
        context.subscriptions.push(statusBarItem);
        updateStatusBarItem();
        supportedLangauge() ? showStatusBarItem() : hideStatusBarItem();
    }


    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("ixfx-highlight.color")) {
            const decorationConfiguration = vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration;

            updateState({
                decorationConfiguration,
                decorationTypeManager: decorate.makeDecorationTypeManagerWith(decorationConfiguration),
            });
        }
    }, null, context.subscriptions);


    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateState({ editor: editor });
        const { enabled, decorationConfiguration, decorationTypeManager } = state;

        if (editor && supportedLangauge()) {
            if (enabled) {
                updateState({ decorationTypeManager: decorate.makeDecorationTypeManagerWith(decorationConfiguration) });
                updateHighlight();
            }

            updateStatusBarItem();
            showStatusBarItem();
        } else {
            decorate.remove(decorationTypeManager);
            hideStatusBarItem();
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeActiveColorTheme(() => {
        const { enabled, decorationConfiguration, decorationTypeManager } = state;

        if (enabled && supportedLangauge()) {
            // We need to make a new decorationTypeManager to get the dark-mode colors
            decorate.remove(decorationTypeManager);
            updateState({ decorationTypeManager: decorate.makeDecorationTypeManagerWith(decorationConfiguration) });
            updateHighlight();
        }
    }, null, context.subscriptions);


    vscode.workspace.onDidChangeTextDocument(event => {
        const { editor, enabled } = state;

        if (editor && enabled && event.document === editor.document) {
            updateHighlight();
        }
    }, null, context.subscriptions);


    context.subscriptions.push(

        vscode.commands.registerCommand("ixfx-highlight.enable", () => {
            supportedLangauge() ? enableHighlights() : showNotSupportedError();
        }),

        vscode.commands.registerCommand("ixfx-highlight.disable", () => {
            disableHighlights();
        }),

        vscode.commands.registerCommand("ixfx-highlight.toggle", () => {
            if (supportedLangauge()) {
                state.enabled ? disableHighlights() : enableHighlights();
            } else {
                showNotSupportedError();
            }
        }),
    );
}

export function deactivate(): void {
    const { decorationTypeManager } = state;
    decorate.remove(decorationTypeManager);
    hideStatusBarItem();
}
