import * as vscode from "vscode";
import { Manager, DecorationConfiguration, Decorations, Color } from "./shared-types";

/**
 * Return a hexadecimal CSS color with opacity appended.
 * It really does very little.
 */
function hexColorWithOpacity(hexColor: Color, opacity: number): Color {
    return `${hexColor}${opacity.toString()}`;
}


/**
 * Return decoration appropriate for manager and type.
 */
function makeDecorationType(identiferType: "variable" | "manager", manager: Manager, decorationConfiguration: DecorationConfiguration): vscode.TextEditorDecorationType {
    const baseColor = decorationConfiguration[manager];
    const isVariable = identiferType === "variable";

    let opacity: [number, number];
    switch (decorationConfiguration.prominence) {
        case "Low":
            opacity = isVariable ? [10, 11] : [30, 31]; break;
        case "Medium":
            opacity = isVariable ? [20, 21] : [40, 41]; break;
        case "High":
            opacity = isVariable ? [30, 31] : [60, 61]; break;
    }

    const options: vscode.DecorationRenderOptions = {
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "3px",
        overviewRulerColor: baseColor.light,
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        opacity: "100%",
        light: {
            borderColor: hexColorWithOpacity(baseColor.light, opacity[1]),
            backgroundColor: hexColorWithOpacity(baseColor.light, opacity[0]),
        },
        dark: {
            borderColor: hexColorWithOpacity(baseColor.dark, opacity[1]),
            backgroundColor: hexColorWithOpacity(baseColor.dark, opacity[0]),
        },
    };

    return vscode.window.createTextEditorDecorationType(options);
}

export function dimmingDecoration(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
        opacity: "50%",
    });
}

export function makeDecorations(decorationConfiguration: DecorationConfiguration): Decorations {
    return {
        dim: dimmingDecoration(),
        settings: {
            manager: makeDecorationType("manager", "settings", decorationConfiguration),
            variable: makeDecorationType("variable", "settings", decorationConfiguration),
        },
        state: {
            manager: makeDecorationType("manager", "state", decorationConfiguration),
            variable: makeDecorationType("variable", "state", decorationConfiguration),
        },
    };
}

export function identifiers(ranges: vscode.Range[], decorationType: vscode.TextEditorDecorationType, manager: Manager, editor: vscode.TextEditor): void {
    if (ranges.length === 0) return;

    const decorations = ranges.map(range => ({ range: range, hoverMessage: `Originates from ${manager}.` }));
    editor.setDecorations(decorationType, decorations);
}


export function dim(range: vscode.Range, decorations: Decorations, editor: vscode.TextEditor): void {
    editor.setDecorations(decorations.dim, [range]);
}

/**
 * Dispose of the decorationTypes. You cannot re-use disposed types with `editor.setDecorations`, you will have to define new ones.
 * These are hard coded as TS got mad about nested Object.entries().
 */
export function removeAll(decorations: Decorations): void {
    if (!decorations) return;

    decorations.dim.dispose();
    decorations.settings.manager.dispose();
    decorations.settings.variable.dispose();
    decorations.state.manager.dispose();
    decorations.state.variable.dispose();
}

export function removeDim(decorations: Decorations): void {
    if (!decorations) return;
    decorations.dim.dispose();
}