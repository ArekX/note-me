import { insertTextIntoField, setFieldText } from "$frontend/deps.ts";
import { Signal } from "@preact/signals";
import { useHotkeys } from "$frontend/hooks/use-hotkeys.ts";
import {
    getImageMarkdown,
    getLinkMarkdown,
} from "$islands/notes/helpers/markdown.ts";

const listItemLineRegex = /^(\s*)(-|\*|\d+\.)\s/;

const tabIndent = "    ";

const linkStartRegex = /\s*(\w+:\/\/|\/file\/)/;

const determineLineStartEnd = (
    textValue: string,
    textArea: HTMLTextAreaElement,
) => {
    const cursorPosition = textArea.selectionStart;

    const lineStart = textValue.lastIndexOf("\n", cursorPosition - 1) +
        1;
    let lineEnd = textValue.indexOf("\n", cursorPosition);

    if (lineEnd === -1) {
        lineEnd = textValue.length;
    }

    return { lineStart, lineEnd };
};

const determineListLine = (
    textValue: string,
    textArea: HTMLTextAreaElement,
) => {
    const { lineStart, lineEnd } = determineLineStartEnd(textValue, textArea);

    const line = textValue.slice(lineStart, lineEnd);

    const result = line.match(listItemLineRegex);

    if (!result) {
        return null;
    }

    return {
        indent: result[1],
        listChar: result[2],
        lineStart,
        lineEnd,
        line,
    };
};

interface TextareaHookOptions {
    textAreaRef: React.RefObject<HTMLTextAreaElement>;
    lastCursorPosition: Signal<number>;
    text: Signal<string>;
}

export const useTextareaShortcuts = ({
    textAreaRef,
    lastCursorPosition,
    text,
}: TextareaHookOptions) => {
    const { resolveHotkey } = useHotkeys("noteTextArea");

    const handleInsertTab = (e: KeyboardEvent) => {
        if (!textAreaRef.current) {
            return;
        }

        const listLine = determineListLine(text.value, textAreaRef.current);

        if (listLine) {
            const { lineStart } = listLine;

            setFieldText(
                textAreaRef.current,
                text.value.slice(0, lineStart) + tabIndent +
                    text.value.slice(lineStart),
            );
            e.preventDefault();
            return;
        }

        insertTextIntoField(textAreaRef.current, tabIndent);
        e.preventDefault();
    };

    const handeListLineAutocomplete = (e: KeyboardEvent) => {
        if (!textAreaRef.current) {
            return;
        }

        const listLine = determineListLine(text.value, textAreaRef.current);

        if (!listLine) {
            return;
        }

        const { indent, listChar, line, lineStart } = listLine;

        if (line.trim() === listChar) {
            setFieldText(
                textAreaRef.current,
                text.value.slice(0, lineStart),
            );
            e.preventDefault();
            return;
        }

        if (listChar === "*" || listChar === "-") {
            insertTextIntoField(
                textAreaRef.current,
                `\n${indent}${listChar} `,
            );
            e.preventDefault();
            return;
        }

        const number = parseInt(listChar);

        if (Number.isFinite(number)) {
            insertTextIntoField(
                textAreaRef.current,
                `\n${indent}${number + 1}. `,
            );
            e.preventDefault();
            return;
        }
    };

    const handleBoldText = (selectedText: string) => {
        if (!textAreaRef.current) {
            return;
        }

        insertTextIntoField(textAreaRef.current, `**${selectedText}**`);
        textAreaRef.current.selectionStart -= 2;
        textAreaRef.current.selectionEnd -= 2;
    };

    const handleItalicText = (selectedText: string) => {
        if (!textAreaRef.current) {
            return;
        }

        insertTextIntoField(textAreaRef.current, `*${selectedText}*`);
        textAreaRef.current.selectionStart -= 1;
        textAreaRef.current.selectionEnd -= 1;
    };

    const handleInsertLink = (selectedText: string, selectionStart: number) => {
        if (!textAreaRef.current) {
            return;
        }

        if (!selectedText) {
            insertTextIntoField(
                textAreaRef.current,
                getLinkMarkdown("", ""),
            );
            return;
        }

        if (linkStartRegex.test(selectedText)) {
            const linkMarkdown = getLinkMarkdown(selectedText.trim(), "");
            insertTextIntoField(
                textAreaRef.current,
                linkMarkdown,
            );

            textAreaRef.current.selectionStart = selectionStart + 1;
            textAreaRef.current.selectionEnd =
                textAreaRef.current.selectionStart;
            return;
        }

        insertTextIntoField(
            textAreaRef.current,
            getLinkMarkdown("", selectedText),
        );

        textAreaRef.current.selectionStart = selectionStart +
            selectedText.length + 3;
        textAreaRef.current.selectionEnd = textAreaRef.current.selectionStart;
    };

    const handleInsertImage = (
        selectedText: string,
        selectionStart: number,
    ) => {
        if (!textAreaRef.current) {
            return;
        }

        if (!selectedText) {
            insertTextIntoField(
                textAreaRef.current,
                getImageMarkdown(selectedText, ""),
            );
            return;
        }

        if (linkStartRegex.test(selectedText)) {
            insertTextIntoField(
                textAreaRef.current,
                getImageMarkdown(selectedText.trim(), ""),
            );

            textAreaRef.current.selectionStart = selectionStart + 2;
            textAreaRef.current.selectionEnd =
                textAreaRef.current.selectionStart;

            return;
        }

        insertTextIntoField(
            textAreaRef.current,
            getImageMarkdown("", selectedText),
        );

        textAreaRef.current.selectionStart = selectionStart + 4 +
            selectedText.length;
        textAreaRef.current.selectionEnd = textAreaRef.current.selectionStart;
    };

    const handleIndentRight = () => {
        if (!textAreaRef.current) {
            return;
        }

        const { lineStart } = determineLineStartEnd(
            text.value,
            textAreaRef.current,
        );
        const previousStart = textAreaRef.current.selectionStart;
        const previousEnd = textAreaRef.current.selectionEnd;
        setFieldText(
            textAreaRef.current,
            text.value.slice(0, lineStart) + tabIndent +
                text.value.slice(lineStart),
        );

        textAreaRef.current.selectionStart = previousStart +
            tabIndent.length;
        textAreaRef.current.selectionEnd = previousEnd +
            tabIndent.length;
    };

    const handleIndentLeft = () => {
        if (!textAreaRef.current) {
            return;
        }

        const { lineStart, lineEnd } = determineLineStartEnd(
            text.value,
            textAreaRef.current,
        );

        let line = text.value.slice(lineStart, lineEnd);
        let tabIndentLeft = tabIndent.length;
        let indentAmount = 0;

        while (line[0] === " " && tabIndentLeft > 0) {
            line = line.slice(1);
            tabIndentLeft--;
            indentAmount++;
        }

        const previousStart = textAreaRef.current.selectionStart -
            indentAmount;
        const previousEnd = textAreaRef.current.selectionEnd -
            indentAmount;

        setFieldText(
            textAreaRef.current,
            text.value.slice(0, lineStart) + line +
                text.value.slice(lineEnd),
        );

        textAreaRef.current.selectionStart = previousStart;
        textAreaRef.current.selectionEnd = previousEnd;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!textAreaRef.current) {
            return;
        }

        lastCursorPosition.value = textAreaRef.current.selectionStart || 0;

        if (e.key === "Tab") {
            handleInsertTab(e);
        }

        if (e.key === "Enter") {
            handeListLineAutocomplete(e);
        }

        const hotkey = resolveHotkey(e);

        if (!hotkey) {
            return;
        }

        const selectionStart = textAreaRef.current.selectionStart;
        const selectionEnd = textAreaRef.current.selectionEnd;
        const selectedText = text.value.slice(selectionStart, selectionEnd);

        switch (hotkey) {
            case "boldText":
                handleBoldText(selectedText);
                break;
            case "italicText":
                handleItalicText(selectedText);
                break;
            case "insertLink":
                handleInsertLink(selectedText, selectionStart);
                break;
            case "insertImage":
                handleInsertImage(selectedText, selectionStart);
                break;
            case "insertHorizontalRule":
                insertTextIntoField(textAreaRef.current, "\n---\n");
                break;
            case "indentRight":
                handleIndentRight();
                break;
            case "indentLeft":
                handleIndentLeft();
                break;
        }
    };

    return {
        keyDownHandler: handleKeyDown,
    };
};
