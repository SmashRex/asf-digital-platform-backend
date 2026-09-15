import { AppError } from "../../errors/appError.js";
import type { mediaAssets } from "../../db/schema/mediaAssets.js";
import type { StoredMedia } from "./providers/mediaProvider.interface.js";
import { mediaProvider } from "./providers/index.js";
import * as repository from "./media.repository.js";

type MediaAsset = typeof mediaAssets.$inferSelect;

function toAssetResponse(asset: MediaAsset) {
  return {
    id: asset.id,
    url: asset.secureUrl,
    format: asset.format,
    mimeType: asset.mimeType,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    altText: asset.altText,
  };
}

export async function uploadAsset(
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  createdBy: string,
  altText?: string
) {
  const stored: StoredMedia = await mediaProvider.upload({
    buffer: file.buffer,
    filename: file.originalname,
    mimetype: file.mimetype,
  });

  return repository.createAsset({
    provider: stored.provider,
    publicId: stored.publicId,
    secureUrl: stored.secureUrl,
    resourceType: stored.resourceType,
    format: stored.format,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    bytes: stored.bytes || file.size,
    width: stored.width,
    height: stored.height,
    altText,
    createdBy,
  });
}

export async function getPlacement(key: string) {
  const result = await repository.findPlacementByKey(key);
  if (!result) throw AppError.notFound("Media placement not found", "MEDIA_PLACEMENT_NOT_FOUND");
  return { key: result.placement.key, asset: result.asset ? toAssetResponse(result.asset) : null };
}

export async function listPlacements(keys?: string[]) {
  const rows = await repository.listPlacements(keys);
  return rows.map(({ placement, asset }) => ({
    key: placement.key,
    asset: asset ? toAssetResponse(asset) : null,
  }));
}

export async function assignAsset(key: string, assetId: string, assignedBy: string, altText?: string) {
  const placement = await repository.findPlacementByKey(key);
  if (!placement) throw AppError.notFound("Media placement not found", "MEDIA_PLACEMENT_NOT_FOUND");

  const asset = await repository.findAssetById(assetId);
  if (!asset) throw AppError.notFound("Media asset not found", "MEDIA_ASSET_NOT_FOUND");

  if (altText !== undefined) await repository.updateAssetAltText(assetId, altText);
  await repository.assignAsset(key, assetId, assignedBy);
  return getPlacement(key);
}

export async function listAssets() {
  const assets = await repository.listAssets();
  return assets.map(toAssetResponse);
}

export async function deleteAsset(id: string) {
  const asset = await repository.findAssetById(id);
  if (!asset) throw AppError.notFound("Media asset not found", "MEDIA_ASSET_NOT_FOUND");

  const placement = await repository.findPlacementUsingAsset(id);
  if (placement) throw AppError.conflict("Media asset is assigned to a placement", "MEDIA_ASSET_IN_USE");

  await mediaProvider.delete(asset.publicId);
  await repository.deleteAsset(id);
}
