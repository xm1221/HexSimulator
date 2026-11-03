import { HexDir, HexPattern } from "@hextools/renderer/staffGrid";

/**
 * Parse a HexBug "mask" (e.g. `-v-v`) into a pattern.
 *
 * A mask walks along a horizontal baseline: `-` continues straight, `v` moves
 * down one half-step. The first `v` starts on the lower row, so it begins
 * pointing SOUTH_EAST with an initial LEFT_BACK turn (`a`).
 */
export function maskToPattern(mask: string): HexPattern | null {
  const normalized = mask.toLowerCase().trim();
  if (normalized.length === 0 || /[^-v]/.test(normalized)) {
    return null;
  }

  let startDir: HexDir;
  let signature: string;
  if (normalized.startsWith("v")) {
    startDir = HexDir.SOUTH_EAST;
    signature = "a";
  } else {
    startDir = HexDir.EAST;
    signature = "";
  }

  for (let i = 1; i < normalized.length; i++) {
    const previous = normalized[i - 1];
    const current = normalized[i];
    if (previous === "-" && current === "-") {
      signature += "w";
    } else if (previous === "-" && current === "v") {
      signature += "ea";
    } else if (previous === "v" && current === "-") {
      signature += "e";
    } else if (previous === "v" && current === "v") {
      signature += "da";
    } else {
      return null;
    }
  }

  return HexPattern.fromSignature(startDir, signature);
}

export function isValidMask(mask: string): boolean {
  return /^[-v]+$/.test(mask.trim());
}
