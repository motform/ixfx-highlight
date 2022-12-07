import * as vscode from "vscode";

export type Manager = "state" | "settings";

export interface DecorationTypeSet {
    manager: vscode.TextEditorDecorationType;
    variable: vscode.TextEditorDecorationType;
}

export interface DecorationTypeManager {
    dim: vscode.TextEditorDecorationType;
    state: DecorationTypeSet;
    settings: DecorationTypeSet;
}

export type Prominence = "Low" | "Medium" | "High";

export type Color = `#${string}`;

export interface DecorationConfiguration {
    prominence: Prominence;
    state: { light: Color, dark: Color };
    settings: { light: Color, dark: Color };
}