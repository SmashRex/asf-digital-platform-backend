export interface MediaUploadInput {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

export interface StoredMedia {
  provider: string;
  publicId: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

export interface MediaProvider {
  upload(input: MediaUploadInput): Promise<StoredMedia>;
  delete(publicId: string): Promise<void>;
}
