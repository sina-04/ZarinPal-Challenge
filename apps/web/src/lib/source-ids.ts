export const extractSourceIds = (text: string) =>
  [...text.matchAll(/\[([A-Za-z0-9_.:\-]+(?:--[A-Za-z0-9_.:\-]+)*)\]/g)].map(
    (match) => match[1],
  );
