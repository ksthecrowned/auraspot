// Better Auth returns English messages; show French ones by error code.
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou mot de passe incorrect.',
  INVALID_EMAIL: 'Adresse e-mail invalide.',
  INVALID_PASSWORD: 'Mot de passe incorrect.',
  USER_NOT_FOUND: 'Aucun compte avec cette adresse.',
  USER_ALREADY_EXISTS: 'Un compte existe déjà avec cette adresse.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'Un compte existe déjà avec cette adresse.',
  PASSWORD_TOO_SHORT: 'Mot de passe trop court (8 caractères minimum).',
  PASSWORD_TOO_LONG: 'Mot de passe trop long.',
  EMAIL_NOT_VERIFIED:
    'Confirmez d’abord votre adresse avec le lien reçu par e-mail.',
  INVALID_TOKEN: 'Ce lien n’est plus valide. Demandez-en un nouveau.',
};

export function authErrorMessage(error: { code?: string; status?: number }) {
  const message = error.code ? MESSAGES[error.code] : undefined;
  if (message) {
    return message;
  }
  if (error.status === 429) {
    return 'Trop de tentatives. Réessayez dans une minute.';
  }
  return 'Une erreur est survenue. Réessayez.';
}
