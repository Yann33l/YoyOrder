import { existsSync, readdirSync } from "fs";
import { fileURLToPath } from "url";

export const BANNER_PATH = "/banner-images";

export const DEFAULT_BANNER_IMAGE = "default-banner.webp";

export const getBannerImageFilename = ({ path }: { path: string }) =>
  path.replace(/.*\//, "").replace(/\.\w+$/, "") + ".webp";

export const checkBannerImageExists = ({
  bannerImageFileName,
}: {
  bannerImageFileName: string;
}) => {
  const bannersDirectory = fileURLToPath(new URL("../../public/banner-images/", import.meta.url));
  return existsSync(bannersDirectory) && readdirSync(bannersDirectory).includes(bannerImageFileName);
};
