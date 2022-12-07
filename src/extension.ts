import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager, DecorationTypeManager, DecorationConfiguration } from "./shared-types";

interface State {
    context?: vscode.ExtensionContext;
    decorationConfiguration: DecorationConfiguration;
    decorationTypeManager: DecorationTypeManager;
    editor?: vscode.TextEditor;
    enabled: boolean;
    lensEnabled: boolean;
    statusBarItem: vscode.StatusBarItem;
    lensStatusBarItem: vscode.StatusBarItem;
}

let state: State = Object.freeze({
    enabled: false,
    lensEnabled: false,
    decorationTypeManager: decorate.makeDecorations(vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration), // TODO: This is a bit hacky/ugly and should probably be done in activate()
    statusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 25),
    lensStatusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 26),
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
    const { editor, context, decorationTypeManager, lensEnabled } = state;
    if (!editor) {
        console.error("No editor found in context", context);
        return;
    }

    if (lensEnabled) { // Gray out the text if lens is enabled
        const range = find.entireText(editor);
        decorate.dim(range, decorationTypeManager, editor);
    }

    const managers: Manager[] = ["state", "settings"];
    for (const manager of managers) {

        { // Decorate variables 
            const variables = find.variablesDestructuredFrom(manager, editor);
            const ranges = find.rangesMatching(variables, editor);
            decorate.identifiers(ranges, decorationTypeManager[manager].variable, manager, editor);
        }

        { // Decorate managers 
            const ranges = find.rangesMatching(find[manager], editor);
            decorate.identifiers(ranges, decorationTypeManager[manager].manager, manager, editor);
        }
    }
}

function enableHighlights(): void {
    const { enabled, decorationConfiguration } = state;

    if (enabled) return;

    updateState({ enabled: true, decorationTypeManager: decorate.makeDecorations(decorationConfiguration) });
    updateHighlight();
    updateStatusBarItem();
}

function disableHighlights(): void {
    updateState({ enabled: false });
    decorate.remove(state.decorationTypeManager);
    updateStatusBarItem();
}

function updateStatusBarItem(): void {
    const { statusBarItem, enabled, lensStatusBarItem, lensEnabled } = state;
    statusBarItem.text = enabled ? `$(eye-closed) ixfx` : `$(eye) ixfx`;
    lensStatusBarItem.text = lensEnabled ? `$(filter)` : `$(filter-filled)`;
}

function showStatusBarItem(): void {
    const { statusBarItem, lensStatusBarItem } = state;
    statusBarItem.show();
    lensStatusBarItem.show();
}

function hideStatusBarItem(): void {
    const { statusBarItem, lensStatusBarItem } = state;
    statusBarItem.hide();
    lensStatusBarItem.hide();
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
        const { statusBarItem, lensStatusBarItem } = state;

        statusBarItem.command = "ixfx-highlight.toggle";
        lensStatusBarItem.command = "ixfx-highlight.toggleLens";
        context.subscriptions.push(statusBarItem, lensStatusBarItem);
        updateStatusBarItem();
        supportedLangauge() ? showStatusBarItem() : hideStatusBarItem();
    }


    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("ixfx-highlight.color")) {
            // Input validation for this is done inside of the configuration.
            // This might mean that we can run of an incorrect hex color,
            // but I think that is OK in this limited prototype.
            const decorationConfiguration = vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration;

            updateState({
                decorationConfiguration,
                decorationTypeManager: decorate.makeDecorations(decorationConfiguration),
            });
        }
    }, null, context.subscriptions);


    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateState({ editor: editor });
        const { enabled, decorationConfiguration, decorationTypeManager } = state;

        if (editor && supportedLangauge()) {
            if (enabled) {
                updateState({ decorationTypeManager: decorate.makeDecorations(decorationConfiguration) });
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
            updateState({ decorationTypeManager: decorate.makeDecorations(decorationConfiguration) });
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

        vscode.commands.registerCommand("ixfx-highlight.toggleLens", () => {
            const { lensEnabled, decorationTypeManager } = state;
            if (supportedLangauge()) {
                if (lensEnabled) {
                    updateState({ lensEnabled: false });
                    decorationTypeManager.dim.dispose();
                } else {
                    updateState({ lensEnabled: true });
                    decorationTypeManager.dim = decorate.dimmingDecoration();
                }

                updateStatusBarItem();
                showStatusBarItem();
                updateHighlight();
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
