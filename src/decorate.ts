import * as vscode from "vscode";

type Color = `#${string}`;

interface ColorSet {
    light: Color;
    dark: Color;
}

const defaultColors: ColorSet = {
    light: "#FF5733",
    dark: "#FFFFFF"
};

/**
 * 
 */
function decorationTypeFor(manager: string, type: string): vscode.TextEditorDecorationType {
    const opacity = (type === "identifier") ? ["10", "12"] : ["10", "20"];
    const baseColor = defaultColors;

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

export function identifiersIn(ranges: vscode.Range[], manager: string, editor: vscode.TextEditor) {
    const decorations: vscode.DecorationOptions[] = [];
    ranges.forEach(range => decorations.push({ range: range, hoverMessage: `Originates from ${manager}.` }));
    editor.setDecorations(decorationTypeFor(manager, "identifier"), decorations);
}