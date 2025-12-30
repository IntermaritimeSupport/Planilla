export interface CurrentPathname {
  name: string;
}

export const getPageNameFromPath = (
  pathname: string
): string => {
  return pathname.split("/")[2] || "";
};
