let crcTable!: number[];

export default class Zip {
    private blob: BlobPart[] = [];
    private files: {header: BlobPart[], offset: number, name: string}[] = [];
    private offset = 0;
    private encoder = new TextEncoder();

    constructor() {
        if(crcTable !== undefined!) return;
        crcTable = [];
        for(let c, n = 0; n < 256; n++) {
            c = n;
            for(let k = 0; k < 8; k++)
                c = ((c & 1) ? ((c >>> 1) ^ 0xEDB88320) : (c >>> 1)); //tslint:disable-line:strict-boolean-expressions
            crcTable[n] = c;
        }
    }

    crc32utf8(bytes: Uint8Array): number {
        let crc = -1;

        for (const byte of bytes)
            crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xFF];

        return (crc ^ -1) >>> 0;
    }

    addFile(name: string, content: string): void {
        const nameBytes    = this.encoder.encode(name);
        const contentBytes = this.encoder.encode(content);

        const crc = this.crc32utf8(contentBytes);

        const file = {
            header: [
                Uint16Array.of(0, 0, 0, 0, 0),
                Uint32Array.of(crc, contentBytes.length, contentBytes.length),
                Uint16Array.of(nameBytes.length, 0),
            ],
            offset: this.offset,
            name,
        };
        this.blob.push(Uint32Array.of(0x04034B50));
        this.blob.push(...file.header);
        this.blob.push(name, content);
        this.offset += nameBytes.length + contentBytes.length + 30;
        this.files.push(file);
    }

    build(): Blob {
        const start = this.offset;
        for(const file of this.files) {
            this.blob.push(Uint16Array.of(0x4B50, 0x0201, 0));
            this.blob.push(...file.header);
            this.blob.push(Uint16Array.of(0, 0, 0, 0, 0), Uint32Array.of(file.offset), file.name);
            this.offset += this.encoder.encode(file.name).length + 46;
        }
        this.blob.push(Uint16Array.of(0x4B50, 0x0605, 0, 0, this.files.length, this.files.length),
            Uint32Array.of(this.offset - start, start), Uint16Array.of(0));
        return new Blob(this.blob);
    }
}
