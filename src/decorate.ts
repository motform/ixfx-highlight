import * as vscode from "vscode";
import { Manager, DecorationConfiguration, DecorationTypeManager, Color } from "./shared-types";

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
function decorationTypeFor(identiferType: IdentiferType, manager: Manager, decorationConfiguration: DecorationConfiguration): vscode.TextEditorDecorationType {
    const baseColor = decorationConfiguration[manager];
    const isVariable = identiferType === "variable";

    let opacity: [number, number];
    switch (decorationConfiguration.prominence) {
        case "Low": opacity = isVariable ? [10, 11] : [30, 31]; break;
        case "Medium": opacity = isVariable ? [20, 21] : [40, 41]; break;
        case "High": opacity = isVariable ? [30, 31] : [60, 61]; break;
    }

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

/**
 * Never before have I come so close to writing Enterprise Java.
 */
export function makeDecorationTypeManagerWith(decorationConfiguration: DecorationConfiguration): DecorationTypeManager {
    return {
        settings: {
            manager: decorationTypeFor("manager", "settings", decorationConfiguration),
            variable: decorationTypeFor("variable", "settings", decorationConfiguration),
        },
        state: {
            manager: decorationTypeFor("manager", "state", decorationConfiguration),
            variable: decorationTypeFor("variable", "state", decorationConfiguration),
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
