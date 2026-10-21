import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { mockControl } from "@/test/mock-backend";
import { useSocketStore } from "@/stores/socket";
import { useToastStore } from "@/stores/toast";
import {
    UPLOAD_CHUNK_SIZE,
    useFileUploader,
    type FileUploader,
} from "./useFileUploader";

const mountUploader = () => {
    let uploader!: FileUploader;
    mount(
        defineComponent({
            setup() {
                uploader = useFileUploader();
                return () => null;
            },
        }),
    );
    return uploader;
};

// The mock log lists the newest message first.
const sentChunks = () =>
    [...mockControl.log]
        .reverse()
        .filter(
            (entry) =>
                entry.direction === "out" &&
                entry.message.type === "sendFileData",
        );

describe("useFileUploader", () => {
    beforeEach(async () => {
        mockControl.clearLog();
        await useSocketStore().connect();
    });

    afterEach(() => {
        useSocketStore().disconnect();
    });

    it("sends a file in 32 KB chunks and finishes it", async () => {
        const uploader = mountUploader();
        const size = UPLOAD_CHUNK_SIZE * 2 + 100;
        const file = new File([new Uint8Array(size)], "big.bin", {
            type: "application/octet-stream",
        });

        const [uploaded] = await uploader.uploadFiles([file]);

        expect(sentChunks().map((entry) => entry.binaryBytes)).toEqual([
            UPLOAD_CHUNK_SIZE,
            UPLOAD_CHUNK_SIZE,
            100,
        ]);
        expect(mockControl.state.files[0]).toMatchObject({
            identifier: uploaded!.identifier,
            name: "big.bin",
            size,
        });
        expect(uploader.isUploading.value).toBe(false);
    });

    it("reports a refused file and keeps going with the next", async () => {
        const uploader = mountUploader();
        const tooBig = new File(["x"], "huge.bin");
        Object.defineProperty(tooBig, "size", { value: 60_000_000 });
        const small = new File(["hello"], "small.txt", { type: "text/plain" });

        const uploaded = await uploader.uploadFiles([tooBig, small]);

        expect(uploaded.map((u) => u.file.name)).toEqual(["small.txt"]);
        expect(useToastStore().messages.at(0)?.text).toBe(
            "Failed to upload file 'huge.bin': File size is over the allowable limit.",
        );
    });
});
