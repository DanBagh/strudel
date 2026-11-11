/*
 * Arch Btw
 * Modern terminal inspired theme
 * made by Jade
 */
import { tags as t } from '@lezer/highlight';
import { createTheme } from './theme-helper.mjs';

const hex = ['rgb(0, 0, 0)', 'rgb(82, 208, 250)', 'rgba(113, 208, 250, .4)', 'rgba(113, 208, 250, .15)', 'rgba(82, 208, 250, 0.3)'];

export const settings = {
  background: hex[0],
  lineBackground: 'transparent',
  foreground: hex[1],
  muted: hex[2],
  selection: hex[4],
  selectionMatch: hex[4],
  gutterBackground: hex[0],
  gutterForeground: hex[2],
  gutterBorder: 'transparent',
  lineHighlight: 'transparent',
};

export default createTheme({
  theme: 'dark',
  settings,
  styles: [
    {
      tag: [t.function(t.variableName), t.function(t.propertyName), t.url, t.processingInstruction],
      color: hex[1],
    },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: hex[1] },
    { tag: [t.comment, t.brace, t.bracket], color: hex[2] },
    { tag: [t.variableName, t.propertyName, t.labelName], color: hex[1] },
    { tag: [t.attributeName, t.number], color: hex[1] },
    { tag: t.keyword, color: hex[1] },
    { tag: [t.string, t.regexp, t.special(t.propertyName)], color: hex[1] },
  ],
});
