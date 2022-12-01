import * as vscode from "vscode";
import { Manager, DecorationTypeManager } from "./shared-types";

type Color = `#${string}`;

type IdentiferType = "variable" | "manager";

interface ColorSet {
    light: Color;
    dark: Color;
}

interface DefaultColors {
    state: ColorSet;
    settings: ColorSet
}

const defaultColors: DefaultColors = {
    state: {
        light: "#FF5733",
        dark: "#FF8166",
    },
    settings: {
        light: "#3498DB",
        dark: "#5FAEE3",
    },
};

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
function decorationTypeFor(identiferType: IdentiferType, manager: Manager): vscode.TextEditorDecorationType {
    const opacity = (identiferType === "variable") ? [10, 11] : [25, 26]; // TODO Make a bit more... robust.
    const baseColor = defaultColors[manager];

    return vscode.window.createTextEditorDecorationType({
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "3px",
        overviewRulerColor: baseColor.light,
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        light: {
            borderColor: hexColorWithOpacity(baseColor.light, opacity[1]),
            backgroundColor: hexColorWithOpacity(baseColor.light, opacity[0]),
        },
        dark: {
            borderColor: hexColorWithOpacity(baseColor.dark, opacity[1]),
            backgroundColor: hexColorWithOpacity(baseColor.dark, opacity[0]),
        },
    });
}

export function identifiersIn(ranges: vscode.Range[], decorationType: vscode.TextEditorDecorationType, manager: Manager, editor: vscode.TextEditor): void {
    if (ranges.length === 0) return;

    const decorations = ranges.map(range => ({ range: range, hoverMessage: `Originates from ${manager}.` }));
    editor.setDecorations(decorationType, decorations);
}

export function makeDecorationTypeManager(): DecorationTypeManager {
    return {
        settings: {
            manager: decorationTypeFor("manager", "settings"),
            variable: decorationTypeFor("variable", "settings"),
        },
        state: {
            manager: decorationTypeFor("manager", "state"),
            variable: decorationTypeFor("variable", "state"),
        },
    };
}

/**
 * Dispose of the decorationTypes. You cannot re-use disposed types with `editor.setDecorations`, you will have to define new ones.
 * These are hard coded as TS got mad about nested Object.entries().
 */
export function remove(decorationTypeManager: DecorationTypeManager): void {
    if (!decorationTypeManager) return;

    decorationTypeManager.settings.manager.dispose();
    decorationTypeManager.settings.variable.dispose();
    decorationTypeManager.state.manager.dispose();
    decorationTypeManager.state.variable.dispose();
}

function gray(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
        color: "gray",
    });
}

export function muteOtherColors() {

}
