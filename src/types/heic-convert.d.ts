declare module "heic-convert" {
  type ConvertOptions = {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  };

  function heicConvert(options: ConvertOptions): Promise<Buffer | Uint8Array>;
  export default heicConvert;
}
