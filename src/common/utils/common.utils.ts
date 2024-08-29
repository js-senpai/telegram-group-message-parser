export const delay = async (ms = 500) =>
  await new Promise((resolve) => setTimeout(resolve, ms));
