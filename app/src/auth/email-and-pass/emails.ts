import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({
  verificationLink,
}) => ({
  subject: "Confirmez votre adresse e-mail YoyOrder",
  text: `Ouvrez ce lien pour confirmer votre adresse e-mail : ${verificationLink}`,
  html: `
        <p>Ouvrez ce lien pour confirmer votre adresse e-mail YoyOrder.</p>
        <a href="${verificationLink}">Confirmer mon adresse e-mail</a>
    `,
});

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({
  passwordResetLink,
}) => ({
  subject: "Réinitialisation du mot de passe YoyOrder",
  text: `Ouvrez ce lien pour réinitialiser votre mot de passe : ${passwordResetLink}`,
  html: `
        <p>Ouvrez ce lien pour réinitialiser votre mot de passe YoyOrder.</p>
        <a href="${passwordResetLink}">Réinitialiser mon mot de passe</a>
    `,
});
