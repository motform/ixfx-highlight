import * as vscode from "vscode";
import { Manager } from "./shared-types";

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
        dark: "#FF5733",
    },
    settings: {
        light: "#3498DB",
        dark: "#3498DB"
    },
};

/**
 * Return decoration appropriate for manager and type.
 */
function decorationTypeFor(identiferType: IdentiferType, manager: Manager,): vscode.TextEditorDecorationType {
    const opacity = (identiferType === "variable") ? ["10", "11"] : ["25", "26"];
    const baseColor = defaultColors[manager];
    console.log(manager, identiferType, baseColor);

    return vscode.window.createTextEditorDecorationType({
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "3px",
        overviewRulerColor: baseColor.light,
        overviewRulerLane: vscode.OverviewRulerLane.Right,

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

export function identifiersIn(ranges: vscode.Range[], identiferType: IdentiferType, manager: Manager, editor: vscode.TextEditor) {
    const decorations: vscode.DecorationOptions[] = [];
    ranges.forEach(range => decorations.push({ range: range, hoverMessage: `Originates from ${manager}.` }));
    editor.setDecorations(decorationTypeFor(identiferType, manager), decorations);
}