export const generateAntiCsrfToken = () => {
  return crypto.randomUUID();
};

