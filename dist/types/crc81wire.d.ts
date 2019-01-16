declare module 'crc/crc81wire' {
  export default function (buf: string | Buffer, previous?: number): number
}