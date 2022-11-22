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
function decorationTypeFor(identiferType: IdentiferType, manager: Manager): vscode.TextEditorDecorationType {
    const opacity = (identiferType === "variable") ? ["10", "11"] : ["25", "26"];
    const baseColor = defaultColors[manager];

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

export function identifiersIn(ranges: vscode.Range[], decorationType: vscode.TextEditorDecorationType, manager: Manager, editor: vscode.TextEditor) {
    const decorations: vscode.DecorationOptions[] = [];
    ranges.forEach(range => decorations.push({ range: range, hoverMessage: `Originates from ${manager}.` }));
    editor.setDecorations(decorationType, decorations);
}

export function makeDecorationTypeManager(): DecorationTypeManager {
    return {
        settings: {
            manager: decorationTypeFor("manager", "settings"),
            variable: decorationTypeFor("variable", "settings")
        },
        state: {
            manager: decorationTypeFor("manager", "state"),
            variable: decorationTypeFor("variable", "state"),
        },
    };
}

export function remove(decorationTypeManager: DecorationTypeManager) {
    decorationTypeManager.settings.manager.dispose();
    decorationTypeManager.settings.variable.dispose();
    decorationTypeManager.state.manager.dispose();
    decorationTypeManager.state.variable.dispose();
}


/*
 * BUG: decorations overlap/keep geeting added
 * see: https://github.com/microsoft/vscode-extension-samples/issues/22
 * 
 * "Most issues I've seen in code that uses this API are around using the wrong instance of decType 
 * (i.e. creating new decoration types every time decorations would be updated instead of reusing the same instance)."
 */