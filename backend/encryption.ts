import { decodeBase64, encodeBase64 } from "$backend/deps.ts";

const PBKDF2_ITERATIONS = 500000;

const deriveCipherKey = async (
    password: string | ArrayBuffer,
    salt: Uint8Array,
) => {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        typeof password === "string" ? encoder.encode(password) : password,
        "PBKDF2",
        false,
        ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        passwordKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["encrypt", "decrypt"],
    );
};

const combineIntoCipherData = (
    salt: Uint8Array,
    iv: Uint8Array,
    cipherText: Uint8Array,
): Uint8Array => {
    const combined = new Uint8Array(
        salt.length + iv.length + cipherText.length,
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(cipherText, salt.length + iv.length);
    return combined;
};

function extractFromCipherData(
    cipherData: Uint8Array,
): { salt: Uint8Array; iv: Uint8Array; encrypted: Uint8Array } {
    const saltLength = 16;
    const ivLength = 12;
    const encryptedLength = cipherData.length - saltLength - ivLength;

    const salt = cipherData.slice(0, saltLength);
    const iv = cipherData.slice(saltLength, saltLength + ivLength);
    const encrypted = cipherData.slice(
        saltLength + ivLength,
        saltLength + ivLength + encryptedLength,
    );

    return { salt, iv, encrypted };
}

const encryptBinary = async (
    data: Uint8Array | ArrayBuffer,
    password: string | ArrayBuffer,
): Promise<Uint8Array> => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveCipherKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        data,
    );

    return combineIntoCipherData(salt, iv, new Uint8Array(encrypted));
};

const decryptBinary = async (
    cipherData: Uint8Array,
    password: string | ArrayBuffer,
): Promise<ArrayBuffer> => {
    const { encrypted, iv, salt } = extractFromCipherData(cipherData);

    const key = await deriveCipherKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        encrypted,
    );

    return decrypted;
};
export const generateNoteEncryptionKey = async (
    password: string,
): Promise<string> => {
    const key = crypto.getRandomValues(new Uint8Array(64));

    const encryptedKey = await encryptBinary(key, password);

    return encodeBase64(encryptedKey);
};

export const reEncryptNoteKey = async (
    oldPassword: string,
    newPassword: string,
    noteKeyBase64: string,
): Promise<string> => {
    const key = await decryptBinary(decodeBase64(noteKeyBase64), oldPassword);
    const encryptedKey = await encryptBinary(key, newPassword);
    return encodeBase64(encryptedKey);
};

export const encryptNote = async (
    note: string,
    noteKeyBase64: string,
    password: string,
): Promise<string> => {
    const encryptionKey = await decryptBinary(
        decodeBase64(noteKeyBase64),
        password,
    );

    const encrypted = await encryptBinary(
        new TextEncoder().encode(note),
        encryptionKey,
    );
    return encodeBase64(encrypted);
};

export const decryptNote = async (
    encryptedNoteBase64: string,
    noteKeyBase64: string,
    password: string,
): Promise<string> => {
    const encryptionKey = await decryptBinary(
        decodeBase64(noteKeyBase64),
        password,
    );

    const decrypted = await decryptBinary(
        decodeBase64(encryptedNoteBase64),
        encryptionKey,
    );

    return new TextDecoder().decode(decrypted);
};
