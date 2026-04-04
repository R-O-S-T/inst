export { isUnlinkAddress, isEvmAddress } from '../types';

/**
 * Truncate an address to a short display form.
 * EVM:    0x1234...abcd
 * Unlink: unlink1...xyz
 */
export function formatAddress(addr: string): string {
  if (!addr) return '';

  if (addr.startsWith('0x') && addr.length > 10) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  if (addr.startsWith('unlink1') && addr.length > 14) {
    return `${addr.slice(0, 7)}...${addr.slice(-3)}`;
  }

  return addr;
}

/**
 * Convert a wei-denominated string to a human-readable decimal string.
 *
 * @param wei  - The value in wei (smallest unit), e.g. "1000000000000000000"
 * @param decimals - Number of decimal places in the token (default 18 for ETH)
 * @returns A trimmed decimal string, e.g. "1.0"
 */
export function formatBalance(wei: string, decimals = 18): string {
  if (!wei || wei === '0') return '0';

  const negative = wei.startsWith('-');
  const abs = negative ? wei.slice(1) : wei;

  // Pad the string so it is at least (decimals + 1) characters long
  const padded = abs.padStart(decimals + 1, '0');

  const intPart = padded.slice(0, padded.length - decimals) || '0';
  const fracPart = padded.slice(padded.length - decimals);

  // Trim trailing zeros but keep at least one decimal digit
  const trimmed = fracPart.replace(/0+$/, '') || '0';

  const result = `${intPart}.${trimmed}`;
  return negative ? `-${result}` : result;
}
