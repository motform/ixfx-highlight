import * as vscode from "vscode";
import { Manager } from "./shared-types";

type Color = `#${string}`;

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
        dark: "#FFFFFF",
    },
    settings: {
        light: "#3498DB",
        dark: "#3498DB"
    },
};

/**
 * 
 */
function decorationTypeFor(manager: Manager, type: string): vscode.TextEditorDecorationType {
    const opacity = (type === "identifier") ? ["10", "12"] : ["10", "20"];
    const baseColor = defaultColors[manager];

    return vscode.window.createTextEditorDecorationType({
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "3px",
        // fontWeight: "bold",
        // overviewRulerColor: "blue",
        // overviewRulerLane: vscode.OverviewRulerLane.Right,

        // https://vshaxe.github.io/vscode-extern/vscode/ThemableDecorationAttachmentRenderOptions.html
        /* 	before: {
                contentIconPath: context.asAbsolutePath("/resources/clock-fill.svg"),
                margin: "4px"
            }, */
        light: {
            borderColor: `${baseColor.light}${opacity[1]}`,
            backgroundColor: `${baseColor.light}${opacity[0]}`
        },
        dark: {
            borderColor: `${baseColor.light}${opacity[1]}`,
            backgroundColor: `${baseColor.light}${opacity[0]}`
        },
    });
}

export function identifiersIn(ranges: vscode.Range[], manager: Manager, editor: vscode.TextEditor) {
    const decorations: vscode.DecorationOptions[] = [];
    ranges.forEach(range => decorations.push({ range: range, hoverMessage: `Originates from ${manager}.` }));
    editor.setDecorations(decorationTypeFor(manager, "identifier"), decorations);
}