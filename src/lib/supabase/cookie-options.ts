// Mantém a sessão viva por ~400 dias (máximo aceito pelos navegadores).
// Sem isto, o @supabase/ssr grava cookies de sessão que morrem ao fechar o
// navegador — o membro seria deslogado só por sair e voltar ao app.
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
