const PBKDF2_ITERATIONS = 500000;

const deriveCipherKey = async (password: string, salt: Uint8Array) => {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
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

export const encryptText = async (
    text: string,
    password: string,
): Promise<Uint8Array> => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveCipherKey(password, salt);

    const encoder = new TextEncoder();
    const data = encoder.encode(text);

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

export const decryptText = async (
    cipherData: Uint8Array,
    password: string,
): Promise<string> => {
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

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
};
