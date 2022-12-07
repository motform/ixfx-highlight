import * as vscode from "vscode";

export type Manager = "state" | "settings";

export interface DecorationSet {
    manager: vscode.TextEditorDecorationType;
    variable: vscode.TextEditorDecorationType;
}

export interface Decorations {
    dim: vscode.TextEditorDecorationType;
    state: DecorationSet;
    settings: DecorationSet;
}

export type Prominence = "Low" | "Medium" | "High";

export type Color = `#${string}`;

export interface DecorationConfiguration {
    prominence: Prominence;
    state: { light: Color, dark: Color };
    settings: { light: Color, dark: Color };
}