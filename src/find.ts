import * as vscode from "vscode";
import { Manager } from "./shared-types";

export const state = ["state", "useState", "updateState"];
export const settings = ["settings", "useSettings", "updateSettings"];

const identifier = /[a-zA-Z]([a-zA-Z]|\d)*/g;
const objectDestructuring = /\{.*\}/g;


// TODO
const dotAccessFrom = (manager: Manager) => RegExp(`${manager}\.${identifier}`);
const destructuringFrom = (manager: Manager) => new RegExp(`((let)|(const)|(var))\\s*\\{([\\w\\s,])*\\}\\s*=\\s*(${manager})`, "g");

/**
 * Return the unique variables in use by the manager.
 */
export function variablesDestructuredFrom(manager: Manager, editor: vscode.TextEditor): Set<string> {
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
 * Return a RegExp or-ing the strings in strs.
 * Example: ["foo", "bar"] => /foo|bar/g
 */
function concatOrRegex(strs: Iterable<string>): RegExp {
    const re = Array.from(strs).map(s => `${s}(\\:|\\.|\\,|\\s|\\[|\\{|\\;|\\(){1}`).join("|");
    return new RegExp(re, "g");
}

/**
 * Return the ranges where identifiers occur in the current buffer.
 */
export function rangesMatching(identifiers: Iterable<string>, editor: vscode.TextEditor): vscode.Range[] {
    const ranges: vscode.Range[] = [];

    const matches = editor.document.getText().matchAll(concatOrRegex(identifiers));
    for (const match of matches) {
        if (!match.index) continue; // Don't think we can hit this, but the possibility of the property being undefined makes TS angry
        const start = editor.document.positionAt(match.index);
        const end = editor.document.positionAt(match.index + (match[0].length - 1)); // We subtract 1 to account for the extra space/comma/colon/dot
        ranges.push(new vscode.Range(start, end));
    }

    return ranges;
}
