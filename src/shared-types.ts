import * as vscode from "vscode";

export type Manager = "state" | "settings";

export interface DecorationTypeSet {
    manager: vscode.TextEditorDecorationType;
    variable: vscode.TextEditorDecorationType;
}

export interface DecorationTypeManager {
    state: DecorationTypeSet;
    settings: DecorationTypeSet;
}