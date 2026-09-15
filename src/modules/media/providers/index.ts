import type { MediaProvider } from "./mediaProvider.interface.js";
import { cloudinaryMediaProvider } from "./cloudinaryMediaProvider.js";

export const mediaProvider: MediaProvider = cloudinaryMediaProvider;
