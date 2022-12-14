import * as vscode from "vscode";
import { Manager } from "./shared-types";

export const state = new Set(["state", "useState", "updateState", "drawState"]); // TODO make this into a regex instaed
export const settings = new Set(["settings", "useSettings", "updateSettings"]);


const identifier = /[a-zA-Z]([a-zA-Z]|\d)*/g;
const objectDestructuring = /\{.*\}/g;
const destructuringFrom = (manager: Manager) => new RegExp(`((let)|(const)|(var))\\s*\\{([\\w\\s,])*\\}\\s*=\\s*(${manager})`, "g");

/**
 * Return the unique variables in use by the manager.
 */
export function destructuredVaraibles(manager: Manager, editor: vscode.TextEditor): Set<string> {
    const variables: Set<string> = new Set();

    const matches = editor.document.getText().matchAll(destructuringFrom(manager));
    for (const match of matches) {
        const destructuringSite = match[0].match(objectDestructuring);
        if (!destructuringSite) continue;

        const destucturedVariables = destructuringSite[0].matchAll(identifier);
        for (const variable of destucturedVariables) variables.add(variable[0]);
    }

    return variables;
}

/**
 * Return a RegExp or-ing the strings in strs, appending legal next tokens (like `foo.` or `foo;`).
 * Example: ["foo", "bar"] => /foo|bar/g
 */
function concatOrRegex(identifiers: Set<string>): RegExp | false {
    if (identifiers.size === 0) return false;

    const regex = Array.from(identifiers).map(s => `${s}(\\W|\\n){1}`).join("|"); // NOTE: This does not match an identifier followed by nothing/EOF. This can happen if the identifier is the last token in the file, but that case is farily unlikely in real world usage.
    return new RegExp(regex, "g");
}

/**
 * Return the ranges where identifiers occur in the current buffer.
 */
export function ranges(identifiers: Set<string>, editor: vscode.TextEditor): vscode.Range[] {
    const ranges: vscode.Range[] = [];
    const regex = concatOrRegex(identifiers);
    if (!regex) return ranges;

    const matches = editor.document.getText().matchAll(regex);
    for (const match of matches) {
        if (!match.index) continue;
        const start = editor.document.positionAt(match.index);
        const end = editor.document.positionAt(match.index + (match[0].length - 1 /* boundary */));
        ranges.push(new vscode.Range(start, end));
    }

    return ranges;
}

/**
 * Return a Range enveloping the entire document. 
 * TODO: Are there API methods for this? I could not find any, but that does not have to mean anything.
 * @param editor 
 * @returns vscode.Range
 */
export function entireText(editor: vscode.TextEditor): vscode.Range {
    const lines = editor.document.getText().split(/\n/g);
    const endLine = lines.length - 1;
    const endCharacter = lines[endLine].length - 1;

    return new vscode.Range(0, 0, endLine, endCharacter);
}
