// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright 2025 Fire Under the Mountain
/**
 * For reference of zip file specification, see:
 * https://www.loc.gov/preservation/digital/formats/fdd/fdd000354.shtml
 */

/**
 * DOS format time is jank; for example, they only count seconds in intervals of 2.
 * @param d Probably current date.
 */
function date_to_dos_datetime(d: Date): [ number, number ] {
    const date = d.getFullYear() - 1980 << 9 | d.getMonth() + 1 << 5 | d.getDate();
    const time = d.getHours() << 11 | d.getMinutes() << 5 | Math.floor(d.getSeconds() / 2);

    return [ date, time ];

}
const encoder = new TextEncoder();
let crcTable!: number[];

export default class Zip {
    private blob: BlobPart[] = [];
    private files: {
        header: BlobPart[],
        offset: number,
        name: Uint8Array,
    }[] = [];
    private offset = 0;

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
        const nameBytes    = encoder.encode(name);
        const contentBytes = encoder.encode(content);
        const crc = this.crc32utf8(contentBytes);
        const [ date, time ] = date_to_dos_datetime(new Date());

        const file = {
            header: [
                Uint16Array.of(
                    0x0014,  // Version needed to extract,
                    0x0800,  // General purpose bit flag,
                    0x0000,  // Compression method,
                    time,  // Last mod file time,
                    date,  // Last mod file date,
                ),
                Uint32Array.of(
                    crc,                 // CRC32,
                    contentBytes.length, // Compressed size,
                    contentBytes.length, // Uncompressed size,
                ),
                Uint16Array.of(
                    nameBytes.length,    // File name length,
                    0x0000,              // Extra field length,
                ),
            ],
            offset: this.offset,
            name: nameBytes,
        };
        this.blob.push(Uint32Array.of(0x04034B50));
        this.blob.push(...file.header);
        this.blob.push(nameBytes, contentBytes);
        this.offset += nameBytes.length + contentBytes.length + 30;
        this.files.push(file);
    }

    build(): Blob {
        const start = this.offset;

        for(const file of this.files) {
            this.blob.push(
                Uint16Array.of(
                    0x4B50, 0x0201, // central file header signature
                    0x0014,         // Version made by
                )
            );
            this.blob.push(
                ...file.header      // See above.
            );
            this.blob.push(
                Uint16Array.of(
                    0,    // File comment length
                    0,    // Disk number start
                    0,    // Internal file attributes
                    0,    // External file attributes
                    0,    // External file attributes p2...
                ),
                Uint32Array.of(
                    file.offset,    // Relative offset of local header
                ),
                file.name,          // File name (variable size)
            );

            this.offset += file.name.length + 46;
        }

        this.blob.push(
            Uint16Array.of(
                0x4B50, 0x0605,     // End of central dir signature
                0,                  // Number of this disk
                0,                  // Number of the disk with the start of the central directory
                this.files.length,  // Total number of entries in the central directory on this disk
                this.files.length,  // Total number of entries in the central directory
            ),
            Uint32Array.of(
                this.offset - start,    // Size of the central directory
                start,                  // Offset of start of central directory with respect to the starting disk number
            ),
            Uint16Array.of(0)    // .zip file comment length
            // Omitted:          // .zip file comment (variable size)
        );

        return new Blob(this.blob);
    }
}
