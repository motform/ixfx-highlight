import * as vscode from "vscode";
import * as find from "./find";
import * as decorate from "./decorate";
import { Manager, Decorations, DecorationConfiguration } from "./shared-types";

interface State {
    context?: vscode.ExtensionContext;
    decorationConfiguration: DecorationConfiguration;
    decorations: Decorations;
    editor?: vscode.TextEditor;
    enabled: boolean;
    enabledFrom: "main" | "lens" | "disabled";
    lensEnabled: boolean;
    lensStatusBarItem: vscode.StatusBarItem;
    mainStatusBarItem: vscode.StatusBarItem;
}

let state: State = Object.freeze({
    decorationConfiguration: vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration, // This means we are dealing with a proxy object, which I'm not all to familiar with, but I'm sure there is some quirk somewhere that I'm blissfully (?) unaware off.
    decorations: decorate.makeDecorations(vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration), // TODO: This is a bit hacky/ugly and should probably be done in activate()
    enabled: false,
    enabledFrom: "main",
    lensEnabled: false,
    lensStatusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 26),
    mainStatusBarItem: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 25),
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
    const { editor, context, decorations, lensEnabled } = state;
    if (!editor) {
        console.error("No editor found in context", context);
        return;
    }

    const managers: Manager[] = ["state", "settings"];
    for (const manager of managers) {

        { // Decorate variables 
            const variables = find.destructuredVaraibles(manager, editor);
            const ranges = find.ranges(variables, editor);
            decorate.identifiers(ranges, decorations[manager].variable, manager, editor);
        }

        { // Decorate managers 
            const ranges = find.ranges(find[manager], editor);
            decorate.identifiers(ranges, decorations[manager].manager, manager, editor);
        }
    }

    if (lensEnabled) { // Dim the text if lens is enabled
        const range = find.entireText(editor);
        decorate.dim(range, decorations, editor);
    }
}

function enableHighlights(): void {
    const { enabled, decorationConfiguration } = state;

    if (enabled) return;

    updateState({
        enabled: true,
        enabledFrom: "main",
        decorations: decorate.makeDecorations(decorationConfiguration),
    });

    updateHighlight();
    updateStatusBarItems();
}

function disableHighlights(): void {
    updateState({
        enabled: false,
        enabledFrom: "disabled",
    });

    decorate.removeAll(state.decorations);
    updateStatusBarItems();
}

function updateStatusBarItems(): void {
    const { mainStatusBarItem, enabled, lensStatusBarItem, lensEnabled } = state;
    mainStatusBarItem.text = enabled ? `$(eye-closed) ixfx` : `$(eye) ixfx`;
    lensStatusBarItem.text = lensEnabled ? `$(filter-filled)` : `$(filter)`;
}

function showStatusBarItems(): void {
    const { mainStatusBarItem, lensStatusBarItem } = state;
    mainStatusBarItem.show();
    lensStatusBarItem.show();
}

function hideStatusBarItems(): void {
    const { mainStatusBarItem, lensStatusBarItem } = state;
    mainStatusBarItem.hide();
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
        const { mainStatusBarItem, lensStatusBarItem } = state;

        mainStatusBarItem.command = "ixfx-highlight.toggle";
        lensStatusBarItem.command = "ixfx-highlight.toggleLens";
        context.subscriptions.push(mainStatusBarItem, lensStatusBarItem);
        updateStatusBarItems();
        supportedLangauge() ? showStatusBarItems() : hideStatusBarItems();
    }


    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("ixfx-highlight.color")) {
            // Input validation for this is done inside of the configuration.
            // This might mean that we can run of an incorrect hex color,
            // but I think that is OK in this limited prototype.
            const decorationConfiguration = vscode.workspace.getConfiguration("ixfx-highlight").get("color") as DecorationConfiguration;

            updateState({
                decorationConfiguration,
                decorations: decorate.makeDecorations(decorationConfiguration,),
            });
        }
    }, null, context.subscriptions);


    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateState({ editor: editor });
        const { enabled, decorationConfiguration, decorations } = state;

        if (editor && supportedLangauge()) {
            if (enabled) {
                updateState({ decorations: decorate.makeDecorations(decorationConfiguration) });
                updateHighlight();
            }

            updateStatusBarItems();
            showStatusBarItems();
        } else {
            decorate.removeAll(decorations);
            hideStatusBarItems();
        }
    }, null, context.subscriptions);

    vscode.window.onDidChangeActiveColorTheme(() => {
        const { enabled, decorationConfiguration, decorations } = state;

        if (enabled && supportedLangauge()) {
            // We need to make a new decorationTypeManager to get the dark-mode colors
            decorate.removeAll(decorations);
            updateState({ decorations: decorate.makeDecorations(decorationConfiguration) });
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
            const { enabled, enabledFrom, lensEnabled, decorations, decorationConfiguration } = state;

            if (supportedLangauge()) {
                if (lensEnabled) {
                    if (enabledFrom === "lens") {
                        updateState({ enabled: false, lensEnabled: false });
                        decorate.removeAll(decorations);
                    } else {
                        updateState({ lensEnabled: false });
                        decorate.removeDim(decorations);
                    }
                } else {
                    updateState({ lensEnabled: true });
                    decorations.dim = decorate.dimmingDecoration();

                    if (!enabled) { // Enable all the highlights when turning the lens on
                        updateState({
                            enabled: true,
                            decorations: decorate.makeDecorations(decorationConfiguration),
                            enabledFrom: "lens",
                        });
                    }

                    updateHighlight();
                }

                updateStatusBarItems();
                showStatusBarItems();

            } else {
                showNotSupportedError();
            }
        }),
    );
}

export function deactivate(): void {
    const { decorations: decorationTypeManager } = state;
    decorate.removeAll(decorationTypeManager);
    hideStatusBarItems();
}
