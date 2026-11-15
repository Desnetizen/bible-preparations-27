/**
 * Brand palette for the loading and sign-in screens. These screens stay on the
 * same deep navy as the native splash (see app.json) in light and dark mode so
 * the logo animation always sits on the background it was designed for.
 */
export const Brand = {
  /** Must match the native splash `backgroundColor` in app.json. */
  background: '#040A1F',
  surface: '#0A1430',
  border: '#1E2D61',
  text: '#F3F6FF',
  textSecondary: '#9AA8D1',
  /** Orange from the logo. */
  accent: '#FFA400',
  onAccent: '#1A1000',
  /** Cyan from the logo. */
  info: '#3DB8FF',
  danger: '#FF8A8A',
} as const;
