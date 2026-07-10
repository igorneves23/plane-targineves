// Paleta categórica validada (ordem fixa = mecanismo de segurança pra
// daltonismo — não trocar a ordem). Ver skill de dataviz: cada slot foi
// escolhido pra maximizar a distância mínima entre vizinhos.
export const CATEGORICAL_PALETTE: { light: string; dark: string }[] = [
  { light: '#2a78d6', dark: '#3987e5' }, // azul
  { light: '#1baf7a', dark: '#199e70' }, // água
  { light: '#eda100', dark: '#c98500' }, // amarelo
  { light: '#008300', dark: '#008300' }, // verde
  { light: '#4a3aa7', dark: '#9085e9' }, // violeta
  { light: '#e34948', dark: '#e66767' }, // vermelho
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#eb6834', dark: '#d95926' }, // laranja
]

export function categoricalColor(index: number, theme: 'light' | 'dark'): string {
  const slot = CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]
  return theme === 'dark' ? slot.dark : slot.light
}
