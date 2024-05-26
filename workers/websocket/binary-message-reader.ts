export const readBinaryMessage = async (data: Blob) => {
    const buffer = await data.arrayBuffer();
    const view = new DataView(buffer);
    view.get
}